import { describe, it, expect, vi, afterEach } from 'vitest';
import { AuthService } from '../../../../src/core/auth/service';
import { ExecutionContext } from '../../../../src/core/context/execution';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { IDENTITY_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// Mock platform detection for Node test environment
vi.mock('../../../../src/utils/platform', () => ({
  isBrowser: false,
  isInActionCenter: false
}));

describe('AuthService', () => {
  const clientId = TEST_CONSTANTS.CLIENT_ID;
  const redirectUri = TEST_CONSTANTS.REDIRECT_URI;
  const codeChallenge = TEST_CONSTANTS.CODE_CHALLENGE;
  const scope = TEST_CONSTANTS.OAUTH_SCOPE;

  function createService(orgName: string) {
    const config = {
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      clientId,
      redirectUri,
      scope
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

    it('should include all required OAuth params alongside acr_values', () => {
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe(clientId);
      expect(params.get('redirect_uri')).toBe(redirectUri);
      expect(params.get('code_challenge')).toBe(codeChallenge);
      expect(params.get('code_challenge_method')).toBe('S256');
      expect(params.get('scope')).toContain(scope);
      expect(params.get('acr_values')).toBe(`tenantName:${TEST_CONSTANTS.ORGANIZATION_ID}`);
    });

    it('should set acr_values with tenant: prefix when orgName is a GUID', () => {
      const service = createService(TEST_CONSTANTS.GUID_ORG_ID);
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('acr_values')).toBe(`tenant:${TEST_CONSTANTS.GUID_ORG_ID}`);
    });

    it('should set acr_values with tenantName: prefix when orgName is a human-readable name', () => {
      const service = createService(TEST_CONSTANTS.ORGANIZATION_ID);
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('acr_values')).toBe(`tenantName:${TEST_CONSTANTS.ORGANIZATION_ID}`);
    });

    it('should set acr_values with tenantName: prefix for a GUID-like string with wrong segment length', () => {
      const service = createService(TEST_CONSTANTS.INVALID_GUID_ORG_ID);
      const url = service.getAuthorizationUrl({ clientId, redirectUri, codeChallenge, scope });
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('acr_values')).toBe(`tenantName:${TEST_CONSTANTS.INVALID_GUID_ORG_ID}`);
    });
  });

  describe('exchangeCode', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should call the token endpoint without orgName in the path', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ access_token: 'token', token_type: 'Bearer', expires_in: 360 }))
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
    });
  });
});
