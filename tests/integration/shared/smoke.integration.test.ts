import { describe, it, expect } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../config/unified-setup';

const modes: InitMode[] = ['v1', 'v2'];

describe.each(modes)('SDK Initialization - Smoke Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('Configuration', () => {
    it('should load valid configuration from environment', () => {
      const config = getTestConfig();

      expect(config).toBeDefined();
      expect(config.baseUrl).toBeDefined();
      expect(config.orgName).toBeDefined();
      expect(config.tenantName).toBeDefined();
      expect(config.secret).toBeDefined();
      expect(config.timeout).toBeGreaterThan(0);
    });

    it('should have valid baseUrl format', () => {
      const config = getTestConfig();
      expect(config.baseUrl).toMatch(/^https?:\/\/.+/);
    });
  });

  describe('SDK Instance', () => {
    it('should create SDK instance successfully', () => {
      const { sdk } = getServices();
      expect(sdk).toBeDefined();
    });

    it('should be authenticated', () => {
      const { sdk } = getServices();
      expect(sdk.isAuthenticated()).toBe(true);
    });
  });

  describe('Service Instantiation', () => {
    it('should have access to Data Fabric services', () => {
      const { entities, choiceSets } = getServices();
      expect(entities).toBeDefined();
      expect(choiceSets).toBeDefined();
      expect(typeof entities.getAll).toBe('function');
    });

    it('should have access to Action Center services', () => {
      const { tasks } = getServices();
      expect(tasks).toBeDefined();
      expect(typeof tasks.getAll).toBe('function');
    });

    it('should have access to Orchestrator services', () => {
      const { assets, buckets, queues, processes } = getServices();
      expect(assets).toBeDefined();
      expect(buckets).toBeDefined();
      expect(queues).toBeDefined();
      expect(processes).toBeDefined();
    });

    it('should have access to Maestro services', () => {
      const { maestroProcesses, processInstances, cases, caseInstances } = getServices();
      expect(maestroProcesses).toBeDefined();
      expect(processInstances).toBeDefined();
      expect(cases).toBeDefined();
      expect(caseInstances).toBeDefined();
    });
  });

  describe('Basic API Connectivity', () => {
    it('should successfully make an API call to Orchestrator', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const folderId = config.folderId ? Number(config.folderId) : undefined;
      const result = await queues.getAll({ folderId });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    }, 15000);

    it('should successfully make an API call to Data Fabric', async () => {
      const { entities } = getServices();

      const result = await entities.getAll();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    }, 15000);
  });
});
