import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../../../src/core/auth/service';
import { Config } from '../../../../src/core/config/config';
import { ExecutionContext } from '../../../../src/core/context/execution';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { IDENTITY_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { AUTH_STORAGE_KEYS } from '../../../../src/core/auth/constants';

// Browser-mode platform mock — the end-session redirect is browser-only
vi.mock('../../../../src/utils/platform', () => ({
  isBrowser: true,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

describe('AuthService logout end-session (browser)', () => {
  const oauthConfig = {
    baseUrl: TEST_CONSTANTS.BASE_URL,
    orgName: TEST_CONSTANTS.ORGANIZATION_ID,
    tenantName: TEST_CONSTANTS.TENANT_ID,
    clientId: TEST_CONSTANTS.CLIENT_ID,
    redirectUri: TEST_CONSTANTS.REDIRECT_URI,
    scope: TEST_CONSTANTS.OAUTH_SCOPE
  };

  let sessionStore: Record<string, string>;
  let windowStub: { location: { href: string }; document: object };

  beforeEach(() => {
    sessionStore = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => sessionStore[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { sessionStore[key] = value; }),
      removeItem: vi.fn((key: string) => { delete sessionStore[key]; })
    });
    windowStub = { location: { href: '' }, document: {} };
    vi.stubGlobal('window', windowStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function createService(config: Config = oauthConfig) {
    return new AuthService(config, new ExecutionContext());
  }

  it('should clear stored OAuth context without navigating when called with no options', () => {
    sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT] = '{"codeVerifier":"v"}';
    sessionStore[AUTH_STORAGE_KEYS.CODE_VERIFIER] = 'v';
    const service = createService();

    service.logout();

    expect(sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT]).toBeUndefined();
    expect(sessionStore[AUTH_STORAGE_KEYS.CODE_VERIFIER]).toBeUndefined();
    expect(windowStub.location.href).toBe('');
  });

  it('should not navigate when endSession is false', () => {
    const service = createService();

    service.logout({ endSession: false });

    expect(windowStub.location.href).toBe('');
  });

  it('should redirect to the Identity end-session endpoint when endSession is true', () => {
    const service = createService();

    service.logout({ endSession: true });

    expect(windowStub.location.href.startsWith(TEST_CONSTANTS.BASE_URL)).toBe(true);
    expect(windowStub.location.href).toContain(IDENTITY_ENDPOINTS.END_SESSION);
    const params = new URL(windowStub.location.href).searchParams;
    expect(params.get('client_id')).toBe(TEST_CONSTANTS.CLIENT_ID);
    expect(params.has('post_logout_redirect_uri')).toBe(false);
  });

  it('should clear stored OAuth context before redirecting', () => {
    sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT] = '{"codeVerifier":"v"}';
    sessionStore[AUTH_STORAGE_KEYS.CODE_VERIFIER] = 'v';
    const service = createService();

    service.logout({ endSession: true });

    expect(sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT]).toBeUndefined();
    expect(sessionStore[AUTH_STORAGE_KEYS.CODE_VERIFIER]).toBeUndefined();
    expect(windowStub.location.href).toContain(IDENTITY_ENDPOINTS.END_SESSION);
  });

  it('should include post_logout_redirect_uri when provided', () => {
    const service = createService();
    const postLogoutRedirectUri = 'https://myapp.example.com/logged-out';

    service.logout({ endSession: true, postLogoutRedirectUri });

    const params = new URL(windowStub.location.href).searchParams;
    expect(params.get('post_logout_redirect_uri')).toBe(postLogoutRedirectUri);
  });

  it('should omit client_id when the config has none', () => {
    const service = createService({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID
    });

    service.logout({ endSession: true });

    expect(windowStub.location.href).toContain(IDENTITY_ENDPOINTS.END_SESSION);
    const params = new URL(windowStub.location.href).searchParams;
    expect(params.has('client_id')).toBe(false);
  });

  it('should send id_token_hint when an OIDC id_token is available', () => {
    const service = createService();
    service.updateToken({ token: 'access-token', type: 'oauth', idToken: TEST_CONSTANTS.ID_TOKEN });

    service.logout({ endSession: true });

    const params = new URL(windowStub.location.href).searchParams;
    expect(params.get('id_token_hint')).toBe(TEST_CONSTANTS.ID_TOKEN);
  });

  it('should omit id_token_hint when no id_token is available', () => {
    const service = createService();
    service.updateToken({ token: 'access-token', type: 'oauth' });

    service.logout({ endSession: true });

    const params = new URL(windowStub.location.href).searchParams;
    expect(params.has('id_token_hint')).toBe(false);
  });

  it('should capture the id_token before clearing it, then clear the stored token', () => {
    const service = createService();
    service.updateToken({ token: 'access-token', type: 'oauth', idToken: TEST_CONSTANTS.ID_TOKEN });

    service.logout({ endSession: true });

    // The hint reached the URL...
    expect(new URL(windowStub.location.href).searchParams.get('id_token_hint')).toBe(TEST_CONSTANTS.ID_TOKEN);
    // ...and the stored id_token was cleared as part of logout.
    expect(service.getTokenManager().getIdToken()).toBeUndefined();
  });
});
