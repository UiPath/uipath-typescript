import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '@tests/utils/session-storage';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import { AUTH_STORAGE_KEYS, TOKEN_EXPIRY_BUFFER_MS } from '@/core/auth/constants';
import { AuthenticationError, NetworkError, RateLimitError, ServerError } from '@/core/errors';
import type { Config } from '@/core/config/config';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';

// Plain browser environment (non-embedded, non-Action-Center), so the session is also kept in session storage.
vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

const NOW = new Date('2026-01-01T00:00:00.000Z');
const WITHIN_BUFFER = new Date(NOW.getTime() + TOKEN_EXPIRY_BUFFER_MS / 2);
const PAST_EXPIRY = new Date(NOW.getTime() - 1000);
const REFRESH_TOKEN = 'refresh-1';
/** The pause after a failed renewal when Identity names no wait of its own. */
const DEFAULT_PAUSE_MS = 5_000;
const STORAGE_KEY = `${AUTH_STORAGE_KEYS.TOKEN_PREFIX}${TEST_CONSTANTS.CLIENT_ID}`;

function makeOAuthManager() {
  const config: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };
  return new TokenManager(new ExecutionContext(), config, true);
}

/** A manager holding a session whose access token expires at `expiresAt`. */
function makeSignedInManager(expiresAt: Date) {
  const manager = makeOAuthManager();
  manager.setToken({ token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN, type: 'oauth', refreshToken: REFRESH_TOKEN, expiresAt });
  return manager;
}

function oauthError(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json' } });
}

function refreshed(): Response {
  return new Response(JSON.stringify({
    access_token: TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600, refresh_token: 'refresh-2',
  }));
}

function advance(ms: number): void {
  vi.setSystemTime(new Date(Date.now() + ms));
}

function mockRefresh(...responses: Array<() => Response>) {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  responses.forEach((respond) => fetchSpy.mockImplementationOnce(async () => respond()));
  return fetchSpy;
}

function expectSessionKept(manager: TokenManager): void {
  expect(manager.getTokenInfo()?.refreshToken).toBe(REFRESH_TOKEN);
  expect(JSON.parse(memorySessionStorage.entries.get(STORAGE_KEY) ?? '{}').refreshToken).toBe(REFRESH_TOKEN);
}

function expectSessionEnded(manager: TokenManager): void {
  expect(manager.getTokenInfo()).toBeUndefined();
  expect(memorySessionStorage.entries.has(STORAGE_KEY)).toBe(false);
}

