import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '../../../utils/session-storage';
import { AuthService } from '../../../../src/core/auth/service';
import { ExecutionContext } from '../../../../src/core/context/execution';
import { AUTH_STORAGE_KEYS } from '../../../../src/core/auth/constants';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { JOB_TEST_CONSTANTS } from '../../../utils/constants/jobs';

vi.mock('../../../../src/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

describe('AuthService OAuth sign-in start (browser)', () => {
  const oauthConfig = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };

  let windowStub: { location: { href: string; search: string }; document: object };

  beforeEach(() => {
    memorySessionStorage.reset();
    windowStub = { location: { href: '', search: '' }, document: {} };
    vi.stubGlobal('window', windowStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should store the sign-in state and redirect to the authorization URL', async () => {
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    const context = JSON.parse(memorySessionStorage.entries.get(AUTH_STORAGE_KEYS.OAUTH_CONTEXT));
    expect(context.codeVerifier).toBeTruthy();
    expect(context.clientId).toBe(TEST_CONSTANTS.CLIENT_ID);
    expect(windowStub.location.href).toContain(TEST_CONSTANTS.CLIENT_ID);
  });

  it('should store the page URL as returnTo so the callback can restore its query string', async () => {
    const pageUrl = `${TEST_CONSTANTS.REDIRECT_URI}?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`;
    windowStub.location.href = pageUrl;
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    const context = JSON.parse(memorySessionStorage.entries.get(AUTH_STORAGE_KEYS.OAUTH_CONTEXT));
    expect(context.returnTo).toBe(pageUrl);
  });

  it('should not redirect when the sign-in state cannot be stored', async () => {
    memorySessionStorage.setItem.mockImplementationOnce(() => {
      throw new Error(TEST_CONSTANTS.ERROR_MESSAGE);
    });
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).rejects.toThrow('Could not store the OAuth sign-in state');

    expect(windowStub.location.href).toBe('');
  });
});

