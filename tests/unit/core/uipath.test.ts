// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UiPath } from '../../../src/core/uipath';
import { UiPathConfig } from '../../../src/core/config/config';
import { ExecutionContext } from '../../../src/core/context/execution';
import { getConfig, getContext, getTokenManager, getPrivateSDK } from '../../utils/setup';
import { TEST_CONSTANTS } from '../../utils/constants/common';

// ===== MOCKING =====
let mockAccessToken: string | undefined = 'mock-access-token';

const mockTokenManager = {
  getToken: () => mockAccessToken,
  hasValidToken: () => true
};

vi.mock('../../../src/core/auth/service', () => {
  const AuthService: any = vi.fn().mockImplementation(() => ({
    getTokenManager: () => mockTokenManager,
    hasValidToken: () => true,
    getToken: () => mockAccessToken,
    authenticateWithSecret: vi.fn(),
    authenticate: vi.fn().mockResolvedValue(true)
  }));

  AuthService.isInOAuthCallback = vi.fn(() => false);
  AuthService.getStoredOAuthContext = vi.fn(() => null);
  AuthService._mergeConfigWithContext = vi.fn((config: any) => config);

  return { AuthService };
});

vi.mock('../../../src/core/http/api-client');

const createJwt = (payload: Record<string, unknown>): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
};

const createSecretSdk = () => new UiPath({
  baseUrl: TEST_CONSTANTS.BASE_URL,
  orgName: TEST_CONSTANTS.ORGANIZATION_ID,
  tenantName: TEST_CONSTANTS.TENANT_ID,
  secret: TEST_CONSTANTS.CLIENT_SECRET
});

