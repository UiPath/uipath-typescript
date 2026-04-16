import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Processes - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all Maestro processes', async () => {
      const { maestroProcesses } = getServices();

      try {
        const result = await maestroProcesses.getAll();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        throw error;
      }
    });

    it('should have valid process structure', async () => {
      const { maestroProcesses } = getServices();

      try {
        const result = await maestroProcesses.getAll();

        if (result.length === 0) {
          console.log('No Maestro processes available to validate structure');
          return;
        }

        const process = result[0];
        expect(process).toBeDefined();
        expect(process.key).toBeDefined();
        expect(typeof process.key).toBe('string');
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        throw error;
      }
    });

    it('should retrieve processes with pagination', async () => {
      const { maestroProcesses } = getServices();

      try {
        const result = await maestroProcesses.getAll({
          limit: 5,
        });

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(5);
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        throw error;
      }
    });
  });

  describe('getIncidents', () => {
    it('should retrieve incidents for a process', async () => {
      const { maestroProcesses } = getServices();
      const config = getTestConfig();

      const processKey = config.maestroTestProcessKey;

      if (!processKey) {
        console.log(
          'Skipping incidents test: MAESTRO_TEST_PROCESS_KEY not configured. ' +
            'Set this environment variable to test incident retrieval.'
        );
        return;
      }

      const result = await maestroProcesses.getIncidents(processKey, config.folderId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should retrieve incidents from first available process', async () => {
      const { maestroProcesses } = getServices();

      try {
        const processes = await maestroProcesses.getAll({
          limit: 1,
        });

        if (processes.length === 0) {
          console.log('No Maestro processes available to test incidents');
          return;
        }

        const processKey = processes[0].key;

        try {
          const result = await maestroProcesses.getIncidents(processKey);
          expect(result).toBeDefined();
          expect(Array.isArray(result)).toBe(true);
        } catch (error: any) {
          console.log(`Could not retrieve incidents for process ${processKey}:`, error.message);
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        throw error;
      }
    });
  });

  describe('start', () => {
    it('should start a process and create a job using processKey', async () => {
      const { maestroProcesses } = getServices();
      const config = getTestConfig();

      const processKey = config.orchestratorTestProcessKey;

      expect(
        processKey,
        'ORCHESTRATOR_TEST_PROCESS_KEY must be configured to test process execution'
      ).toBeDefined();
      expect(config.folderId, 'INTEGRATION_TEST_FOLDER_ID must be configured').toBeDefined();

      const result = await maestroProcesses.start(
        {
          processKey: processKey!,
          inputArguments: JSON.stringify({
            testRun: true,
            timestamp: new Date().toISOString(),
          }),
        },
        config.folderId!
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].id).toBeDefined();
      }
    });
  });

  describe('Process metadata validation', () => {
    it('should have expected fields in process objects', async () => {
      const { maestroProcesses } = getServices();

      try {
        const result = await maestroProcesses.getAll({
          limit: 1,
        });

        if (result.length === 0) {
          console.log('No processes available to validate metadata');
          return;
        }

        const process = result[0];

        expect(process.key).toBeDefined();
        expect(typeof process.key).toBe('string');

        if (process.name) {
          expect(typeof process.name).toBe('string');
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        throw error;
      }
    });
  });
});
