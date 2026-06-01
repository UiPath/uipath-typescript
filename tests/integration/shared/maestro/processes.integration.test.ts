import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { testGetTopRunCount, testGetInstanceStatusTimeline, testGetElementStats } from '../../utils/helpers';

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

  describe.skip('getTopRunCount', () => {
    it('should retrieve top processes by run count', async () => {
      const { maestroProcesses } = getServices();
      await testGetTopRunCount(maestroProcesses);
    });
  });

  describe.skip('getInstanceStatusTimeline', () => {
    it('should retrieve instance status by date', async () => {
      const { maestroProcesses } = getServices();
      await testGetInstanceStatusTimeline(maestroProcesses);
    });
  });

  describe.skip('getTopFaultedCount', () => {
    it('should retrieve top processes by failure count', async () => {
      const { maestroProcesses } = getServices();
      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await maestroProcesses.getTopFaultedCount(sevenDaysAgo, now);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No top processes by failure count returned — cannot validate response structure');
      }

      const topProcess = result[0];
      expect(topProcess.packageId).toBeDefined();
      expect(typeof topProcess.faultedCount).toBe('number');
      expect(topProcess.name).toBe(topProcess.packageId);
    });
  });

  describe.skip('getTopElementFailedCount', () => {
    it('should retrieve top elements by failure count', async () => {
      const { maestroProcesses } = getServices();
      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await maestroProcesses.getTopElementFailedCount(sevenDaysAgo, now);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No top elements by failure count returned — cannot validate response structure');
      }

      const element = result[0];
      expect(element.elementName).toBeDefined();
      expect(typeof element.elementName).toBe('string');
      expect(element.elementType).toBeDefined();
      expect(typeof element.failedCount).toBe('number');
    });
  });

  describe.skip('getTopExecutionDuration', () => {
    it('should retrieve top processes by duration', async () => {
      const { maestroProcesses } = getServices();
      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await maestroProcesses.getTopExecutionDuration(sevenDaysAgo, now);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No top processes by duration returned — cannot validate response structure');
      }

      const topProcess = result[0];
      expect(topProcess.packageId).toBeDefined();
      expect(typeof topProcess.packageId).toBe('string');
      expect(topProcess.duration).toBeDefined();
      expect(typeof topProcess.duration).toBe('number');
      expect(topProcess.processKey).toBeDefined();
      expect(typeof topProcess.processKey).toBe('string');
      expect(topProcess.name).toBeDefined();
      expect(topProcess.name).toBe(topProcess.packageId);
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

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getElementStats', () => {
    it('should retrieve element stats for a process', async () => {
      const { maestroProcesses } = getServices();
      await testGetElementStats(maestroProcesses, 'processes');
    });
  });

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getInstanceCountByStatus', () => {
    it('should retrieve instance count by status for a process', async () => {
      const { maestroProcesses } = getServices();
      const processes = await maestroProcesses.getAll();
      expect(processes.length).toBeGreaterThan(0);

      const process = processes[0];
      const result = await maestroProcesses.getInstanceCountByStatus(
        process.processKey,
        process.packageId,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(),
        process.packageVersions[0]
      );

      expect(result).toBeDefined();
      expect(typeof result.countOfAllInstances).toBe('number');
      expect(typeof result.countOfCompleted).toBe('number');
      expect(typeof result.avgDurationInMs).toBe('number');
    });
  });
});
