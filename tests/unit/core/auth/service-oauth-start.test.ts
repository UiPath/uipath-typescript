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

  function returnFromIdentity(search: string) {
    const replaceState = vi.fn();
    vi.stubGlobal('window', {
      location: { href: `${TEST_CONSTANTS.REDIRECT_URI}${search}`, search },
      history: { replaceState },
      document: {},
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

    expect(replaceState).toHaveBeenCalledWith({}, '', returnTo);
  });

  it('should restore a returnTo that differs from the callback page only by a trailing slash', async () => {
    const returnTo = `${TEST_CONSTANTS.REDIRECT_URI}/?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`;
    storeSignInState(returnTo);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith({}, '', returnTo);
  });

  it('should drop stale code and state from a restored returnTo', async () => {
    storeSignInState(`${TEST_CONSTANTS.REDIRECT_URI}?code=${AUTH_CODE}&state=${STATE}&jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith({}, '', `${TEST_CONSTANTS.REDIRECT_URI}?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`);
  });

  it('should ignore a same-origin returnTo on another path and only strip the callback parameters', async () => {
    storeSignInState(`${new URL(TEST_CONSTANTS.REDIRECT_URI).origin}/other?jobKey=${JOB_TEST_CONSTANTS.JOB_KEY}`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith({}, '', TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should ignore a cross-origin returnTo and only strip the callback parameters', async () => {
    storeSignInState(`${TEST_CONSTANTS.BASE_URL}/callback`);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}&state=${STATE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith({}, '', TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should warn and strip the callback parameters when returnTo is not a URL', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    storeSignInState(TEST_CONSTANTS.BASE_URL_NOT_A_URL);
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(warn).toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalledWith({}, '', TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should strip the callback parameters when the sign-in state predates returnTo', async () => {
    storeSignInState();
    const replaceState = returnFromIdentity(`?code=${AUTH_CODE}`);
    mockTokenExchange();
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await service.authenticate(oauthConfig);

    expect(replaceState).toHaveBeenCalledWith({}, '', TEST_CONSTANTS.REDIRECT_URI);
  });

});