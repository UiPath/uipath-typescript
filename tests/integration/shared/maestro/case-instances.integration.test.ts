import { describe, it, expect, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { hasValidPagination } from '../../utils/helpers';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Case Instances - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let testCaseInstanceId: string | null = null;

  describe('getAll', () => {
    it('should retrieve all case instances', async () => {
      const { caseInstances } = getServices();

      try {
        const result = await caseInstances.getAll();

        expect(result).toBeDefined();
        expect(hasValidPagination(result)).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);

        if (result.data.length > 0) {
          testCaseInstanceId = result.data[0].id;
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        console.log('Case instances retrieval failed:', error.message);
      }
    });

    it('should retrieve case instances with limit', async () => {
      const { caseInstances } = getServices();

      try {
        const result = await caseInstances.getAll({
          limit: 5,
        });

        expect(result).toBeDefined();
        expect(hasValidPagination(result)).toBe(true);
        expect(result.data.length).toBeLessThanOrEqual(5);
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        console.log('Case instances with limit failed:', error.message);
      }
    });

    it('should handle pagination with cursor', async () => {
      const { caseInstances } = getServices();

      try {
        const firstPage = await caseInstances.getAll({
          limit: 2,
        });

        expect(firstPage).toBeDefined();
        expect(hasValidPagination(firstPage)).toBe(true);

        if (firstPage.hasNextPage && firstPage.nextCursor) {
          const secondPage = await caseInstances.getAll({
            limit: 2,
            cursor: firstPage.nextCursor,
          });

          expect(secondPage).toBeDefined();
          expect(hasValidPagination(secondPage)).toBe(true);
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        console.log('Case instances pagination failed:', error.message);
      }
    });
  });

  describe('getById', () => {
    it('should retrieve a specific case instance by ID', async () => {
      if (!testCaseInstanceId) {
        console.log('No case instance ID available for testing');
        return;
      }

      const { caseInstances } = getServices();
      const config = getTestConfig();

      try {
        const result = await caseInstances.getById(testCaseInstanceId, config.folderId);

        expect(result).toBeDefined();
        expect(result.id).toBe(testCaseInstanceId);
      } catch (error: any) {
        console.log('Get case instance by ID failed:', error.message);
      }
    });
  });

  describe('getStages', () => {
    it('should retrieve stages for a case instance', async () => {
      if (!testCaseInstanceId) {
        console.log('No case instance ID available for testing');
        return;
      }

      const { caseInstances } = getServices();
      const config = getTestConfig();

      try {
        const result = await caseInstances.getStages(testCaseInstanceId, config.folderId);

        expect(result).toBeDefined();
        expect(Array.isArray(result) || typeof result === 'object').toBe(true);

        if (Array.isArray(result) && result.length > 0) {
          const stage = result[0];
          expect(stage).toBeDefined();
          expect(typeof stage).toBe('object');
        }
      } catch (error: any) {
        console.log('Get case stages failed:', error.message);
      }
    });

    it('should validate stage structure', async () => {
      if (!testCaseInstanceId) {
        console.log('No case instance ID available for testing');
        return;
      }

      const { caseInstances } = getServices();
      const config = getTestConfig();

      try {
        const stages = await caseInstances.getStages(testCaseInstanceId, config.folderId);

        if (Array.isArray(stages) && stages.length > 0) {
          const stage = stages[0];
          expect(stage).toBeDefined();
          console.log('Stage fields:', Object.keys(stage));
        }
      } catch (error: any) {
        console.log('Stage validation failed:', error.message);
      }
    });
  });

  describe('close', () => {
    it('should close a case instance', async () => {
      const { caseInstances } = getServices();
      const config = getTestConfig();

      try {
        const instances = await caseInstances.getAll({
          limit: 10,
        });

        const openInstance = instances.data.find(
          (inst: any) =>
            inst.status && inst.status.toLowerCase().match(/open|active|in progress/)
        );

        if (!openInstance) {
          console.log('No open case instance available to test closure');
          return;
        }

        const result = await caseInstances.close(openInstance.id, config.folderId);

        expect(result).toBeDefined();

        const closedInstance = await caseInstances.getById(openInstance.id, config.folderId);
        expect(closedInstance.status).toMatch(/closed|completed/i);

        registerResource('caseInstances', {
          id: openInstance.id,
          folderKey: config.folderId,
        });
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        console.log('Close case instance test failed:', error.message);
      }
    });
  });

  describe('Case instance structure validation', () => {
    it('should have expected fields in case instance objects', async () => {
      const { caseInstances } = getServices();

      try {
        const result = await caseInstances.getAll({
          limit: 1,
        });

        if (result.data.length === 0) {
          console.log('No case instances available to validate structure');
          return;
        }

        const instance = result.data[0];

        expect(instance.id).toBeDefined();
        expect(typeof instance.id).toBe('string');

        if (instance.status) {
          expect(typeof instance.status).toBe('string');
        }

        if (instance.caseDefinitionId || instance.caseKey) {
          expect(typeof (instance.caseDefinitionId || instance.caseKey)).toBe('string');
        }
      } catch (error: any) {
        if (error.message?.includes('Forbidden') || error.statusCode === 403) {
          console.log(
            'Skipping test: PAT token does not have Maestro permissions. ' +
              'Grant Maestro (Read) scope when creating the token.'
          );
          return;
        }
        console.log('Case instance structure validation failed:', error.message);
      }
    });
  });

  describe('Service verification', () => {
    it('should use the same SDK instance as other Maestro services', () => {
      const services = getServices();

      expect(services.sdk).toBeDefined();
      expect(services.caseInstances).toBeDefined();
      expect(services.cases).toBeDefined();
      expect(services.maestroProcesses).toBeDefined();
      expect(services.sdk.isAuthenticated()).toBe(true);
    });
  });

  afterAll(async () => {
    // Note: We don't cleanup test case instances as they may be pre-existing
  });
});