// ===== TEST SUITE =====
describe('UiPath Core', () => {
  beforeEach(() => {
    mockAccessToken = 'mock-access-token';
  });

  describe('Constructor', () => {
    it('should create instance with secret-based auth config', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      expect(sdk).toBeInstanceOf(UiPath);
      expect(sdk.isInitialized()).toBe(true); // Secret auth auto-initializes
    });

    it('should create instance with OAuth config', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });

      expect(sdk).toBeInstanceOf(UiPath);
      expect(sdk.isInitialized()).toBe(false); // OAuth requires initialize()
    });

    it('should validate required config fields', () => {
      expect(() => {
        // oxlint-disable-next-line no-new
        new UiPath({
          baseUrl: '',
          orgName: '',
          tenantName: '',
          secret: ''
        } as any);
      }).toThrow();
    });

    it('should normalize baseUrl', () => {
      const sdk = new UiPath({
        baseUrl: 'https://cloud.uipath.com/',
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(sdk);
      expect(config.baseUrl).toBe('https://cloud.uipath.com');
    });
  });

  describe('Secret-based Authentication', () => {
    let sdk: UiPath;

    beforeEach(() => {
      sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });
    });

    it('should auto-initialize with secret auth', () => {
      expect(sdk.isInitialized()).toBe(true);
    });

    it('should return authenticated status', () => {
      expect(sdk.isAuthenticated()).toBe(true);
    });

    it('should return immediately on initialize() call', async () => {
      await expect(sdk.initialize()).resolves.toBeUndefined();
    });

    it('should provide access token', () => {
      const token = sdk.getToken();
      expect(token).toBe('mock-access-token');
    });
  });

  describe('OAuth Authentication', () => {
    let sdk: UiPath;

    beforeEach(() => {
      sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });
    });

    it('should not be initialized before initialize() is called', () => {
      expect(sdk.isInitialized()).toBe(false);
    });

    it('should check if in OAuth callback', () => {
      const isInCallback = sdk.isInOAuthCallback();
      expect(typeof isInCallback).toBe('boolean');
    });
  });

  describe('Configuration Access', () => {
    it('should expose config via symbol pattern', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(sdk);

      expect(config).toBeDefined();
      expect(config.baseUrl).toBe(TEST_CONSTANTS.BASE_URL);
      expect(config.orgName).toBe(TEST_CONSTANTS.ORGANIZATION_ID);
      expect(config.tenantName).toBe(TEST_CONSTANTS.TENANT_ID);
    });

    it('should return UiPathConfig instance from symbol pattern', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(sdk);

      expect(config).toBeInstanceOf(UiPathConfig);
    });
  });

  describe('Context Access', () => {
    it('should expose context via symbol pattern', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const context = getContext(sdk);

      expect(context).toBeDefined();
      expect(context).toBeInstanceOf(ExecutionContext);
    });

    it('should provide consistent context across accesses', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const context1 = getContext(sdk);
      const context2 = getContext(sdk);

      expect(context1).toBe(context2);
    });
  });

  describe('Token Manager Access', () => {
    it('should expose tokenManager via symbol pattern', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const tokenManager = getTokenManager(sdk);

      expect(tokenManager).toBeDefined();
      expect(tokenManager.getToken).toBeDefined();
      expect(tokenManager.hasValidToken).toBeDefined();
    });

    it('should provide consistent token manager across accesses', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const tokenManager1 = getTokenManager(sdk);
      const tokenManager2 = getTokenManager(sdk);

      expect(tokenManager1).toEqual(tokenManager2);
    });

    it('should use token manager for authentication', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const tokenManager = getTokenManager(sdk);
      const token = sdk.getToken();

      expect(tokenManager.getToken()).toBe(token);
    });
  });

  describe('Dependency Injection Pattern', () => {
    it('should provide all necessary components via symbol pattern for service injection', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      // Services access these via the __PRIVATE__ symbol
      const privateSDK = getPrivateSDK(sdk);
      expect(privateSDK).toBeDefined();
      expect(privateSDK.config).toBeDefined();
      expect(privateSDK.context).toBeDefined();
      expect(privateSDK.tokenManager).toBeDefined();
    });

    it('should allow services to access configuration via symbol pattern', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(sdk);

      // Verify services can access organization details
      expect(config.orgName).toBe(TEST_CONSTANTS.ORGANIZATION_ID);
      expect(config.tenantName).toBe(TEST_CONSTANTS.TENANT_ID);
      expect(config.baseUrl).toBe(TEST_CONSTANTS.BASE_URL);
    });
  });

  describe('Authentication State', () => {
    it('should track authentication state', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      expect(sdk.isAuthenticated()).toBe(true);
    });

    it('should track initialization state', () => {
      const secretSdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const oauthSdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });

      expect(secretSdk.isInitialized()).toBe(true);
      expect(oauthSdk.isInitialized()).toBe(false);
    });
  });

  describe('Token Claims Helpers', () => {
    it('should return decoded token claims for valid JWT', () => {
      mockAccessToken = createJwt({
        sub: 'abc-123',
        preferred_username: 'jane.doe',
        email: 'jane.doe@uipath.com'
      });

      const sdk = createSecretSdk();

      const claims = sdk.getTokenClaims();

      expect(claims).toBeDefined();
      expect(claims?.sub).toBe('abc-123');
      expect(claims?.preferred_username).toBe('jane.doe');
      expect(claims?.email).toBe('jane.doe@uipath.com');
    });

    it('should return undefined claims when token is missing', () => {
      mockAccessToken = undefined;

      const sdk = createSecretSdk();

      expect(sdk.getTokenClaims()).toBeUndefined();
    });

    it.each([
      ['malformed token payload', 'a.b.c'],
      ['token with missing JWT signature segment', 'a.b'],
      ['token with empty JWT segment', 'a..c']
    ])('should return undefined claims for %s', (_description, malformedToken) => {
      mockAccessToken = malformedToken;

      const sdk = createSecretSdk();

      expect(sdk.getTokenClaims()).toBeUndefined();
    });

    it('should decode claims when Buffer is unavailable but atob is available', () => {
      mockAccessToken = createJwt({
        sub: 'browser-subject'
      });

      const originalBuffer = globalThis.Buffer;

      try {
        // Simulate browser-like runtime where Buffer is not present.
        (globalThis as any).Buffer = undefined;
        const sdk = createSecretSdk();
        expect(sdk.getTokenClaims()?.sub).toBe('browser-subject');
      } finally {
        (globalThis as any).Buffer = originalBuffer;
      }
    });

    it('should return normalized token identity with OIDC claim precedence', () => {
      mockAccessToken = createJwt({
        sub: 'oidc-subject',
        preferred_username: 'oidc.username',
        upn: 'fallback-upn',
        email: 'identity@uipath.com',
        name: 'OIDC Name',
        given_name: 'OIDC',
        family_name: 'User',
        tenant: 'tenant-fallback',
        org: 'org-fallback',
        tenantName: 'tenant-primary',
        orgName: 'org-primary'
      });

      const sdk = createSecretSdk();

      const identity = sdk.getTokenIdentity();

      expect(identity).toBeDefined();
      expect(identity?.userId).toBe('oidc-subject');
      expect(identity?.username).toBe('oidc.username');
      expect(identity?.email).toBe('identity@uipath.com');
      expect(identity?.name).toBe('OIDC Name');
      expect(identity?.givenName).toBe('OIDC');
      expect(identity?.familyName).toBe('User');
      expect(identity?.tenantName).toBe('tenant-primary');
      expect(identity?.orgName).toBe('org-primary');
      expect(identity?.rawClaims).toBeDefined();
    });

    it('should use alias fallback claims when OIDC claims are absent', () => {
      mockAccessToken = createJwt({
        user_id: 'alias-id',
        unique_name: 'alias-username',
        tenant: 'alias-tenant',
        org: 'alias-org'
      });

      const sdk = createSecretSdk();

      const identity = sdk.getTokenIdentity();

      expect(identity).toBeDefined();
      expect(identity?.userId).toBe('alias-id');
      expect(identity?.username).toBe('alias-username');
      expect(identity?.tenantName).toBe('alias-tenant');
      expect(identity?.orgName).toBe('alias-org');
    });

    it('should return undefined identity when token cannot be decoded', () => {
      mockAccessToken = 'not-a-jwt';

      const sdk = createSecretSdk();

      expect(sdk.getTokenIdentity()).toBeUndefined();
    });
  });

  describe('Multiple Instance Support', () => {
    it('should support creating multiple independent instances', () => {
      const sdk1 = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: 'org1',
        tenantName: 'tenant1',
        secret: 'secret1'
      });

      const sdk2 = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: 'org2',
        tenantName: 'tenant2',
        secret: 'secret2'
      });

      expect(getConfig(sdk1).orgName).toBe('org1');
      expect(getConfig(sdk2).orgName).toBe('org2');
      expect(getContext(sdk1)).not.toBe(getContext(sdk2));
    });
  });
});
