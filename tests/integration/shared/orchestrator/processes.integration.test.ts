import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

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
        folderId!,
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
        folderId!,
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].id).toBeDefined();
      }
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
