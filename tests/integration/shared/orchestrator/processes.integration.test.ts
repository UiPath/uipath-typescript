import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { isNotFoundError } from '../../../../src/core/errors';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Orchestrator Processes - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all processes', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const result = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve processes with pagination options', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const result = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 5,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve processes with filter', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const result = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length > 0) {
        const process = result.items[0];
        expect(process.id).toBeDefined();
        expect(process.key).toBeDefined();
      }
    });
  });

  describe('getById', () => {
    it('should retrieve a specific process by ID', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const allProcesses = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      expect(allProcesses.items.length, 'No processes available to test getById').toBeGreaterThan(0);

      const processId = allProcesses.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      expect(folderId, 'INTEGRATION_TEST_FOLDER_ID must be configured').toBeDefined();

      const result = await processes.getById(processId, folderId!);

      expect(result).toBeDefined();
      expect(result.id).toBe(processId);
      expect(result.key).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start a process and create a job using processKey', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const processKey = config.orchestratorTestProcessKey;

      expect(processKey, 'ORCHESTRATOR_TEST_PROCESS_KEY must be configured to test process execution').toBeDefined();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      expect(folderId, 'INTEGRATION_TEST_FOLDER_ID must be configured').toBeDefined();

      const result = await processes.start(
        {
          processKey: processKey!,
          inputArguments: JSON.stringify({
            testRun: true,
            timestamp: new Date().toISOString(),
          }),
        },
        folderId!
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].id).toBeDefined();
      }
    });

    it('should start a process without input arguments', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const processKey = config.orchestratorTestProcessKey;

      expect(processKey, 'ORCHESTRATOR_TEST_PROCESS_KEY must be configured').toBeDefined();

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      expect(folderId, 'INTEGRATION_TEST_FOLDER_ID must be configured').toBeDefined();

      const result = await processes.start(
        {
          processKey: processKey!,
        },
        folderId!
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].id).toBeDefined();
      }
    });
  });

  describe('getByName', () => {
    it('should retrieve a process by name using folderKey', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      expect(config.folderKey, 'INTEGRATION_TEST_FOLDER_KEY must be configured for getByName').toBeDefined();

      const allProcesses = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });
      expect(allProcesses.items.length, 'No processes available to test getByName').toBeGreaterThan(0);
      const existing = allProcesses.items[0];

      const result = await processes.getByName(existing.name, { folderKey: config.folderKey });

      expect(result).toBeDefined();
      expect(result.id).toBe(existing.id);
      expect(result.name).toBe(existing.name);
      expect(result.key).toBe(existing.key);
    });

    it('should retrieve a process by name using folderPath', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      expect(config.folderPath, 'INTEGRATION_TEST_FOLDER_PATH must be configured for getByName').toBeDefined();

      const allProcesses = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });
      expect(allProcesses.items.length, 'No processes available to test getByName').toBeGreaterThan(0);
      const existing = allProcesses.items[0];

      const result = await processes.getByName(existing.name, { folderPath: config.folderPath });

      expect(result).toBeDefined();
      expect(result.id).toBe(existing.id);
      expect(result.name).toBe(existing.name);
    });

    it('should return transformed camelCase fields (no PascalCase leaks)', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      expect(config.folderKey, 'INTEGRATION_TEST_FOLDER_KEY must be configured for getByName').toBeDefined();

      const allProcesses = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });
      expect(allProcesses.items.length, 'No processes available to validate transform').toBeGreaterThan(0);

      const result = await processes.getByName(allProcesses.items[0].name, { folderKey: config.folderKey });

      expect(result.createdTime).toBeDefined();
      expect(result.folderId).toBeDefined();
      expect((result as any).CreationTime).toBeUndefined();
      expect((result as any).LastModificationTime).toBeUndefined();
      expect((result as any).OrganizationUnitId).toBeUndefined();
    });

    it('should throw NotFoundError for a nonexistent process name', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      expect(config.folderKey, 'INTEGRATION_TEST_FOLDER_KEY must be configured for getByName').toBeDefined();

      const missingName = `__uipath-sdk-nonexistent-process-${Date.now()}`;
      await expect(
        processes.getByName(missingName, { folderKey: config.folderKey }),
      ).rejects.toSatisfy(isNotFoundError);
    });
  });

  describe('Process structure validation', () => {
    it('should have expected fields in process object', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const result = await processes.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      expect(result.items.length, 'No processes available to validate structure').toBeGreaterThan(0);

      const process = result.items[0];

      expect(process).toBeDefined();
      expect(process.id).toBeDefined();
      expect(process.key).toBeDefined();
      expect(typeof process.id).toBe('number');
      expect(typeof process.key).toBe('string');
    });
  });
});
