import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v1', 'v2'];

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

      if (allProcesses.items.length === 0) {
        console.log('No processes available to test getById');
        return;
      }

      const processId = allProcesses.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping getById test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const result = await processes.getById(processId, folderId);

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

      if (!processKey) {
        console.log(
          'Skipping process start test: ORCHESTRATOR_TEST_PROCESS_KEY not configured. ' +
            'Set this environment variable to test process execution.'
        );
        return;
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping process start test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const result = await processes.start(
        {
          processKey,
          inputArguments: JSON.stringify({
            testRun: true,
            timestamp: new Date().toISOString(),
          }),
        },
        folderId
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].id).toBeDefined();
        expect(result[0].key).toBe(processKey);
      }
    });

    it('should start a process without input arguments', async () => {
      const { processes } = getServices();
      const config = getTestConfig();

      const processKey = config.orchestratorTestProcessKey;

      if (!processKey) {
        console.log('Skipping process start test: ORCHESTRATOR_TEST_PROCESS_KEY not configured.');
        return;
      }

      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping process start test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const result = await processes.start(
        {
          processKey,
        },
        folderId
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

      if (result.items.length === 0) {
        console.log('No processes available to validate structure');
        return;
      }

      const process = result.items[0];

      expect(process).toBeDefined();
      expect(process.id).toBeDefined();
      expect(process.key).toBeDefined();
      expect(typeof process.id).toBe('number');
      expect(typeof process.key).toBe('string');
    });
  });
});
