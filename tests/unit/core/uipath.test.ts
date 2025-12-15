// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UiPath } from '../../../src/core/uipath';
import { UiPathConfig } from '../../../src/core/config/config';
import { ExecutionContext } from '../../../src/core/context/execution';
import { getConfig, getContext, getTokenManager, getPrivateSDK } from '../../utils/setup';
import { TEST_CONSTANTS } from '../../utils/constants/common';

// ===== MOCKING =====
const mockTokenManager = {
  getToken: () => 'mock-access-token',
  hasValidToken: () => true
};

vi.mock('../../../src/core/auth/service', () => {
  const AuthService: any = vi.fn().mockImplementation(() => ({
    getTokenManager: () => mockTokenManager,
    hasValidToken: () => true,
    getToken: () => 'mock-access-token',
    authenticateWithSecret: vi.fn(),
    authenticate: vi.fn().mockResolvedValue(true)
  }));

  AuthService.isInOAuthCallback = vi.fn(() => false);
  AuthService.getStoredOAuthContext = vi.fn(() => null);
  AuthService._mergeConfigWithContext = vi.fn((config: any) => config);

  return { AuthService };
});

vi.mock('../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('UiPath Core', () => {
  describe('Constructor', () => {
    it('should create instance with secret-based auth config', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      expect(uiPath).toBeInstanceOf(UiPath);
      expect(uiPath.isInitialized()).toBe(true); // Secret auth auto-initializes
    });

    it('should create instance with OAuth config', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });

      expect(uiPath).toBeInstanceOf(UiPath);
      expect(uiPath.isInitialized()).toBe(false); // OAuth requires initialize()
    });

    it('should validate required config fields', () => {
      expect(() => {
        new UiPath({
          baseUrl: '',
          orgName: '',
          tenantName: '',
          secret: ''
        } as any);
      }).toThrow();
    });

    it('should normalize baseUrl', () => {
      const uiPath = new UiPath({
        baseUrl: 'https://cloud.uipath.com/',
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(uiPath);
      expect(config.baseUrl).toBe('https://cloud.uipath.com');
    });
  });

  describe('Secret-based Authentication', () => {
    let uiPath: UiPath;

    beforeEach(() => {
      uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });
    });

    it('should auto-initialize with secret auth', () => {
      expect(uiPath.isInitialized()).toBe(true);
    });

    it('should return authenticated status', () => {
      expect(uiPath.isAuthenticated()).toBe(true);
    });

    it('should return immediately on initialize() call', async () => {
      await expect(uiPath.initialize()).resolves.toBeUndefined();
    });

    it('should provide access token', () => {
      const token = uiPath.getToken();
      expect(token).toBe('mock-access-token');
    });
  });

  describe('OAuth Authentication', () => {
    let uiPath: UiPath;

    beforeEach(() => {
      uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });
    });

    it('should not be initialized before initialize() is called', () => {
      expect(uiPath.isInitialized()).toBe(false);
    });

    it('should check if in OAuth callback', () => {
      const isInCallback = uiPath.isInOAuthCallback();
      expect(typeof isInCallback).toBe('boolean');
    });
  });

  describe('Configuration Access', () => {
    it('should expose config via symbol pattern', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(uiPath);

      expect(config).toBeDefined();
      expect(config.baseUrl).toBe(TEST_CONSTANTS.BASE_URL);
      expect(config.orgName).toBe(TEST_CONSTANTS.ORGANIZATION_ID);
      expect(config.tenantName).toBe(TEST_CONSTANTS.TENANT_ID);
    });

    it('should return UiPathConfig instance from symbol pattern', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(uiPath);

      expect(config).toBeInstanceOf(UiPathConfig);
    });
  });

  describe('Context Access', () => {
    it('should expose context via symbol pattern', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const context = getContext(uiPath);

      expect(context).toBeDefined();
      expect(context).toBeInstanceOf(ExecutionContext);
    });

    it('should provide consistent context across accesses', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const context1 = getContext(uiPath);
      const context2 = getContext(uiPath);

      expect(context1).toBe(context2);
    });
  });

  describe('Token Manager Access', () => {
    it('should expose tokenManager via symbol pattern', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const tokenManager = getTokenManager(uiPath);

      expect(tokenManager).toBeDefined();
      expect(tokenManager.getToken).toBeDefined();
      expect(tokenManager.hasValidToken).toBeDefined();
    });

    it('should provide consistent token manager across accesses', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const tokenManager1 = getTokenManager(uiPath);
      const tokenManager2 = getTokenManager(uiPath);

      expect(tokenManager1).toEqual(tokenManager2);
    });

    it('should use token manager for authentication', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const tokenManager = getTokenManager(uiPath);
      const token = uiPath.getToken();

      expect(tokenManager.getToken()).toBe(token);
    });
  });

  describe('Dependency Injection Pattern', () => {
    it('should provide all necessary components via symbol pattern for service injection', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      // Services access these via the __PRIVATE__ symbol
      const privateSDK = getPrivateSDK(uiPath);
      expect(privateSDK).toBeDefined();
      expect(privateSDK.config).toBeDefined();
      expect(privateSDK.context).toBeDefined();
      expect(privateSDK.tokenManager).toBeDefined();
    });

    it('should allow services to access configuration via symbol pattern', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const config = getConfig(uiPath);

      // Verify services can access organization details
      expect(config.orgName).toBe(TEST_CONSTANTS.ORGANIZATION_ID);
      expect(config.tenantName).toBe(TEST_CONSTANTS.TENANT_ID);
      expect(config.baseUrl).toBe(TEST_CONSTANTS.BASE_URL);
    });
  });

  describe('Authentication State', () => {
    it('should track authentication state', () => {
      const uiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      expect(uiPath.isAuthenticated()).toBe(true);
    });

    it('should track initialization state', () => {
      const secretUiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      const oauthUiPath = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });

      expect(secretUiPath.isInitialized()).toBe(true);
      expect(oauthUiPath.isInitialized()).toBe(false);
    });
  });

  describe('Multiple Instance Support', () => {
    it('should support creating multiple independent instances', () => {
      const uiPath1 = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: 'org1',
        tenantName: 'tenant1',
        secret: 'secret1'
      });

      const uiPath2 = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: 'org2',
        tenantName: 'tenant2',
        secret: 'secret2'
      });

      expect(getConfig(uiPath1).orgName).toBe('org1');
      expect(getConfig(uiPath2).orgName).toBe('org2');
      expect(getContext(uiPath1)).not.toBe(getContext(uiPath2));
    });
  });
});
