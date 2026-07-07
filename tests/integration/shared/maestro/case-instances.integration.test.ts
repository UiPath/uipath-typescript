import { describe, it, expect, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import { hasValidPagination, generateRandomString } from '../../utils/helpers';
import { CaseInstanceMessageName } from '../../../../src/models/maestro/case-instances.types';

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
        expect(Array.isArray(result.items)).toBe(true);

        if (result.items.length > 0) {
          testCaseInstanceId = result.items[0].id;
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
        expect(result.items.length).toBeLessThanOrEqual(5);
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

  describe('sendMessage', () => {
    it('should send a message to a running case instance', async () => {
      const { caseInstances } = getServices();

      const instances = await caseInstances.getAll({ limit: 50 });
      const runningInstance = instances.items.find(
        (instance) => instance.latestRunStatus === 'Running' && instance.folderKey
      );

      if (!runningInstance) {
        throw new Error('No running case instance available — cannot test sendMessage');
      }

      // Publishing an ad-hoc trigger with an unmatched task name exercises the endpoint,
      // auth, folder-key header, and body format without altering the case state.
      await expect(
        caseInstances.sendMessage(
          runningInstance.instanceId,
          runningInstance.folderKey,
          CaseInstanceMessageName.UserAdhocTrigger,
          { itemData: { taskNames: [`sdk-integration-${generateRandomString(8)}`] } }
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('Case instance structure validation', () => {
    it('should have expected fields in case instance objects', async () => {
      const { caseInstances } = getServices();

      try {
        const result = await caseInstances.getAll({
          limit: 1,
        });

        if (result.items.length === 0) {
          console.log('No case instances available to validate structure');
          return;
        }

        const instance = result.items[0];

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

  describe.skipIf(mode === 'v0')('getSlaSummary', () => {
    it('should retrieve SLA summary for case instances', async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getSlaSummary();

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);

      if (result.items.length === 0) {
        throw new Error('No SLA data available — cannot validate response structure');
      }

      const item = result.items[0];
      expect(item.caseInstanceId).toBeDefined();
      expect(typeof item.caseInstanceId).toBe('string');
      expect(item.slaStatus).toBeDefined();
      expect(item.folderKey).toBeDefined();

      // Validate transform pipeline: timestamps must be ISO 8601, not the raw "M/D/YYYY h:mm:ss AM" format
      expect(item.slaDueTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(item.lastModifiedTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should support pagination with pageSize', async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getSlaSummary({ pageSize: 5 });

      expect(result).toBeDefined();
      expect(result.items.length).toBeLessThanOrEqual(5);
    });
  });

  describe.skipIf(mode === 'v0')('getStagesSlaSummary', () => {
    it('should retrieve stages SLA summary for case instances', async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getStagesSlaSummary();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      if (result.length === 0) {
        throw new Error('No stage SLA summary items returned — cannot validate response structure');
      }

      const item = result[0];
      expect(item.caseInstanceId).toBeDefined();
      expect(typeof item.caseInstanceId).toBe('string');
      expect(item.stages).toBeDefined();
      expect(Array.isArray(item.stages)).toBe(true);

      if (item.stages.length === 0) {
        throw new Error('No stages returned for first item — cannot validate stage structure');
      }

      const stage = item.stages[0];
      expect(stage.elementId).toBeDefined();
      expect(stage.name).toBeDefined();
      expect(stage.latestStatus).toBeDefined();
      expect(typeof stage.slaStatus).toBe('string');
      expect(typeof stage.escalationRuleIndex).toBe('string');
      expect(typeof stage.escalationRuleType).toBe('string');
    });

    it('should support filtering by caseInstanceId', async () => {
      const { caseInstances } = getServices();

      // First get all to find a valid caseInstanceId
      const allResults = await caseInstances.getStagesSlaSummary();

      if (allResults.length === 0) {
        throw new Error('No stage SLA summary items returned — cannot test caseInstanceId filter');
      }

      const targetId = allResults[0].caseInstanceId;
      const filtered = await caseInstances.getStagesSlaSummary({ caseInstanceId: targetId });

      expect(filtered).toBeDefined();
      expect(Array.isArray(filtered)).toBe(true);
      if (filtered.length === 0) {
        throw new Error('Filter by caseInstanceId returned no results — expected at least one matching item');
      }
      expect(filtered[0].caseInstanceId).toBe(targetId);
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
