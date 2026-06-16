// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TelemetryContext } from '@uipath/core-telemetry';
import { UiPath } from '../../../src/core/uipath';
import { UiPathConfig } from '../../../src/core/config/config';
import { ExecutionContext } from '../../../src/core/context/execution';
import { telemetryClient } from '../../../src/core/telemetry';
import { getConfig, getContext, getTokenManager, getPrivateSDK } from '../../utils/setup';
import { TEST_CONSTANTS } from '../../utils/constants/common';

// ===== MOCKING =====
const mockTokenManagerDestroy = vi.fn();
const mockTokenManager = {
  getToken: () => 'mock-access-token',
  hasValidToken: () => true,
  destroy: mockTokenManagerDestroy,
};

const mockLogout = vi.fn();
const mockSetMultiLogin = vi.fn();

vi.mock('../../../src/core/auth/service', () => {
  const AuthService: any = vi.fn().mockImplementation(() => ({
    getTokenManager: () => mockTokenManager,
    hasValidToken: () => true,
    getToken: () => 'mock-access-token',
    authenticateWithSecret: vi.fn(),
    authenticate: vi.fn().mockResolvedValue(true),
    setMultiLogin: mockSetMultiLogin,
    logout: mockLogout
  }));

  AuthService.isInOAuthCallback = vi.fn(() => false);
  AuthService.getStoredOAuthContext = vi.fn(() => null);
  AuthService._mergeConfigWithContext = vi.fn((config: any) => config);
  AuthService._clearStoredOAuthContext = vi.fn();

  return { AuthService };
});

vi.mock('../../../src/core/http/api-client');

// Mock meta-tag loading so the telemetry tests can drive the org/tenant ids
// the deployment injects. Defaults to no meta tags (matching server-side use).
const { mockLoadFromMetaTags } = vi.hoisted(() => ({ mockLoadFromMetaTags: vi.fn() }));
vi.mock('../../../src/core/config/runtime', () => ({
  loadFromMetaTags: mockLoadFromMetaTags,
}));

// Mock platform utilities so we can simulate host-embedded scenarios.
// Defaults to non-embedded (matching normal browser / server-side use).
const { mockPlatform } = vi.hoisted(() => ({
  mockPlatform: {
    isBrowser: false,
    isInActionCenter: false,
    isHostEmbedded: false,
    embeddingOrigin: null as string | null,
  },
}));
vi.mock('../../../src/utils/platform', () => mockPlatform);

// Mock host-token-request. getTrustedEmbeddingOrigin is computed from the mocked
// platform flags so tests keep driving the scenario via mockPlatform.
const { mockIsValidHostOrigin } = vi.hoisted(() => ({
  mockIsValidHostOrigin: vi.fn((origin: string) =>
    ['https://cloud.uipath.com', 'https://alpha.uipath.com', 'https://staging.uipath.com'].includes(origin)
  ),
}));
vi.mock('../../../src/core/auth/host-token-request', () => ({
  isValidHostOrigin: mockIsValidHostOrigin,
  get trustedEmbeddingOrigin() {
    return mockPlatform.isHostEmbedded && mockPlatform.embeddingOrigin && mockIsValidHostOrigin(mockPlatform.embeddingOrigin)
      ? mockPlatform.embeddingOrigin
      : null;
  },
}));

