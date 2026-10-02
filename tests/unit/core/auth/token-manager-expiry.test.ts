import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '@/core/auth/token-manager';
import { ExecutionContext } from '@/core/context/execution';
import { AUTH_STORAGE_KEYS, TOKEN_EXPIRY_BUFFER_MS } from '@/core/auth/constants';
import { AuthenticationError } from '@/core/errors';
import type { Config } from '@/core/config/config';
import type { TokenInfo } from '@/core/auth/types';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';

// Plain browser environment (non-embedded, non-Action-Center) so the OAuth
// session-storage paths (loadFromStorage/setToken) are exercised too.
vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

const NOW = new Date('2026-01-01T00:00:00.000Z');
const WITHIN_BUFFER = new Date(NOW.getTime() + TOKEN_EXPIRY_BUFFER_MS / 2);
const BEYOND_BUFFER = new Date(NOW.getTime() + TOKEN_EXPIRY_BUFFER_MS * 2);
const PAST_EXPIRY = new Date(NOW.getTime() - 1000);

function makeInMemorySessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
  };
}

function makeOAuthManager() {
  const context = new ExecutionContext();
  const config: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };
  return new TokenManager(context, config, true);
}

function makeSecretManager() {
  const context = new ExecutionContext();
  const config: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    secret: TEST_CONSTANTS.CLIENT_SECRET,
  };
  return new TokenManager(context, config, false);
}

function mockRefreshResponse(accessToken: string) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({
      access_token: accessToken, token_type: 'Bearer', expires_in: 3600, refresh_token: 'refresh-2'
    }))
  );
}

describe('TokenManager — expiry buffer', () => {
  let sessionStorageMock: ReturnType<typeof makeInMemorySessionStorage>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    sessionStorageMock = makeInMemorySessionStorage();
    vi.stubGlobal('sessionStorage', sessionStorageMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('isTokenExpired', () => {
    it('returns false when tokenInfo is undefined', () => {
      const manager = makeOAuthManager();
      expect(manager.isTokenExpired(undefined)).toBe(false);
    });

    it('returns false when the token has no expiresAt', () => {
      const manager = makeOAuthManager();
      const token: TokenInfo = { token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth' };
      expect(manager.isTokenExpired(token)).toBe(false);
    });

    it('returns false for a token expiring beyond the buffer, with the buffer applied', () => {
      const manager = makeOAuthManager();
      const token: TokenInfo = { token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', expiresAt: BEYOND_BUFFER };
      expect(manager.isTokenExpired(token, TOKEN_EXPIRY_BUFFER_MS)).toBe(false);
    });

    it('returns true for a token expiring within the buffer, with the buffer applied', () => {
      const manager = makeOAuthManager();
      const token: TokenInfo = { token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', expiresAt: WITHIN_BUFFER };
      expect(manager.isTokenExpired(token, TOKEN_EXPIRY_BUFFER_MS)).toBe(true);
    });

    it('applies no buffer by default: a token expiring within the buffer is still valid', () => {
      const manager = makeOAuthManager();
      const token: TokenInfo = { token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', expiresAt: WITHIN_BUFFER };
      expect(manager.isTokenExpired(token)).toBe(false);
    });

    it('returns true at the exact expiry instant', () => {
      const manager = makeOAuthManager();
      const token: TokenInfo = { token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', expiresAt: NOW };
      expect(manager.isTokenExpired(token)).toBe(true);
    });

    it('returns true at the exact buffered-expiry instant', () => {
      const manager = makeOAuthManager();
      const token: TokenInfo = {
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
        type: 'oauth',
        expiresAt: new Date(NOW.getTime() + TOKEN_EXPIRY_BUFFER_MS),
      };
      expect(manager.isTokenExpired(token, TOKEN_EXPIRY_BUFFER_MS)).toBe(true);
    });

    it('returns true for a token past its expiry', () => {
      const manager = makeOAuthManager();
      const token: TokenInfo = { token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', expiresAt: PAST_EXPIRY };
      expect(manager.isTokenExpired(token)).toBe(true);
    });
  });

  describe('getValidToken', () => {
    it('returns the token unchanged when expiry is beyond the buffer', async () => {
      const manager = makeOAuthManager();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      manager.setToken({
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: BEYOND_BUFFER
      });

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('refreshes ahead of expiry when the token enters the buffer and a refresh token exists', async () => {
      const manager = makeOAuthManager();
      const fetchSpy = mockRefreshResponse(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);
      manager.setToken({
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: WITHIN_BUFFER
      });

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    it('uses the full remaining lifetime when no refresh token is available', async () => {
      const manager = makeOAuthManager();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      manager.setToken({
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', expiresAt: WITHIN_BUFFER
      });

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('uses the full remaining lifetime when the SDK config cannot refresh (no OAuth config)', async () => {
      const manager = makeSecretManager();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // A caller-supplied token (updateToken path): oauth-typed with a refresh
      // token, but the SDK holds no OAuth config to redeem it with.
      manager.setToken({
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: WITHIN_BUFFER
      });

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('refreshes a token that is past its actual expiry', async () => {
      const manager = makeOAuthManager();
      const fetchSpy = mockRefreshResponse(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);
      manager.setToken({
        token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: PAST_EXPIRY
      });

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);
      expect(fetchSpy).toHaveBeenCalledOnce();
    });

    it('rejects with AuthenticationError when an expired token has no refresh token', async () => {
      const manager = makeOAuthManager();
      manager.setToken({
        token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN, type: 'oauth', expiresAt: PAST_EXPIRY
      });

      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('returns secret tokens unchanged regardless of expiresAt', async () => {
      const manager = makeSecretManager();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      manager.setToken({ token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'secret', expiresAt: PAST_EXPIRY });

      await expect(manager.getValidToken()).resolves.toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('rejects with AuthenticationError when no token is set', async () => {
      const manager = makeOAuthManager();
      await expect(manager.getValidToken()).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('hasValidToken — validity is not narrowed by the buffer', () => {
    it('reports a token expiring within the buffer as still valid', () => {
      const manager = makeOAuthManager();
      manager.setToken({
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: WITHIN_BUFFER
      });

      expect(manager.hasValidToken()).toBe(true);
      expect(manager.getToken()).toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
    });
  });

  describe('loadFromStorage — stored tokens are not discarded by the buffer', () => {
    const storageKey = `${AUTH_STORAGE_KEYS.TOKEN_PREFIX}${TEST_CONSTANTS.CLIENT_ID}`;

    it('loads a stored token expiring within the buffer, keeping its refresh token usable', () => {
      sessionStorageMock.setItem(storageKey, JSON.stringify({
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: WITHIN_BUFFER
      }));

      const manager = makeOAuthManager();

      expect(manager.loadFromStorage()).toBe(true);
      expect(manager.hasValidToken()).toBe(true);
      expect(manager.getTokenInfo()?.refreshToken).toBe('refresh-1');
    });

    it('discards a stored token that is past its actual expiry', () => {
      sessionStorageMock.setItem(storageKey, JSON.stringify({
        token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-1', expiresAt: PAST_EXPIRY
      }));

      const manager = makeOAuthManager();

      expect(manager.loadFromStorage()).toBe(false);
      expect(manager.hasValidToken()).toBe(false);
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(storageKey);
    });
  });
});
