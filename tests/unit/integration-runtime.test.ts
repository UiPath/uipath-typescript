/**
 * Integration tests - Runtime behavior verification
 * Tests actual usage scenarios with mocked HTTP calls
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch globally for browser-like environment
global.fetch = vi.fn();

describe('Runtime Integration Tests', () => {
  const mockConfig = {
    baseUrl: 'https://cloud.uipath.com',
    orgName: 'test-org',
    tenantName: 'test-tenant',
    secret: 'test-secret-key'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Legacy Pattern - Full Flow', () => {
    it('should work: import → create → authenticate → use service', async () => {
      // Step 1: Import
      const { UiPath } = await import('../../src/index');

      // Step 2: Create instance
      const uiPath = new UiPath(mockConfig);

      // Step 3: Verify authentication (auto for secret)
      expect(uiPath.isAuthenticated()).toBe(true);
      expect(uiPath.isInitialized()).toBe(true);
      expect(uiPath.getToken()).toBe('test-secret-key');

      // Step 4: Access service
      const entitiesService = uiPath.entities;
      expect(entitiesService).toBeDefined();

      // Step 5: Verify service has methods
      expect(typeof entitiesService.getAll).toBe('function');
      expect(typeof entitiesService.getById).toBe('function');
    });

    it('should share config across all services', async () => {
      const { UiPath } = await import('../../src/index');
      const uiPath = new UiPath(mockConfig);

      const config = uiPath.getConfig();

      expect(config.baseUrl).toBe(mockConfig.baseUrl);
      expect(config.orgName).toBe(mockConfig.orgName);
      expect(config.tenantName).toBe(mockConfig.tenantName);
    });

    it('should access nested services (maestro.processes)', async () => {
      const { UiPath } = await import('../../src/index');
      const uiPath = new UiPath(mockConfig);

      const maestro = uiPath.maestro;
      expect(maestro).toBeDefined();
      expect(maestro.processes).toBeDefined();
      expect(maestro.cases).toBeDefined();

      // Nested services should have methods
      expect(typeof maestro.processes.getAll).toBe('function');
      expect(typeof maestro.cases.getAll).toBe('function');
    });
  });

  describe('2. Modular Pattern - Full Flow', () => {
    it('should work: import → create → authenticate → instantiate service', async () => {
      // Step 1: Import from separate modules
      const { UiPath } = await import('../../src/core/index');
      const { Entities } = await import('../../src/services/data-fabric/index');

      // Step 2: Create core instance
      const uiPath = new UiPath(mockConfig);

      // Step 3: Verify authentication
      expect(uiPath.isAuthenticated()).toBe(true);
      expect(uiPath.isInitialized()).toBe(true);

      // Step 4: Instantiate service
      const entitiesService = new Entities(uiPath);

      // Step 5: Verify service is ready
      expect(entitiesService).toBeDefined();
      expect(typeof entitiesService.getAll).toBe('function');
      expect(typeof entitiesService.getById).toBe('function');
    });

    it('should create multiple service instances independently', async () => {
      const { UiPath } = await import('../../src/core/index');
      const { Entities } = await import('../../src/services/data-fabric/index');

      const uiPath = new UiPath(mockConfig);

      // Create two separate instances
      const entities1 = new Entities(uiPath);
      const entities2 = new Entities(uiPath);

      // They should be different objects
      expect(entities1).not.toBe(entities2);

      // But both should work
      expect(entities1.getAll).toBeDefined();
      expect(entities2.getAll).toBeDefined();
    });

    it('should allow using different core instances', async () => {
      const { UiPath } = await import('../../src/core/index');
      const { Entities } = await import('../../src/services/data-fabric/index');

      // Two different UiPath instances (different tenants)
      const uiPath1 = new UiPath({
        ...mockConfig,
        tenantName: 'tenant-1'
      });

      const uiPath2 = new UiPath({
        ...mockConfig,
        tenantName: 'tenant-2'
      });

      // Each can have its own service instance
      const entities1 = new Entities(uiPath1);
      const entities2 = new Entities(uiPath2);

      expect(entities1).not.toBe(entities2);
      expect(uiPath1.getConfig().tenantName).toBe('tenant-1');
      expect(uiPath2.getConfig().tenantName).toBe('tenant-2');
    });
  });

  describe('3. Pattern Comparison - Side by Side', () => {
    it('should produce equivalent results from both patterns', async () => {
      // Legacy pattern
      const { UiPath: LegacyUiPath } = await import('../../src/index');
      const legacyClient = new LegacyUiPath(mockConfig);
      const legacyEntities = legacyClient.entities;

      // Modular pattern
      const { UiPath: CoreUiPath } = await import('../../src/core/index');
      const { Entities } = await import('../../src/services/data-fabric/index');
      const coreClient = new CoreUiPath(mockConfig);
      const modularEntities = new Entities(coreClient);

      // Both should have same methods
      expect(typeof legacyEntities.getAll).toBe('function');
      expect(typeof modularEntities.getAll).toBe('function');

      // Both should be authenticated
      expect(legacyClient.isAuthenticated()).toBe(true);
      expect(coreClient.isAuthenticated()).toBe(true);
    });
  });

  describe('4. OAuth Configuration Detection', () => {
    it('should not auto-initialize with OAuth config', async () => {
      const { UiPath } = await import('../../src/core/index');

      const oauthConfig = {
        baseUrl: 'https://cloud.uipath.com',
        orgName: 'test-org',
        tenantName: 'test-tenant',
        clientId: 'test-client-id',
        redirectUri: 'http://localhost:3000/callback',
        scope: 'OR.Execution'
      };

      const uiPath = new UiPath(oauthConfig);

      // Should NOT be initialized yet (OAuth requires async flow)
      expect(uiPath.isInitialized()).toBe(false);

      // Should not have token yet
      expect(uiPath.getToken()).toBeUndefined();
    });

    it('should correctly identify secret vs OAuth config', async () => {
      const { UiPath } = await import('../../src/core/index');

      // Secret config
      const secretClient = new UiPath(mockConfig);
      expect(secretClient.isAuthenticated()).toBe(true);
      expect(secretClient.getToken()).toBeDefined();

      // OAuth config
      const oauthClient = new UiPath({
        baseUrl: 'https://cloud.uipath.com',
        orgName: 'test-org',
        tenantName: 'test-tenant',
        clientId: 'xxx',
        redirectUri: 'http://localhost:3000',
        scope: 'OR.Execution'
      });
      expect(oauthClient.isAuthenticated()).toBe(false);
      expect(oauthClient.getToken()).toBeUndefined();
    });
  });

  describe('5. Error Exports', () => {
    it('should export UiPathError from core', async () => {
      const { UiPathError } = await import('../../src/core/index');
      expect(UiPathError).toBeDefined();
      expect(typeof UiPathError).toBe('function');
    });

    it('should export UiPathError from entities', async () => {
      const { UiPathError } = await import('../../src/services/data-fabric/index');
      expect(UiPathError).toBeDefined();
      expect(typeof UiPathError).toBe('function');
    });
  });

  describe('6. Execution Context', () => {
    it('should allow setting custom context values', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      const context = uiPath.getContext();

      // Set custom values
      context.set('customKey', 'customValue');
      context.set('requestId', '12345');

      // Retrieve values
      expect(context.get('customKey')).toBe('customValue');
      expect(context.get('requestId')).toBe('12345');
    });

    it('should allow setting custom headers', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      const context = uiPath.getContext();

      context.setHeaders({
        'X-Custom-Header': 'custom-value',
        'X-Request-ID': 'abc-123'
      });

      const headers = context.getHeaders();
      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['X-Request-ID']).toBe('abc-123');
    });
  });

  describe('7. TokenManager Access', () => {
    it('should expose token manager from core instance', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      const tokenManager = uiPath.getTokenManager();

      expect(tokenManager).toBeDefined();
      expect(tokenManager.hasValidToken()).toBe(true);
      expect(tokenManager.getToken()).toBe('test-secret-key');
    });
  });

  describe('8. Config Normalization', () => {
    it('should normalize baseUrl without trailing slash', async () => {
      const { UiPath } = await import('../../src/core/index');

      const uiPath = new UiPath({
        ...mockConfig,
        baseUrl: 'https://cloud.uipath.com/'  // With trailing slash
      });

      const config = uiPath.getConfig();
      expect(config.baseUrl).toBe('https://cloud.uipath.com'); // Without slash
    });

    it('should handle baseUrl with path', async () => {
      const { UiPath } = await import('../../src/core/index');

      const uiPath = new UiPath({
        ...mockConfig,
        baseUrl: 'https://mycompany.com/uipath'
      });

      const config = uiPath.getConfig();
      expect(config.baseUrl).toBe('https://mycompany.com/uipath');
    });
  });
});
