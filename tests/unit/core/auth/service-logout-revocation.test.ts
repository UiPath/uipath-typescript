import { inspect } from 'node:util';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '@tests/utils/session-storage';
import { AuthService } from '@/core/auth/service';
import { AUTH_STORAGE_KEYS } from '@/core/auth/constants';
import type { Config } from '@/core/config/config';
import type { TokenInfo } from '@/core/auth/types';
import { ExecutionContext } from '@/core/context/execution';
import { IDENTITY_ENDPOINTS } from '@/utils/constants/endpoints';
import { AuthenticationError } from '@/core/errors';
import { TEST_CONSTANTS } from '@tests/utils/constants/common';

// Browser-mode platform mock: the OAuth session and the end-session redirect are browser-only
vi.mock('@/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

const REFRESH_TOKEN = 'refresh-token-to-revoke';
const RENEWED_REFRESH_TOKEN = 'refresh-token-from-renewal';
const REVOCATION_URL = `${TEST_CONSTANTS.BASE_URL}/${IDENTITY_ENDPOINTS.REVOCATION}`;
const TOKEN_STORAGE_KEY = `${AUTH_STORAGE_KEYS.TOKEN_PREFIX}${TEST_CONSTANTS.CLIENT_ID}`;

describe('AuthService logout refresh token revocation (browser)', () => {
  const oauthConfig: Config = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };

  let windowStub: { location: { href: string }; document: object };
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    memorySessionStorage.reset();
    windowStub = { location: { href: '' }, document: {} };
    vi.stubGlobal('window', windowStub);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** A signed-in service whose session carries a refresh token, unless `token` overrides it. */
  function createSignedInService(config: Config = oauthConfig, token: Partial<TokenInfo> = {}) {
    const service = new AuthService(config, new ExecutionContext());
    service.updateToken({
      token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
      type: 'oauth',
      refreshToken: REFRESH_TOKEN,
      idToken: TEST_CONSTANTS.ID_TOKEN,
      ...token,
    });
    return service;
  }

  function mockRevocationAccepted() {
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(null, { status: 200 }));
  }

  /** Everything the warnings carried, with the contents of errors and other objects spelled out. */
  function warnedText(): string {
    return warn.mock.calls.flat().map((part: unknown) => inspect(part, { depth: 5 })).join(' ');
  }

  /** The refresh tokens Identity was asked to revoke, in order. */
  function revokedTokens(fetchSpy: ReturnType<typeof mockRevocationAccepted>): Array<string | null> {
    return fetchSpy.mock.calls
      .filter(([url]) => url === REVOCATION_URL)
      .map(([, init]) => new URLSearchParams(String(init?.body)).get('token'));
  }

  it('should ask Identity to revoke the refresh token with the client id', () => {
    const fetchSpy = mockRevocationAccepted();
    const service = createSignedInService();

    service.logout();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    const body = new URLSearchParams(String(init?.body));
    expect(url).toBe(REVOCATION_URL);
    expect(init?.method).toBe('POST');
    expect(body.get('token')).toBe(REFRESH_TOKEN);
    expect(body.get('token_type_hint')).toBe('refresh_token');
    expect(body.get('client_id')).toBe(TEST_CONSTANTS.CLIENT_ID);
  });

  it('should send a request the browser needs no preflight for and can finish after the page is left', () => {
    const fetchSpy = mockRevocationAccepted();
    const service = createSignedInService();

    service.logout();

    const init = fetchSpy.mock.calls[0][1];
    // Only a form content type: any other header would make the browser preflight the request.
    expect(init?.headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(init?.keepalive).toBe(true);
  });

  it('should clear the session without waiting for the revocation', () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>(() => {}));
    const service = createSignedInService();

    service.logout();

    expect(service.hasValidToken()).toBe(false);
    expect(memorySessionStorage.entries.has(TOKEN_STORAGE_KEY)).toBe(false);
  });

  it('should not call Identity when the session has no refresh token', () => {
    const fetchSpy = mockRevocationAccepted();
    const service = createSignedInService(oauthConfig, { refreshToken: undefined });

    service.logout();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(service.hasValidToken()).toBe(false);
  });

  it('should not call Identity when no OAuth client is configured', () => {
    const fetchSpy = mockRevocationAccepted();
    const service = createSignedInService({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.CLIENT_SECRET,
    });

    service.logout();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should revoke only once when logout is called again', () => {
    const fetchSpy = mockRevocationAccepted();
    const service = createSignedInService();

    service.logout();
    service.logout();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should warn and still log out when the revocation request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError(TEST_CONSTANTS.ERROR_MESSAGE));
    const service = createSignedInService();

    expect(() => service.logout()).not.toThrow();

    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(service.hasValidToken()).toBe(false);
    expect(warnedText()).toContain(TEST_CONSTANTS.ERROR_MESSAGE);
    expect(warnedText()).not.toContain(REFRESH_TOKEN);
  });

  it('should warn with the status when Identity rejects the revocation', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_client' }), { status: 400, headers: { 'content-type': 'application/json' } })
    );
    const service = createSignedInService();

    service.logout();

    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(warnedText()).toContain('400');
    expect(warnedText()).not.toContain(REFRESH_TOKEN);
  });

  it('should not warn when Identity accepts the revocation', async () => {
    const fetchSpy = mockRevocationAccepted();
    const service = createSignedInService();

    service.logout();
    await fetchSpy.mock.results[0].value;
    await Promise.resolve();

    expect(warn).not.toHaveBeenCalled();
  });

  it('should keep the session ended and revoke the renewed token when logout comes during a renewal', async () => {
    let finishRenewal!: (response: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === REVOCATION_URL) return new Response(null, { status: 200 });
      return new Promise<Response>((resolve) => { finishRenewal = resolve; });
    });
    const service = createSignedInService(oauthConfig, { expiresAt: new Date(Date.now() - 1000) });
    // The renewal redeems the session's refresh token, which is spent from that moment on.
    const renewal = service.getTokenManager().getValidToken();

    service.logout();
    finishRenewal(new Response(JSON.stringify({
      access_token: TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600, refresh_token: RENEWED_REFRESH_TOKEN,
    })));

    await expect(renewal).rejects.toBeInstanceOf(AuthenticationError);
    expect(service.hasValidToken()).toBe(false);
    expect(memorySessionStorage.entries.has(TOKEN_STORAGE_KEY)).toBe(false);
    // The token the renewal returned is the live one, so it is revoked too.
    expect(revokedTokens(fetchSpy)).toEqual([REFRESH_TOKEN, RENEWED_REFRESH_TOKEN]);
  });

  it('should keep a new session that started while an earlier renewal was still in flight', async () => {
    let finishRenewal!: (response: Response) => void;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      if (url === REVOCATION_URL) return new Response(null, { status: 200 });
      return new Promise<Response>((resolve) => { finishRenewal = resolve; });
    });
    const service = createSignedInService(oauthConfig, { expiresAt: new Date(Date.now() - 1000) });
    const renewal = service.getTokenManager().getValidToken();

    service.logout();
    service.updateToken({ token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, type: 'oauth', refreshToken: 'refresh-token-of-new-session' });
    finishRenewal(new Response(JSON.stringify({
      access_token: TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600, refresh_token: RENEWED_REFRESH_TOKEN,
    })));

    await expect(renewal).rejects.toBeInstanceOf(AuthenticationError);
    expect(service.getToken()).toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
    expect(revokedTokens(fetchSpy)).toEqual([REFRESH_TOKEN, RENEWED_REFRESH_TOKEN]);
  });

  it('should request the revocation before redirecting to end the session', () => {
    let locationWhenRevoking: string | undefined;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      locationWhenRevoking = windowStub.location.href;
      return new Response(null, { status: 200 });
    });
    const service = createSignedInService();

    service.logout({ endSession: true });

    // The redirect unloads the page, so a request started after it would never be sent.
    expect(locationWhenRevoking).toBe('');
    expect(windowStub.location.href).toContain(IDENTITY_ENDPOINTS.END_SESSION);
  });
});
