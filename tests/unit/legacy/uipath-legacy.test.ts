// ===== IMPORTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UiPath } from '../../../src/uipath';
import { UiPath as CoreUiPath } from '../../../src/core/uipath';
import {
  MaestroProcessesService,
  ProcessInstancesService,
  ProcessIncidentsService,
  CasesService,
  CaseInstancesService,
  EntityService,
  TaskService,
  ProcessService,
  BucketService,
  QueueService,
  AssetService
} from '../../../src/services';
import { ApiClient } from '../../../src/core/http/api-client';
import { createMockApiClient, getPrivateSDK, getConfig } from '../../utils/setup';
import { TEST_CONSTANTS } from '../../utils/constants/common';

// ===== MOCKING =====
vi.mock('../../../src/core/http/api-client');

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

// ===== TEST SUITE =====
describe('UiPath Legacy Pattern', () => {
  let uiPath: UiPath;
  let mockApiClient: any;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    uiPath = new UiPath({
      baseUrl: TEST_CONSTANTS.BASE_URL,
      orgName: TEST_CONSTANTS.ORGANIZATION_ID,
      tenantName: TEST_CONSTANTS.TENANT_ID,
      secret: TEST_CONSTANTS.CLIENT_SECRET
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Inheritance', () => {
    it('should extend CoreUiPath', () => {
      expect(Object.getPrototypeOf(UiPath.prototype)).toBe(CoreUiPath.prototype);
      expect(uiPath).toBeInstanceOf(CoreUiPath);
    });

    it('should inherit core authentication methods and symbol pattern', () => {
      expect(uiPath.initialize).toBeDefined();
      expect(uiPath.isAuthenticated).toBeDefined();
      expect(uiPath.getToken).toBeDefined();
      // Symbol pattern provides access to internals
      const privateSDK = getPrivateSDK(uiPath);
      expect(privateSDK).toBeDefined();
      expect(privateSDK.config).toBeDefined();
      expect(privateSDK.tokenManager).toBeDefined();
      expect(privateSDK.context).toBeDefined();
    });
  });

  describe('Property Getters - Maestro Services', () => {
    it('should provide maestro.processes property getter', () => {
      const processes = uiPath.maestro.processes;

      expect(processes).toBeDefined();
      expect(processes).toBeInstanceOf(MaestroProcessesService);
      expect(processes.getAll).toBeDefined();
    });

    it('should provide maestro.processes.instances property getter', () => {
      const instances = uiPath.maestro.processes.instances;

      expect(instances).toBeDefined();
      expect(instances).toBeInstanceOf(ProcessInstancesService);
      expect(instances.getAll).toBeDefined();
    });

    it('should provide maestro.processes.incidents property getter', () => {
      const incidents = uiPath.maestro.processes.incidents;

      expect(incidents).toBeDefined();
      expect(incidents).toBeInstanceOf(ProcessIncidentsService);
      expect(incidents.getAll).toBeDefined();
    });

    it('should provide maestro.cases property getter', () => {
      const cases = uiPath.maestro.cases;

      expect(cases).toBeDefined();
      expect(cases).toBeInstanceOf(CasesService);
      expect(cases.getAll).toBeDefined();
    });

    it('should provide maestro.cases.instances property getter', () => {
      const caseInstances = uiPath.maestro.cases.instances;

      expect(caseInstances).toBeDefined();
      expect(caseInstances).toBeInstanceOf(CaseInstancesService);
      expect(caseInstances.getAll).toBeDefined();
    });
  });

  describe('Property Getters - Data Fabric Services', () => {
    it('should provide entities property getter', () => {
      const entities = uiPath.entities;

      expect(entities).toBeDefined();
      expect(entities).toBeInstanceOf(EntityService);
      expect(entities.getAll).toBeDefined();
    });
  });

  describe('Property Getters - Action Center Services', () => {
    it('should provide tasks property getter', () => {
      const tasks = uiPath.tasks;

      expect(tasks).toBeDefined();
      expect(tasks).toBeInstanceOf(TaskService);
      expect(tasks.getAll).toBeDefined();
      expect(tasks.create).toBeDefined();
    });
  });

  describe('Property Getters - Orchestrator Services', () => {
    it('should provide processes property getter', () => {
      const processes = uiPath.processes;

      expect(processes).toBeDefined();
      expect(processes).toBeInstanceOf(ProcessService);
      expect(processes.getAll).toBeDefined();
    });

    it('should provide buckets property getter', () => {
      const buckets = uiPath.buckets;

      expect(buckets).toBeDefined();
      expect(buckets).toBeInstanceOf(BucketService);
      expect(buckets.getAll).toBeDefined();
    });

    it('should provide queues property getter', () => {
      const queues = uiPath.queues;

      expect(queues).toBeDefined();
      expect(queues).toBeInstanceOf(QueueService);
      expect(queues.getAll).toBeDefined();
    });

    it('should provide assets property getter', () => {
      const assets = uiPath.assets;

      expect(assets).toBeDefined();
      expect(assets).toBeInstanceOf(AssetService);
      expect(assets.getAll).toBeDefined();
    });
  });

  describe('Service Caching', () => {
    it('should return the same service instance on multiple calls', () => {
      const entities1 = uiPath.entities;
      const entities2 = uiPath.entities;

      expect(entities1).toBe(entities2);
    });

    it('should cache maestro.processes service', () => {
      const processes1 = uiPath.maestro.processes;
      const processes2 = uiPath.maestro.processes;

      expect(processes1).toBe(processes2);
    });

    it('should cache maestro.processes.instances service', () => {
      const instances1 = uiPath.maestro.processes.instances;
      const instances2 = uiPath.maestro.processes.instances;

      expect(instances1).toBe(instances2);
    });

    it('should cache all orchestrator services', () => {
      const processes1 = uiPath.processes;
      const processes2 = uiPath.processes;
      const buckets1 = uiPath.buckets;
      const buckets2 = uiPath.buckets;

      expect(processes1).toBe(processes2);
      expect(buckets1).toBe(buckets2);
    });
  });

  describe('Backward Compatibility with Modular Pattern', () => {
    it('should use the same UiPath core instance for services', () => {
      const entities = uiPath.entities;
      const tasks = uiPath.tasks;

      // Both services should receive the same UiPath instance
      expect(entities).toBeDefined();
      expect(tasks).toBeDefined();

      // Verify they share the same config via symbol pattern
      expect(getConfig(uiPath)).toBeDefined();
    });

    it('should provide equivalent functionality to modular pattern', () => {
      // Legacy pattern
      const legacyEntities = uiPath.entities;

      // Modular pattern would be: new EntityService(uiPath)
      const modularEntities = new EntityService(uiPath as CoreUiPath);

      // Both should be instances of the same service class
      expect(legacyEntities).toBeInstanceOf(EntityService);
      expect(modularEntities).toBeInstanceOf(EntityService);

      // Both should have the same methods
      expect(typeof legacyEntities.getAll).toBe('function');
      expect(typeof modularEntities.getAll).toBe('function');
    });

    it('should maintain authentication state across patterns', () => {
      // Check core authentication methods are accessible
      expect(uiPath.isAuthenticated()).toBe(true);
      expect(uiPath.getToken()).toBeDefined();

      // Services should work with the authenticated instance
      const entities = uiPath.entities;
      expect(entities).toBeDefined();
    });
  });

  describe('Factory Function', () => {
    it('should support default export factory function', async () => {
      const { default: uipathFactory } = await import('../../../src/uipath');

      const instance = uipathFactory({
        baseUrl: TEST_CONSTANTS.BASE_URL,
        orgName: TEST_CONSTANTS.ORGANIZATION_ID,
        tenantName: TEST_CONSTANTS.TENANT_ID,
        secret: TEST_CONSTANTS.CLIENT_SECRET
      });

      expect(instance).toBeInstanceOf(UiPath);
      expect(instance.entities).toBeDefined();
    });
  });

  describe('Service Method Availability', () => {
    it('should expose all expected methods on entities service', () => {
      const entities = uiPath.entities;

      expect(entities.getAll).toBeDefined();
      expect(entities.getById).toBeDefined();
      expect(entities.getRecordsById).toBeDefined();
      expect(entities.insertById).toBeDefined();
      expect(entities.updateById).toBeDefined();
      expect(entities.deleteById).toBeDefined();
    });

    it('should expose all expected methods on tasks service', () => {
      const tasks = uiPath.tasks;

      expect(tasks.getAll).toBeDefined();
      expect(tasks.getById).toBeDefined();
      expect(tasks.create).toBeDefined();
      expect(tasks.assign).toBeDefined();
      expect(tasks.reassign).toBeDefined();
      expect(tasks.unassign).toBeDefined();
      expect(tasks.complete).toBeDefined();
    });

    it('should expose all expected methods on maestro.processes service', () => {
      const processes = uiPath.maestro.processes;

      expect(processes.getAll).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle config validation errors', () => {
      expect(() => {
        new UiPath({
          baseUrl: '',
          orgName: '',
          tenantName: '',
          secret: ''
        } as any);
      }).toThrow();
    });
  });
});