describe('AuthService OAuth callback (browser)', () => {
  const AUTH_CODE = 'auth-code';
  const STATE = 'state';
  const CODE_VERIFIER = 'code-verifier';
  const APP_ORIGIN = new URL(TEST_CONSTANTS.REDIRECT_URI).origin;
  // Everything Identity appends to the redirect URI on the way back from sign-in.
  const IDENTITY_RESPONSE_QUERY = new URLSearchParams({
    code: AUTH_CODE,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
    state: STATE,
    session_state: 'session-state',
    iss: `${TEST_CONSTANTS.BASE_URL}/identity_`,
  }).toString();
  const oauthConfig = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };

  function storeSignInState(returnTo?: string): void {
    memorySessionStorage.entries.set(
      AUTH_STORAGE_KEYS.OAUTH_CONTEXT,
      JSON.stringify({ ...oauthConfig, codeVerifier: CODE_VERIFIER, returnTo })
    );
  }

  /** Minimal stand-in for the browser's PopStateEvent, which Node does not have. */
  class PopStateEventStub extends Event {
    readonly state: unknown;
    constructor(type: string, init?: { state?: unknown }) {
      super(type);
      this.state = init?.state ?? null;
    }
  }

  let dispatchEvent: ReturnType<typeof vi.fn<(event: PopStateEventStub) => boolean>>;

  function returnFromIdentity(search: string, historyState: unknown = null) {
    const replaceState = vi.fn();
    dispatchEvent = vi.fn<(event: PopStateEventStub) => boolean>();
    vi.stubGlobal('window', {
      location: { href: `${TEST_CONSTANTS.REDIRECT_URI}${search}`, search },
      history: { replaceState, state: historyState },
      document: {},
      dispatchEvent,
      PopStateEvent: PopStateEventStub,
    });
    return replaceState;
  }

  function mockTokenExchange() {
    return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, token_type: 'Bearer', expires_in: 360 }))
    );
  }

  beforeEach(() => {
    memorySessionStorage.reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should detect a callback only when the sign-in state holds a code verifier', () => {
    returnFromIdentity(`?code=${AUTH_CODE}`);
    expect(AuthService.isInOAuthCallback()).toBe(false);

    storeSignInState();
    expect(AuthService.isInOAuthCallback()).toBe(true);
  });

  it('should exchange the code with the stored code verifier and clear the sign-in state', async () => {
    storeSignInState();
    returnFromIdentity(`?code=${AUTH_CODE}`);
    const fetchSpy = mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).resolves.toBe(true);

    const body = new URLSearchParams(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.get('code_verifier')).toBe(CODE_VERIFIER);
    expect(memorySessionStorage.entries.has(AUTH_STORAGE_KEYS.OAUTH_CONTEXT)).toBe(false);
  });

  it('should restore a returnTo on the callback page after the token exchange', async () => {
    const returnTo = `${TEST_CONSTANTS.REDIRECT_URI}?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`;
    storeSignInState(returnTo);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', returnTo);
  });

  it('should restore a returnTo that differs from the callback page only by a trailing slash', async () => {
    const returnTo = `${TEST_CONSTANTS.REDIRECT_URI}/?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`;
    storeSignInState(returnTo);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', returnTo);
  });

  it('should drop stale code and state from a restored returnTo', async () => {
    storeSignInState(`${TEST_CONSTANTS.REDIRECT_URI}?code=${AUTH_CODE}&state=${STATE}&jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', `${TEST_CONSTANTS.REDIRECT_URI}?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`);
  });

  it('should drop every parameter Identity returns with from a stale callback URL kept as returnTo', async () => {
    storeSignInState(`${TEST_CONSTANTS.REDIRECT_URI}?${IDENTITY_RESPONSE_QUERY}&jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', `${TEST_CONSTANTS.REDIRECT_URI}?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`);
  });

  it('should remove every parameter Identity returns with from the callback URL', async () => {
    storeSignInState();
    const replaceState = returnFromIdentity(`?${IDENTITY_RESPONSE_QUERY}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should restore a returnTo on another path of the app', async () => {
    const deepLink = `${APP_ORIGIN}/invoices/${JOB_TEST_CONSTANTS.JOB_KEY}`;
    storeSignInState(deepLink);
    const replaceState = returnFromIdentity(`?${IDENTITY_RESPONSE_QUERY}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', deepLink);
  });

  it('should restore a returnTo on another path exactly, with its own query string and hash', async () => {
    // The page's own parameters survive even when they are named like the ones Identity returns with.
    const deepLink = `${APP_ORIGIN}/invoices?state=open&code=${JOB_TEST_CONSTANTS.JOB_KEY}#details`;
    storeSignInState(deepLink);
    const replaceState = returnFromIdentity(`?${IDENTITY_RESPONSE_QUERY}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', deepLink);
  });

  it('should keep the history state the page already had', async () => {
    const routerState = { idx: 0 };
    storeSignInState(`${APP_ORIGIN}/invoices`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`, routerState);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState.mock.calls[0][0]).toBe(routerState);
  });

  it('should restore a returnTo on the callback page exactly, with query parameters named like the callback ones', async () => {
    // Not a leftover callback URL (no code), so nothing in it is Identity's to remove or re-encode.
    const returnTo = `${TEST_CONSTANTS.REDIRECT_URI}?scope=team&iss=7&session_state=open&state=draft&q=a%20b&flag`;
    storeSignInState(returnTo);
    const replaceState = returnFromIdentity(`?${IDENTITY_RESPONSE_QUERY}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', returnTo);
  });

  it('should take only the path, query and hash from a returnTo that carries credentials', async () => {
    const { host } = new URL(TEST_CONSTANTS.REDIRECT_URI);
    storeSignInState(`http://user:${TEST_CONSTANTS.CLIENT_SECRET}@${host}/invoices?tab=2#details`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', `${APP_ORIGIN}/invoices?tab=2#details`);
  });

  it('should still complete the sign-in when the address bar cannot be updated', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeSignInState(`${APP_ORIGIN}/invoices`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    replaceState.mockImplementation(() => { throw new Error(TEST_CONSTANTS.ERROR_MESSAGE); });
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).resolves.toBe(true);
    service.announceRestoredUrl();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  describe('announceRestoredUrl', () => {
    it('should not dispatch anything while the sign-in is being completed', async () => {
      storeSignInState(`${APP_ORIGIN}/invoices`);
      returnFromIdentity(`?code=${AUTH_CODE}`);
      mockTokenExchange();
      const service = new AuthService(oauthConfig, new ExecutionContext());

      await service.authenticate(oauthConfig);

      expect(dispatchEvent).not.toHaveBeenCalled();
    });

    it('should dispatch one popstate event after a completed sign-in, so a router re-reads the address bar', async () => {
      storeSignInState(`${APP_ORIGIN}/invoices`);
      const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`, { idx: 0 });
      mockTokenExchange();
      const service = new AuthService(oauthConfig, new ExecutionContext());
      await service.authenticate(oauthConfig);

      service.announceRestoredUrl();
      service.announceRestoredUrl();

      expect(dispatchEvent).toHaveBeenCalledTimes(1);
      const event = dispatchEvent.mock.calls[0][0];
      expect(event.type).toBe('popstate');
      // No state on the event: Vue Router then rebuilds its own bookkeeping for the restored URL.
      expect(event.state).toBeNull();
      expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(dispatchEvent.mock.invocationCallOrder[0]);
    });

    it('should not dispatch anything when no sign-in was completed', () => {
      returnFromIdentity('');
      const service = new AuthService(oauthConfig, new ExecutionContext());

      service.announceRestoredUrl();

      expect(dispatchEvent).not.toHaveBeenCalled();
    });

    it('should warn instead of throwing when the event cannot be dispatched', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      storeSignInState(`${APP_ORIGIN}/invoices`);
      returnFromIdentity(`?code=${AUTH_CODE}`);
      dispatchEvent.mockImplementation(() => { throw new Error(TEST_CONSTANTS.ERROR_MESSAGE); });
      mockTokenExchange();
      const service = new AuthService(oauthConfig, new ExecutionContext());
      await service.authenticate(oauthConfig);

      expect(() => service.announceRestoredUrl()).not.toThrow();
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });

  it.each([
    ['a protocol-relative URL', '//attacker.example/invoices'],
    ['a relative path', '/invoices'],
    ['a javascript: URL', 'javascript:void(0)'],
    ['a data: URL', 'data:text/html,invoices'],
    ['a blob: URL of this origin', `blob:${new URL(TEST_CONSTANTS.REDIRECT_URI).origin}/invoices`],
    ['on another scheme of the same host', TEST_CONSTANTS.REDIRECT_URI.replace('http:', 'https:')],
  ])('should ignore a returnTo that is %s and only strip the callback parameters', async (_kind, returnTo) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeSignInState(returnTo);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should ignore a cross-origin returnTo and only strip the callback parameters', async () => {
    storeSignInState(`${TEST_CONSTANTS.BASE_URL}/callback`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}&state=${STATE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should warn and strip the callback parameters when returnTo is not a URL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeSignInState(TEST_CONSTANTS.BASE_URL_NOT_A_URL);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(warn).toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith(null, '', TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should strip the callback parameters when the sign-in state predates returnTo', async () => {
    storeSignInState();
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith(null, '', TEST_CONSTANTS.REDIRECT_URI);
  });

});

describe('AuthService reload with an expired stored token (browser)', () => {
  const REFRESH_TOKEN = 'refresh-1';
  const ROTATED_REFRESH_TOKEN = 'refresh-2';
  const oauthConfig = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };
  const tokenKey = `${AUTH_STORAGE_KEYS.TOKEN_PREFIX}${TEST_CONSTANTS.CLIENT_ID}`;

  let windowStub: { location: { href: string; search: string }; document: object };

  function storeExpiredToken(refreshToken?: string): void {
    memorySessionStorage.entries.set(tokenKey, JSON.stringify({
      token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN,
      type: 'oauth',
      refreshToken,
      expiresAt: new Date(Date.now() - 1000),
    }));
  }

  beforeEach(() => {
    memorySessionStorage.reset();
    windowStub = { location: { href: '', search: '' }, document: {} };
    vi.stubGlobal('window', windowStub);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should refresh the token instead of redirecting to sign-in', async () => {
    storeExpiredToken(REFRESH_TOKEN);
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        access_token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, token_type: 'Bearer', expires_in: 3600, refresh_token: ROTATED_REFRESH_TOKEN
      }))
    );
    const service = new AuthService(oauthConfig, new ExecutionContext());

    expect(service.hasValidToken()).toBe(false);
    await expect(service.authenticate(oauthConfig)).resolves.toBe(true);

    expect(String(fetchSpy.mock.calls[0][1]?.body)).toContain(`refresh_token=${REFRESH_TOKEN}`);
    expect(service.getToken()).toBe(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);
    expect(JSON.parse(memorySessionStorage.entries.get(tokenKey) ?? '{}').refreshToken).toBe(ROTATED_REFRESH_TOKEN);
    expect(windowStub.location.href).toBe('');
  });

  it('should redirect to sign-in when the refresh token is rejected', async () => {
    storeExpiredToken(REFRESH_TOKEN);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400, headers: { 'content-type': 'application/json' } })
    );
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).resolves.toBe(false);

    expect(memorySessionStorage.entries.has(tokenKey)).toBe(false);
    expect(windowStub.location.href).toContain(TEST_CONSTANTS.CLIENT_ID);
  });

  it('should redirect to sign-in when the refresh request fails', async () => {
    storeExpiredToken(REFRESH_TOKEN);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).resolves.toBe(false);

    expect(windowStub.location.href).toContain(TEST_CONSTANTS.CLIENT_ID);
  });

  it('should redirect to sign-in without a refresh request when there is no refresh token', async () => {
    storeExpiredToken();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).resolves.toBe(false);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(memorySessionStorage.entries.has(tokenKey)).toBe(false);
    expect(windowStub.location.href).toContain(TEST_CONSTANTS.CLIENT_ID);
  });
});