describe('TokenManager — refresh failures', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    memorySessionStorage.reset();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('when Identity rejects the refresh token', () => {
    it('ends the session and rejects with AuthenticationError', async () => {
      mockRefresh(() => oauthError(400, 'invalid_grant'));
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);

      expectSessionEnded(manager);
    });

    it('ends the session even while the access token is still valid', async () => {
      mockRefresh(() => oauthError(400, 'invalid_grant'));
      const manager = makeSignedInManager(WITHIN_BUFFER);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);

      expectSessionEnded(manager);
    });
  });

  describe('when the refresh fails for a temporary reason', () => {
    it.each([
      [429, RateLimitError],
      [500, ServerError],
      [503, ServerError],
    ])('keeps the session on HTTP %i and rejects with the matching error', async (status, errorClass) => {
      mockRefresh(() => new Response(JSON.stringify({ message: TEST_CONSTANTS.ERROR_MESSAGE }), {
        status, headers: { 'content-type': 'application/json' },
      }));
      const manager = makeSignedInManager(PAST_EXPIRY);

      const failure = await manager.getValidToken().catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(errorClass);
      expect((failure as RateLimitError | ServerError).statusCode).toBe(status);
      expectSessionKept(manager);
    });

    it('keeps the session when the error response is not JSON', async () => {
      mockRefresh(() => new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } }));
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);

      expectSessionKept(manager);
    });

    it('keeps the session when Identity cannot be reached', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(NetworkError);

      expectSessionKept(manager);
    });

    it('refreshes with the same refresh token on the next call', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'), refreshed);
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);
      advance(DEFAULT_PAUSE_MS);
      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const secondBody = new URLSearchParams(String(fetchSpy.mock.calls[1][1]?.body));
      expect(secondBody.get('refresh_token')).toBe(REFRESH_TOKEN);
      expect(manager.getTokenInfo()?.refreshToken).toBe('refresh-2');
    });
  });

  describe('when Identity rejects the request for another reason', () => {
    it.each(['invalid_client', 'unauthorized_client', 'invalid_request'])(
      'keeps the session on %s and rejects with AuthenticationError',
      async (error) => {
        mockRefresh(() => oauthError(400, error));
        const manager = makeSignedInManager(PAST_EXPIRY);

        const failure = await manager.getValidToken().catch((error: unknown) => error);

        // A 401 whatever Identity answered: a 400 or 403 here would be read as "no license" by the session license.
        expect(failure).toBeInstanceOf(AuthenticationError);
        expect((failure as AuthenticationError).statusCode).toBe(401);
        expectSessionKept(manager);
      }
    );

    it('keeps the session when invalid_grant comes with a status other than 400', async () => {
      mockRefresh(() => oauthError(503, 'invalid_grant'));
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);

      expectSessionKept(manager);
    });

    it('keeps the session when a 400 carries no OAuth error', async () => {
      mockRefresh(() => new Response(JSON.stringify(null), { status: 400, headers: { 'content-type': 'application/json' } }));
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);

      expectSessionKept(manager);
    });

    it('keeps the session when a gateway answers 403', async () => {
      mockRefresh(() => new Response('Forbidden', { status: 403 }));
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);

      expectSessionKept(manager);
    });
  });

  describe('when the renewal ahead of expiry fails', () => {
    it('serves the current token while it is still valid', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'));
      const manager = makeSignedInManager(WITHIN_BUFFER);

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expectSessionKept(manager);
    });

    it('serves the current token when Identity cannot be reached', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
      const manager = makeSignedInManager(WITHIN_BUFFER);

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN);
    });

    it('tries the renewal again once the pause is over', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'), refreshed);
      const manager = makeSignedInManager(WITHIN_BUFFER);

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN);
      advance(DEFAULT_PAUSE_MS);
      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('rejects once the current token has expired', async () => {
      mockRefresh(() => oauthError(503, 'temporarily_unavailable'), () => oauthError(503, 'temporarily_unavailable'));
      const manager = makeSignedInManager(WITHIN_BUFFER);

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN);
      vi.setSystemTime(new Date(WITHIN_BUFFER.getTime() + 1));

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);
      expectSessionKept(manager);
    });
  });

  describe('after a renewal failed without ending the session', () => {
    it('makes no further request until the pause is over', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'), refreshed);
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);
      advance(DEFAULT_PAUSE_MS - 1);
      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      advance(1);
      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('waits as long as Identity asks in Retry-After', async () => {
      const fetchSpy = mockRefresh(
        () => new Response(JSON.stringify({ message: TEST_CONSTANTS.ERROR_MESSAGE }), { status: 429, headers: { 'retry-after': '30' } }),
        refreshed
      );
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(RateLimitError);
      advance(29_999);
      await expect(manager.getValidToken()).rejects.toBeInstanceOf(RateLimitError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      advance(1);
      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);
    });

    it('waits a minute at most, however long Retry-After says', async () => {
      const fetchSpy = mockRefresh(
        () => new Response(JSON.stringify({ message: TEST_CONSTANTS.ERROR_MESSAGE }), { status: 503, headers: { 'retry-after': '3600' } }),
        refreshed
      );
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);
      advance(60_000);
      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('pauses after a network failure too', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
      const manager = makeSignedInManager(PAST_EXPIRY);

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(NetworkError);
      await expect(manager.getValidToken()).rejects.toBeInstanceOf(NetworkError);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('keeps serving the current token without asking again, and warns once', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'));
      const manager = makeSignedInManager(WITHIN_BUFFER);

      for (let call = 0; call < 5; call += 1) {
        await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN);
      }

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('does not hold back the renewal of a new session', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'), refreshed);
      const manager = makeSignedInManager(PAST_EXPIRY);
      await expect(manager.getValidToken()).rejects.toBeInstanceOf(ServerError);

      manager.setToken({ token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-of-new-session', expiresAt: PAST_EXPIRY });

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('when several requests need the token at once', () => {
    it('shares one failed renewal and gives every caller the same error', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'));
      const manager = makeSignedInManager(PAST_EXPIRY);

      const failures = await Promise.all(
        Array.from({ length: 5 }, () => manager.getValidToken().catch((error: unknown) => error))
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(failures.every((failure) => failure === failures[0])).toBe(true);
      expect(failures[0]).toBeInstanceOf(ServerError);
    });

    it('shares one failed early renewal and gives every caller the current token', async () => {
      const fetchSpy = mockRefresh(() => oauthError(503, 'temporarily_unavailable'));
      const manager = makeSignedInManager(WITHIN_BUFFER);

      const tokens = await Promise.all(Array.from({ length: 5 }, () => manager.getValidToken()));

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(tokens).toEqual(Array(5).fill(TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN));
    });
  });
});