// ===== TEST SUITE =====
describe('UiPath Core', () => {
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

    it('should enable multi-login on OAuth config', () => {
      mockSetMultiLogin.mockClear();
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });

      sdk.setMultiLogin();

      expect(mockSetMultiLogin).toHaveBeenCalledOnce();
    });

    it('should allow multi-login before config is loaded', () => {
      mockSetMultiLogin.mockClear();
      const sdk = new UiPath();

      expect(() => sdk.setMultiLogin()).not.toThrow();
      expect(mockSetMultiLogin).not.toHaveBeenCalled();
    });

    it('should validate required config fields', async () => {
      const sdk = new UiPath({
        baseUrl: '',
        orgName: '',
        tenantName: '',
        secret: ''
      } as any);
      await expect(sdk.initialize()).rejects.toThrow();
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

  describe('Logout', () => {
    beforeEach(() => {
      mockLogout.mockClear();
    });

    it('should skip silently for secret-based auth', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      expect(sdk.isInitialized()).toBe(true);

      sdk.logout();

      expect(mockLogout).not.toHaveBeenCalled();
      expect(sdk.isInitialized()).toBe(true);
    });

    it('should work for OAuth-configured instances', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        clientId: TEST_CONSTANTS.CLIENT_ID,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'offline_access'
      });

      sdk.logout();

      expect(mockLogout).toHaveBeenCalledOnce();
      expect(sdk.isInitialized()).toBe(false);
    });
  });

  describe('destroy()', () => {
    beforeEach(() => {
      mockTokenManagerDestroy.mockClear();
    });

    it('should delegate to TokenManager.destroy()', () => {
      const sdk = new UiPath({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET,
      });

      sdk.destroy();

      expect(mockTokenManagerDestroy).toHaveBeenCalledOnce();
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

  describe('Host-Embedded Seeding', () => {
    // Mirror the isInActionCenter seeding pattern: when the app is embedded in a
    // UiPath host frame via the UIP protocol, the SDK must seed an empty token so
    // that getValidToken() can bootstrap via postMessage without attempting an
    // OAuth redirect.

    const PARENT_ORIGIN = 'https://cloud.uipath.com';

    const oauthConfig = {
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      clientId: TEST_CONSTANTS.CLIENT_ID,
      redirectUri: TEST_CONSTANTS.REDIRECT_URI,
      scope: 'offline_access',
    };

    afterEach(() => {
      // Reset platform to non-embedded state after each test so this block's
      // state never leaks into the next describe (per agent_docs/rules.md).
      mockPlatform.isBrowser = false;
      mockPlatform.isInActionCenter = false;
      mockPlatform.isHostEmbedded = false;
      mockPlatform.embeddingOrigin = null;
    });

    it('seeds a token and sets isInitialized() when host-embedded with a trusted embeddingOrigin', () => {
      mockPlatform.isHostEmbedded = true;
      mockPlatform.embeddingOrigin = PARENT_ORIGIN;

      const sdk = new UiPath(oauthConfig);

      // Token seeded → isAuthenticated() and isInitialized() are both true
      expect(sdk.isAuthenticated()).toBe(true);
      expect(sdk.isInitialized()).toBe(true);
    });

    it('does NOT redirect on initialize() when host-embedded — returns early because already initialized', async () => {
      mockPlatform.isHostEmbedded = true;
      mockPlatform.embeddingOrigin = PARENT_ORIGIN;

      const sdk = new UiPath(oauthConfig);
      // initialize() must resolve without throwing (no OAuth redirect attempted)
      await expect(sdk.initialize()).resolves.toBeUndefined();
      expect(sdk.isInitialized()).toBe(true);
    });

    it('does NOT seed when host-embedded but embeddingOrigin is not a trusted UiPath origin', () => {
      mockPlatform.isHostEmbedded = true;
      mockPlatform.embeddingOrigin = 'https://evil.example.com';

      const sdk = new UiPath(oauthConfig);

      // Not seeded → isInitialized() stays false (normal OAuth path)
      expect(sdk.isInitialized()).toBe(false);
    });

    it('does NOT seed when host-embedded but embeddingOrigin is null', () => {
      mockPlatform.isHostEmbedded = true;
      mockPlatform.embeddingOrigin = null;

      const sdk = new UiPath(oauthConfig);

      expect(sdk.isInitialized()).toBe(false);
    });

    it('does NOT seed a normal OAuth app that is not host-embedded (regression guard)', () => {
      // Neither isHostEmbedded nor isInActionCenter — default state
      mockPlatform.isHostEmbedded = false;
      mockPlatform.embeddingOrigin = null;

      const sdk = new UiPath(oauthConfig);

      expect(sdk.isInitialized()).toBe(false);
    });
  });

  describe('Telemetry', () => {
    let initializeSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      initializeSpy = vi.spyOn(telemetryClient, 'initialize').mockImplementation(() => {});
    });

    afterEach(() => {
      initializeSpy.mockRestore();
      mockLoadFromMetaTags.mockReset();
    });

    it('reports the meta-tag org/tenant values as orgId/tenantId and the merged config as orgName/tenantName', () => {
      mockLoadFromMetaTags.mockReturnValue({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: 'meta-org-id',
        tenantName: 'meta-tenant-id',
      });

      const sdk = new UiPath({ secret: TEST_CONSTANTS.CLIENT_SECRET });
      expect(sdk).toBeInstanceOf(UiPath);

      const context = initializeSpy.mock.calls[0][0] as TelemetryContext;
      expect(context.orgId).toBe('meta-org-id');
      expect(context.tenantId).toBe('meta-tenant-id');
      // No constructor override, so the merged config values match the meta tags.
      expect(context.orgName).toBe('meta-org-id');
      expect(context.tenantName).toBe('meta-tenant-id');
    });

    it('uses the meta-tag ids for orgId/tenantId and the constructor override for orgName/tenantName', () => {
      mockLoadFromMetaTags.mockReturnValue({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: 'meta-org-id',
        tenantName: 'meta-tenant-id',
      });

      const sdk = new UiPath({
        orgName: 'constructor-org-name',
        tenantName: 'constructor-tenant-name',
        secret: TEST_CONSTANTS.CLIENT_SECRET,
      });
      expect(sdk).toBeInstanceOf(UiPath);

      const context = initializeSpy.mock.calls[0][0] as TelemetryContext;
      expect(context.orgId).toBe('meta-org-id');
      expect(context.tenantId).toBe('meta-tenant-id');
      expect(context.orgName).toBe('constructor-org-name');
      expect(context.tenantName).toBe('constructor-tenant-name');
    });
  });
});
