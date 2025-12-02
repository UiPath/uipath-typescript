/**
 * Comprehensive verification tests for Legacy and Modular patterns
 * Tests both backward compatibility and new modular architecture
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Pattern Verification Tests', () => {
  const mockConfig = {
    baseUrl: 'https://cloud.uipath.com',
    orgName: 'test-org',
    tenantName: 'test-tenant',
    secret: 'test-secret-key'
  };

  describe('1. Legacy Pattern - Backward Compatibility', () => {
    it('should import UiPath from main package', async () => {
      const { UiPath } = await import('../../src/index');
      expect(UiPath).toBeDefined();
      expect(typeof UiPath).toBe('function');
    });

    it('should create UiPath instance with secret auth', async () => {
      const { UiPath } = await import('../../src/index');
      const uiPath = new UiPath(mockConfig);

      expect(uiPath).toBeDefined();
      expect(uiPath.isInitialized()).toBe(true); // Auto-initialized for secret
      expect(uiPath.isAuthenticated()).toBe(true);
    });

    it('should access services via property getters', async () => {
      const { UiPath } = await import('../../src/index');
      const uiPath = new UiPath(mockConfig);

      // Check that service getters exist
      expect(uiPath.entities).toBeDefined();
      expect(uiPath.tasks).toBeDefined();
      expect(uiPath.processes).toBeDefined();
      expect(uiPath.maestro).toBeDefined();
      expect(uiPath.buckets).toBeDefined();
      expect(uiPath.queues).toBeDefined();
      expect(uiPath.assets).toBeDefined();
    });

    it('should return same service instance on multiple accesses (caching)', async () => {
      const { UiPath } = await import('../../src/index');
      const uiPath = new UiPath(mockConfig);

      const entities1 = uiPath.entities;
      const entities2 = uiPath.entities;

      expect(entities1).toBe(entities2); // Same instance
    });

    it('should have all core methods available', async () => {
      const { UiPath } = await import('../../src/index');
      const uiPath = new UiPath(mockConfig);

      // Core methods from UiPathCore
      expect(typeof uiPath.initialize).toBe('function');
      expect(typeof uiPath.isInitialized).toBe('function');
      expect(typeof uiPath.isAuthenticated).toBe('function');
      expect(typeof uiPath.getToken).toBe('function');
      expect(typeof uiPath.getConfig).toBe('function');
      expect(typeof uiPath.getContext).toBe('function');
      expect(typeof uiPath.getTokenManager).toBe('function');
    });
  });

  describe('2. Modular Pattern - New Architecture', () => {
    it('should import UiPath from /core', async () => {
      const { UiPath } = await import('../../src/core/index');
      expect(UiPath).toBeDefined();
      expect(typeof UiPath).toBe('function');
    });

    it('should import Entities from /entities', async () => {
      const { Entities, EntityService } = await import('../../src/services/data-fabric/index');
      expect(Entities).toBeDefined();
      expect(EntityService).toBeDefined();
      expect(Entities).toBe(EntityService); // They should be the same
    });

    it('should create UiPath core instance', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      expect(uiPath).toBeDefined();
      expect(uiPath.isInitialized()).toBe(true);
      expect(uiPath.isAuthenticated()).toBe(true);
    });

    it('should instantiate Entities service with UiPath instance', async () => {
      const { UiPath } = await import('../../src/core/index');
      const { Entities } = await import('../../src/services/data-fabric/index');

      const uiPath = new UiPath(mockConfig);
      const entitiesService = new Entities(uiPath);

      expect(entitiesService).toBeDefined();
      expect(typeof entitiesService.getAll).toBe('function');
      expect(typeof entitiesService.getById).toBe('function');
    });

    it('should allow multiple service instances from same UiPath', async () => {
      const { UiPath } = await import('../../src/core/index');
      const { Entities } = await import('../../src/services/data-fabric/index');

      const uiPath = new UiPath(mockConfig);
      const entities1 = new Entities(uiPath);
      const entities2 = new Entities(uiPath);

      // Different instances but both functional
      expect(entities1).not.toBe(entities2);
      expect(entities1.getAll).toBeDefined();
      expect(entities2.getAll).toBeDefined();
      // Both services use same underlying UiPath for auth
      expect(uiPath.isAuthenticated()).toBe(true);
    });
  });

  describe('3. Authentication Flow - Secret-Based', () => {
    it('should auto-authenticate with secret in constructor', async () => {
      const { UiPath } = await import('../../src/core/index');

      const uiPath = new UiPath({
        baseUrl: 'https://cloud.uipath.com',
        orgName: 'test-org',
        tenantName: 'test-tenant',
        secret: 'my-secret-key'
      });

      expect(uiPath.isAuthenticated()).toBe(true);
      expect(uiPath.isInitialized()).toBe(true);
      expect(uiPath.getToken()).toBe('my-secret-key');
    });

    it('should not require initialize() for secret auth', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      // Should already be initialized
      expect(uiPath.isInitialized()).toBe(true);

      // Calling initialize should be safe (no-op)
      await uiPath.initialize();
      expect(uiPath.isInitialized()).toBe(true);
    });
  });

  describe('4. Configuration Access', () => {
    it('should expose config through getConfig()', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      const config = uiPath.getConfig();
      expect(config.baseUrl).toBe('https://cloud.uipath.com');
      expect(config.orgName).toBe('test-org');
      expect(config.tenantName).toBe('test-tenant');
    });

    it('should expose execution context', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      const context = uiPath.getContext();
      expect(context).toBeDefined();
      expect(typeof context.set).toBe('function');
      expect(typeof context.get).toBe('function');
    });

    it('should expose token manager', async () => {
      const { UiPath } = await import('../../src/core/index');
      const uiPath = new UiPath(mockConfig);

      const tokenManager = uiPath.getTokenManager();
      expect(tokenManager).toBeDefined();
      expect(typeof tokenManager.hasValidToken).toBe('function');
      expect(typeof tokenManager.getToken).toBe('function');
    });
  });

  describe('5. Type Exports Verification', () => {
    it('should export UiPathSDKConfig type from core', async () => {
      const coreModule = await import('../../src/core/index');
      expect(coreModule.UiPath).toBeDefined();
      // TypeScript will ensure UiPathSDKConfig type exists at compile time
    });

    it('should export entity types from entities module', async () => {
      const entitiesModule = await import('../../src/services/data-fabric/index');
      expect(entitiesModule.Entities).toBeDefined();
      expect(entitiesModule.EntityService).toBeDefined();
      expect(entitiesModule.UiPathError).toBeDefined();
      // Types are checked at compile time
    });

    it('should export error classes', async () => {
      const { UiPathError } = await import('../../src/core/index');
      expect(UiPathError).toBeDefined();
      expect(typeof UiPathError).toBe('function');
    });
  });

  describe('6. Service Constructor Parameter Naming', () => {
    it('should accept uiPath parameter in service constructors', async () => {
      const { UiPath } = await import('../../src/core/index');
      const { Entities } = await import('../../src/services/data-fabric/index');

      const uiPath = new UiPath(mockConfig);

      // Should not throw
      expect(() => new Entities(uiPath)).not.toThrow();
    });
  });

  describe('7. Inheritance Chain Verification', () => {
    it('should verify legacy UiPath extends core UiPath', async () => {
      const { UiPath: LegacyUiPath } = await import('../../src/index');
      const { UiPath: CoreUiPath } = await import('../../src/core/index');

      const legacyInstance = new LegacyUiPath(mockConfig);

      // Legacy should be instance of both
      expect(legacyInstance).toBeInstanceOf(LegacyUiPath);
      expect(legacyInstance).toBeInstanceOf(CoreUiPath);
    });

    it('should have all core methods in legacy instance', async () => {
      const { UiPath: LegacyUiPath } = await import('../../src/index');
      const legacyInstance = new LegacyUiPath(mockConfig);

      // All core methods should be available
      expect(legacyInstance.getConfig).toBeDefined();
      expect(legacyInstance.getContext).toBeDefined();
      expect(legacyInstance.getTokenManager).toBeDefined();
      expect(legacyInstance.isAuthenticated).toBeDefined();
      expect(legacyInstance.isInitialized).toBeDefined();
    });
  });

  describe('8. Package Exports Verification', () => {
    it('should have correct exports in main package', async () => {
      const mainModule = await import('../../src/index');
      expect(mainModule.UiPath).toBeDefined();
      // Legacy exports all services
    });

    it('should have correct exports in core package', async () => {
      const coreModule = await import('../../src/core/index');
      expect(coreModule.UiPath).toBeDefined();
      expect(coreModule.UiPathError).toBeDefined();
    });

    it('should have correct exports in entities package', async () => {
      const entitiesModule = await import('../../src/services/data-fabric/index');
      expect(entitiesModule.Entities).toBeDefined();
      expect(entitiesModule.EntityService).toBeDefined();
      expect(entitiesModule.UiPathError).toBeDefined();
    });
  });
});
