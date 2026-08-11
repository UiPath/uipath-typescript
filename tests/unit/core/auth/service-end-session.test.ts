import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthService } from '../../../../src/core/auth/service';
import { TokenManager } from '../../../../src/core/auth/token-manager';
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

  const POST_LOGOUT_REDIRECT_URI = 'https://myapp.example.com/logged-out';

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

  /** A service whose token carries an OIDC ID token (`openid` was granted). */
  function createServiceWithIdToken() {
    const service = createService();
    service.updateToken({ token: 'access-token', type: 'oauth', idToken: TEST_CONSTANTS.ID_TOKEN });
    return service;
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

  it('should not navigate when endCloudSession is false', () => {
    const service = createServiceWithIdToken();

    service.logout({ endCloudSession: false });

    expect(windowStub.location.href).toBe('');
  });

  it('should redirect to the Identity end-session endpoint with the id_token_hint', () => {
    const service = createServiceWithIdToken();

    service.logout({ endCloudSession: true });

    expect(windowStub.location.href.startsWith(TEST_CONSTANTS.BASE_URL)).toBe(true);
    expect(windowStub.location.href).toContain(IDENTITY_ENDPOINTS.END_SESSION);
    const params = new URL(windowStub.location.href).searchParams;
    expect(params.get('id_token_hint')).toBe(TEST_CONSTANTS.ID_TOKEN);
  });

  it('should never send client_id on the end-session request', () => {
    const service = createServiceWithIdToken();

    service.logout({ endCloudSession: true });

    // The ID token alone proves the request; a client_id alongside it could
    // only agree or mismatch, so it is never sent.
    const params = new URL(windowStub.location.href).searchParams;
    expect(params.has('client_id')).toBe(false);
  });

  it('should skip the cloud logout entirely when no ID token is available', () => {
    sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT] = '{"codeVerifier":"v"}';
    const service = createService();
    service.updateToken({ token: 'access-token', type: 'oauth' });

    service.logout({ endCloudSession: true });

    // Local state is cleared, but no end-session navigation happens —
    // endsession is unauthenticated and id_token_hint is what proves it.
    expect(sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT]).toBeUndefined();
    expect(windowStub.location.href).toBe('');
  });

  it('should clear stored OAuth context before redirecting', () => {
    sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT] = '{"codeVerifier":"v"}';
    sessionStore[AUTH_STORAGE_KEYS.CODE_VERIFIER] = 'v';
    const service = createServiceWithIdToken();

    service.logout({ endCloudSession: true });

    expect(sessionStore[AUTH_STORAGE_KEYS.OAUTH_CONTEXT]).toBeUndefined();
    expect(sessionStore[AUTH_STORAGE_KEYS.CODE_VERIFIER]).toBeUndefined();
    expect(windowStub.location.href).toContain(IDENTITY_ENDPOINTS.END_SESSION);
  });

  it('should default post_logout_redirect_uri to the configured redirectUri', () => {
    const service = createServiceWithIdToken();

    service.logout({ endCloudSession: true });

    const params = new URL(windowStub.location.href).searchParams;
    expect(params.get('post_logout_redirect_uri')).toBe(TEST_CONSTANTS.REDIRECT_URI);
  });

  it('should use an explicit postLogoutRedirectUri over the configured redirectUri', () => {
    const service = createServiceWithIdToken();

    service.logout({ endCloudSession: true, postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI });

    const params = new URL(windowStub.location.href).searchParams;
    expect(params.get('post_logout_redirect_uri')).toBe(POST_LOGOUT_REDIRECT_URI);
  });

  it('should preserve the id_token across a storage save/load round-trip', () => {
    // OAuth tokens persist to sessionStorage; a page reload restores them via
    // loadFromStorage — the id_token must survive it for cloud logout to work.
    const saved = new TokenManager(new ExecutionContext(), oauthConfig, true);
    saved.setToken({ token: 'access-token', type: 'oauth', idToken: TEST_CONSTANTS.ID_TOKEN });

    const restored = new TokenManager(new ExecutionContext(), oauthConfig, true);
    expect(restored.loadFromStorage()).toBe(true);
    expect(restored.getIdToken()).toBe(TEST_CONSTANTS.ID_TOKEN);
  });

  it('should capture the id_token before clearing it, then clear the stored token', () => {
    const service = createServiceWithIdToken();

    service.logout({ endCloudSession: true });

    // The hint reached the URL...
    expect(new URL(windowStub.location.href).searchParams.get('id_token_hint')).toBe(TEST_CONSTANTS.ID_TOKEN);
    // ...and the stored id_token was cleared as part of logout.
    expect(service.getTokenManager().getIdToken()).toBeUndefined();
  });

  describe('missing ID token warning', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('should warn that the cloud logout was skipped when no id_token is available', () => {
      const service = createService();

      service.logout({ endCloudSession: true });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Cloud logout skipped'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("'openid'"));
    });

    it('should not warn when an id_token is available', () => {
      const service = createServiceWithIdToken();

      service.logout({ endCloudSession: true, postLogoutRedirectUri: POST_LOGOUT_REDIRECT_URI });

      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('should not warn for a local-only logout', () => {
      const service = createService();

      service.logout();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
