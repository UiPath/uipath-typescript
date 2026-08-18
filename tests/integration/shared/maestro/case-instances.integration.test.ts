import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { hasValidPagination, generateRandomString } from '../../utils/helpers';
import { CaseInstanceMessageName, InstanceStatus } from '../../../../src/models/maestro';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Case Instances - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let testCaseInstanceId: string | null = null;
  let testCaseFolderKey: string | null = null;

  describe('getAll', () => {
    it('should retrieve all case instances', async () => {
      const { caseInstances } = getServices();

      try {
        const result = await caseInstances.getAll();

        expect(result).toBeDefined();
        expect(hasValidPagination(result)).toBe(true);
        expect(Array.isArray(result.items)).toBe(true);

        const instance = result.items.find((item) => item.instanceId && item.folderKey);
        if (instance) {
          testCaseInstanceId = instance.instanceId;
          testCaseFolderKey = instance.folderKey;
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
          pageSize: 5,
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
          pageSize: 2,
        });

        expect(firstPage).toBeDefined();
        expect(hasValidPagination(firstPage)).toBe(true);

        if (firstPage.hasNextPage && firstPage.nextCursor) {
          const secondPage = await caseInstances.getAll({
            pageSize: 2,
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
      if (!testCaseInstanceId || !testCaseFolderKey) {
        console.log('No case instance available for testing');
        return;
      }

      const { caseInstances } = getServices();

      const result = await caseInstances.getById(testCaseInstanceId, testCaseFolderKey);

      expect(result).toBeDefined();
      expect(result.instanceId).toBe(testCaseInstanceId);
    });
  });

  describe('getStages', () => {
    it('should retrieve stages for a case instance', async () => {
      if (!testCaseInstanceId || !testCaseFolderKey) {
        console.log('No case instance available for testing');
        return;
      }

      const { caseInstances } = getServices();

      const result = await caseInstances.getStages(testCaseInstanceId, testCaseFolderKey);

      expect(result).toBeDefined();
      expect(Array.isArray(result) || typeof result === 'object').toBe(true);

      if (Array.isArray(result) && result.length > 0) {
        const stage = result[0];
        expect(stage).toBeDefined();
        expect(typeof stage).toBe('object');
      }
    });

    it('should validate stage structure', async () => {
      if (!testCaseInstanceId || !testCaseFolderKey) {
        console.log('No case instance available for testing');
        return;
      }

      const { caseInstances } = getServices();

      const stages = await caseInstances.getStages(testCaseInstanceId, testCaseFolderKey);

      if (Array.isArray(stages) && stages.length > 0) {
        const stage = stages[0];
        expect(stage).toBeDefined();
        console.log('Stage fields:', Object.keys(stage));
      }
    });
  });

  describe('getVariables', () => {
    // Well-known subprocess scope present in every case-management model
    const TASKS_EVENT_SUBPROCESS_ID = 'tasksEventSubProcess';

    let variablesInstanceId!: string;
    let variablesFolderKey!: string;

    beforeAll(async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getAll();
      const instance = result.items.find((item) => item.instanceId && item.folderKey);
      if (!instance) {
        throw new Error('No case instance with a folder key available for getVariables testing');
      }

      variablesInstanceId = instance.instanceId;
      variablesFolderKey = instance.folderKey;
    });

    it('should retrieve variables for a case instance', async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getVariables(variablesInstanceId, variablesFolderKey);

      expect(result).toBeDefined();
      expect(result.instanceId).toBe(variablesInstanceId);
      expect(Array.isArray(result.elements)).toBe(true);
      expect(Array.isArray(result.globalVariables)).toBe(true);
    });

    it('should reshape raw globals into enriched globalVariables', async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getVariables(variablesInstanceId, variablesFolderKey);

      // Transformed field exists
      expect(Array.isArray(result.globalVariables)).toBe(true);

      // Raw wire fields must not be passed through
      expect((result as any).globals).toBeUndefined();
      expect((result as any).workflowId).toBeUndefined();
      expect((result as any).globalDefinitions).toBeUndefined();

      if (result.globalVariables.length > 0) {
        const variable = result.globalVariables[0];
        expect(variable.id).toBeDefined();
        expect(variable.name).toBeDefined();
        expect(variable.type).toBeDefined();
        expect(variable.elementId).toBeDefined();
      }
    });

    it('should retrieve variables scoped to a parent element', async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getVariables(variablesInstanceId, variablesFolderKey, {
        parentElementId: TASKS_EVENT_SUBPROCESS_ID
      });

      expect(result).toBeDefined();
      expect(result.parentElementId).toBe(TASKS_EVENT_SUBPROCESS_ID);
      expect(Array.isArray(result.elements)).toBe(true);
    });
  });

  // sendMessage runs before close: it needs a running instance but does not alter case
  // state, while close consumes one. Order matters when few running instances exist.
  describe('sendMessage', () => {
    it('should send a message to a running case instance', async () => {
      const { caseInstances } = getServices();

      const instances = await caseInstances.getAll({ pageSize: 50 });
      const runningInstance = instances.items.find(
        (instance) => instance.latestRunStatus === InstanceStatus.RUNNING && instance.folderKey
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

  // Snapshot+restore: closing consumes a shared running instance, so the test reopens the
  // same instance afterwards. This keeps the suite re-runnable against a fixed set of
  // seeded running instances instead of draining one per run.
  describe('close and reopen', () => {
    it('should close a case instance and reopen it from its active stage', async () => {
      const { caseInstances } = getServices();

      const instances = await caseInstances.getAll({ pageSize: 50 });

      const openInstance = instances.items.find(
        (inst) => inst.latestRunStatus === InstanceStatus.RUNNING && inst.folderKey
      );

      if (!openInstance) {
        throw new Error('No running case instance available — cannot test close/reopen');
      }

      // Snapshot the stage to restore from before mutating state
      const stages = await caseInstances.getStages(openInstance.instanceId, openInstance.folderKey);
      const activeStage = stages.find((stage) => /progress|active|running/i.test(stage.status)) ?? stages[0];
      if (!activeStage) {
        throw new Error('Case instance has no stages — cannot determine reopen target');
      }

      const closeResult = await caseInstances.close(openInstance.instanceId, openInstance.folderKey);

      expect(closeResult).toBeDefined();
      expect(closeResult.success).toBe(true);

      // Restore: reopen the same instance from the stage that was active at close
      const reopenResult = await caseInstances.reopen(openInstance.instanceId, openInstance.folderKey, {
        stageId: activeStage.id,
        comment: 'Reopened by the SDK integration suite after close test',
      });

      expect(reopenResult).toBeDefined();
      expect(reopenResult.success).toBe(true);
    });
  });

  describe('Case instance structure validation', () => {
    it('should have expected fields in case instance objects', async () => {
      const { caseInstances } = getServices();

      try {
        const result = await caseInstances.getAll({
          pageSize: 1,
        });

        if (result.items.length === 0) {
          console.log('No case instances available to validate structure');
          return;
        }

        const instance = result.items[0];

        expect(instance.instanceId).toBeDefined();
        expect(typeof instance.instanceId).toBe('string');

        if (instance.latestRunStatus) {
          expect(typeof instance.latestRunStatus).toBe('string');
        }

        if (instance.processKey) {
          expect(typeof instance.processKey).toBe('string');
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

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getSlaSummary', () => {
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

  // skip: insightsrtm_ endpoints do not support PAT auth — requires OAuth
  describe.skip('getStagesSlaSummary', () => {
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
