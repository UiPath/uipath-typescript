import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { testGetTopRunCount, testGetInstanceStatusTimeline, testGetIncidentsTimeline, testGetElementStats, testGetInstanceStats } from '../../utils/helpers';

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
          throw new Error('No Maestro processes available — cannot validate process structure');
        }

        const process = result[0];
        expect(process).toBeDefined();
        expect(process.processKey).toBeDefined();
        expect(typeof process.processKey).toBe('string');
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

  describe('getAll filtering', () => {
    it('should filter processes by packageId', async () => {
      const { maestroProcesses } = getServices();

      const all = await maestroProcesses.getAll();
      if (all.length === 0) {
        throw new Error('No Maestro processes available to test packageId filtering');
      }

      const { packageId } = all[0];
      const filtered = await maestroProcesses.getAll({ packageId });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.length).toBeGreaterThan(0);
      for (const process of filtered) {
        expect(process.packageId).toBe(packageId);
      }
    });

    it('should accept a started-time range filter', async () => {
      const { maestroProcesses } = getServices();

      const result = await maestroProcesses.getAll({
        startTime: new Date(0),
        endTime: new Date(),
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getIncidents', () => {
    it('should retrieve incidents for a process', async () => {
      const { maestroProcesses } = getServices();
      const config = getTestConfig();

      const processKey = config.maestroTestProcessKey;

      if (!processKey) {
        throw new Error('MAESTRO_TEST_PROCESS_KEY not configured — cannot test incident retrieval');
      }

      const result = await maestroProcesses.getIncidents(processKey, config.folderKey);

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
          throw new Error('No Maestro processes available — cannot test incident retrieval');
        }

        const { processKey, folderKey } = processes[0];

        const result = await maestroProcesses.getIncidents(processKey, folderKey);
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
  });

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getTopRunCount', () => {
    it('should retrieve top processes by run count', async () => {
      const { maestroProcesses } = getServices();
      await testGetTopRunCount(maestroProcesses);
    });
  });

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getInstanceStatusTimeline', () => {
    it('should retrieve instance status by date', async () => {
      const { maestroProcesses } = getServices();
      await testGetInstanceStatusTimeline(maestroProcesses);
    });
  });

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getIncidentsTimeline', () => {
    it('should retrieve incident counts bucketed by time', async () => {
      const { maestroProcesses } = getServices();
      await testGetIncidentsTimeline(maestroProcesses);
    });
  });

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
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

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
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

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
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
          throw new Error('No Maestro processes available — cannot validate process metadata');
        }

        const process = result[0];

        expect(process.processKey).toBeDefined();
        expect(typeof process.processKey).toBe('string');

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
  describe.skip('getInstanceStats', () => {
    it('should retrieve instance stats for a process', async () => {
      const { maestroProcesses } = getServices();
      await testGetInstanceStats(maestroProcesses, 'processes');
    });
  });
});
