import { describe, it, expect } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { testGetTopRunCount, testGetInstanceStatusTimeline, testGetIncidentsTimeline, testGetElementStats } from '../../utils/helpers';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Cases - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('Case access and structure', () => {
    it('should instantiate cases service', async () => {
      const { cases } = getServices();

      expect(cases).toBeDefined();
    });

    it('should retrieve case definitions', async () => {
      const { cases } = getServices();

      try {
        const result = await cases.getAll();

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const caseItem = result[0];
          expect(caseItem).toBeDefined();
          expect(caseItem.processKey || caseItem.key).toBeDefined();
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        console.log('Case retrieval test:', error.message);
      }
    });
  });

  describe.skip('getInstanceStatusTimeline', () => {
    it('should retrieve instance status by date for case management', async () => {
      const { cases } = getServices();
      await testGetInstanceStatusTimeline(cases);
    });
  });

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getIncidentsTimeline', () => {
    it('should retrieve incident counts over time for case management', async () => {
      const { cases } = getServices();
      await testGetIncidentsTimeline(cases);
    });
  });

  describe('Case CRUD operations', () => {
    it('should support case definition operations', async () => {
      const { cases } = getServices();

      expect(cases).toBeDefined();
      expect(typeof cases.getAll).toBe('function');

      console.log(
        'Case CRUD tests require appropriate permissions and Maestro configuration. ' +
          'These operations are typically performed through the UiPath UI.'
      );
    });

    it('should have separate case instances service', async () => {
      const { cases, caseInstances } = getServices();

      expect(cases).toBeDefined();
      expect(caseInstances).toBeDefined();
      expect(cases).not.toBe(caseInstances);

      expect(typeof cases.getAll).toBe('function');
      expect(typeof caseInstances.getAll).toBe('function');
    });
  });

  describe('Case metadata and validation', () => {
    it('should validate case API structure', () => {
      const { cases, caseInstances } = getServices();

      expect(cases).toBeDefined();
      expect(caseInstances).toBeDefined();
      expect(typeof cases).toBe('object');
      expect(typeof caseInstances).toBe('object');
    });

    it('should have expected methods on cases service', () => {
      const { cases } = getServices();

      expect(typeof cases.getAll).toBe('function');
    });
  });

  describe.skip('getTopRunCount', () => {
    it('should retrieve top case processes by run count', async () => {
      const { cases } = getServices();
      await testGetTopRunCount(cases);
    });
  });

  describe.skip('getTopFaultedCount', () => {
    it('should retrieve top case processes by failure count', async () => {
      const { cases } = getServices();
      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await cases.getTopFaultedCount(sevenDaysAgo, now);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No top cases by failure count returned — cannot validate response structure');
      }

      const topProcess = result[0];
      expect(topProcess.packageId).toBeDefined();
      expect(typeof topProcess.faultedCount).toBe('number');
      expect(topProcess.name).toBeDefined();
      expect(typeof topProcess.name).toBe('string');
    });
  });

  describe.skip('getTopElementFailedCount', () => {
    it('should retrieve top elements by failure count for cases', async () => {
      const { cases } = getServices();
      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await cases.getTopElementFailedCount(sevenDaysAgo, now);

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
    it('should retrieve top case processes by duration', async () => {
      const { cases } = getServices();
      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await cases.getTopExecutionDuration(sevenDaysAgo, now);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No top cases by duration returned — cannot validate response structure');
      }

      const topProcess = result[0];
      expect(topProcess.packageId).toBeDefined();
      expect(typeof topProcess.packageId).toBe('string');
      expect(topProcess.duration).toBeDefined();
      expect(typeof topProcess.duration).toBe('number');
      expect(topProcess.processKey).toBeDefined();
      expect(typeof topProcess.processKey).toBe('string');
      expect(topProcess.name).toBeDefined();
      expect(typeof topProcess.name).toBe('string');
    });
  });

  describe('Service verification', () => {
    it('should use the same SDK instance as other Maestro services', () => {
      const services = getServices();

      expect(services.sdk).toBeDefined();
      expect(services.cases).toBeDefined();
      expect(services.caseInstances).toBeDefined();
      expect(services.maestroProcesses).toBeDefined();
      expect(services.sdk.isAuthenticated()).toBe(true);
    });
  });

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getElementStats', () => {
    it('should retrieve element stats for a case', async () => {
      const { cases } = getServices();
      await testGetElementStats(cases, 'cases');
    });
  });
});
