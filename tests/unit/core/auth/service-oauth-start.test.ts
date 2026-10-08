import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { memorySessionStorage } from '../../../utils/session-storage';
import { AuthService } from '../../../../src/core/auth/service';
import { ExecutionContext } from '../../../../src/core/context/execution';
import { AUTH_STORAGE_KEYS } from '../../../../src/core/auth/constants';
import { TEST_CONSTANTS } from '../../../utils/constants/common';

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
  const CODE_VERIFIER = 'code-verifier';
  const oauthConfig = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE,
  };

  function storeSignInState(): void {
    memorySessionStorage.entries.set(
      AUTH_STORAGE_KEYS.OAUTH_CONTEXT,
      JSON.stringify({ ...oauthConfig, codeVerifier: CODE_VERIFIER })
    );
  }

  function returnFromIdentity(search: string): void {
    vi.stubGlobal('window', {
      location: { href: `${TEST_CONSTANTS.REDIRECT_URI}${search}`, search },
      history: { replaceState: vi.fn() },
      document: {},
    });
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
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, token_type: 'Bearer', expires_in: 360 }))
    );
    const service = new AuthService(oauthConfig, new ExecutionContext());

    await expect(service.authenticate(oauthConfig)).resolves.toBe(true);

    const body = new URLSearchParams(fetchSpy.mock.calls[0][1]?.body as string);
    expect(body.get('code_verifier')).toBe(CODE_VERIFIER);
    expect(memorySessionStorage.entries.has(AUTH_STORAGE_KEYS.OAUTH_CONTEXT)).toBe(false);
  });

});