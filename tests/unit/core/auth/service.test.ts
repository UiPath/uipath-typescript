import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthService } from '../../../../src/core/auth/service';
import { ExecutionContext } from '../../../../src/core/context/execution';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { IDENTITY_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// Mock platform detection for Node test environment
vi.mock('../../../../src/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false,
  isHostEmbedded: false,
  embeddingOrigin: null,
}));

describe('AuthService', () => {
  const clientId = TEST_CONSTANTS.CLIENT_ID;
  const redirectUri = TEST_CONSTANTS.REDIRECT_URI;
  const codeChallenge = TEST_CONSTANTS.CODE_CHALLENGE;
  const scope = TEST_CONSTANTS.OAUTH_SCOPE;

  function createService(orgName: string, extra: Record<string, unknown> = {}) {
    const config = {
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      clientId,
      redirectUri,
      scope,
      ...extra
    };
    return new AuthService(config, new ExecutionContext());
  }

  describe('getAuthorizationUrl', () => {
    it('should build the correct authorize URL structure', () => {
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      expect(url.startsWith(TEST_CONSTANTS.BASE_URL)).toBe(true);
      expect(url).toContain('connect/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('offline_access');
    });

    it('should include all required OAuth params', () => {
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe(clientId);
      expect(params.get('redirect_uri')).toBe(redirectUri);
      expect(params.get('code_challenge')).toBe(codeChallenge);
      expect(params.get('code_challenge_method')).toBe('S256');
      expect(params.get('scope')).toContain(scope);
    });

    // acr_values is not sent by default: Identity resolves the org from client_id,
    // and sending it routes directly to the org's SAML IdP, blocking Basic Auth users.
    it('should not emit acr_values by default, regardless of orgName format', () => {
      for (const orgName of [
        TEST_CONSTANTS.ORGANIZATION_ID,
        TEST_CONSTANTS.GUID_ORG_ID,
        TEST_CONSTANTS.INVALID_GUID_ORG_ID,
      ]) {
        const service = createService(orgName);
        const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
        expect(new URL(url).searchParams.has('acr_values')).toBe(false);
        expect(url).not.toContain('acr_values');
      }
    });

    it('should emit acr_values with the org id when forceSso is enabled', () => {
      const service = createService(TEST_CONSTANTS.GUID_ORG_ID, { forceSso: true });
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      expect(new URL(url).searchParams.get('acr_values')).toBe(`tenant:${TEST_CONSTANTS.GUID_ORG_ID}`);
    });

    it('should ignore forceSso and warn when orgName is not an org id', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        for (const orgName of [ TEST_CONSTANTS.ORGANIZATION_ID, TEST_CONSTANTS.INVALID_GUID_ORG_ID ]) {
          const service = createService(orgName, { forceSso: true });
          const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
          expect(url).not.toContain('acr_values');
        }
        expect(warn).toHaveBeenCalledTimes(2);
      } finally {
        warn.mockRestore();
      }
    });

    it('should always request the openid scope automatically', () => {
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('scope')!.split(' ')).toContain('openid');
    });
  });

  describe('logout', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should not redirect to end-session outside the browser', () => {
      const windowStub = { location: { href: '' } };
      vi.stubGlobal('window', windowStub);
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      // With an ID token present, this exact state WOULD redirect in a
      // browser — only the non-browser environment prevents it here.
      service.updateToken({ token: 'access-token', type: 'oauth', idToken: TEST_CONSTANTS.ID_TOKEN });

      service.logout({ endSession: true });

      expect(windowStub.location.href).toBe('');
      // Local auth state is still cleared even though the redirect is skipped.
      expect(service.getToken()).toBeUndefined();
    });

    it('should clear authentication state without throwing when called with no options', () => {
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      expect(() => service.logout()).not.toThrow();
    });
  });

  describe('exchangeCode', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should exchange the code at the token endpoint (no orgName in path) and capture the id_token', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({
          access_token: 'token', token_type: 'Bearer', expires_in: 360, id_token: TEST_CONSTANTS.ID_TOKEN
        }))
      );
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      await (service as any)._getAccessToken({
        clientId,
        redirectUri,
        code: 'auth-code',
        codeVerifier: 'code-verifier'
      });
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(IDENTITY_ENDPOINTS.TOKEN);
      expect(calledUrl).not.toContain(TEST_CONSTANTS.ORGANIZATION_ID);
      expect(service.getTokenManager().getIdToken()).toBe(TEST_CONSTANTS.ID_TOKEN);
    });
  });
});
