import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
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

  // Instance seeded for this run via Orchestrator jobs (see beforeAll). Consumed by the
  // close test or cleaned up in afterAll.
  let seededInstance: { instanceId: string; folderKey: string } | null = null;

  // Self-seeding: a deployed case process is also an Orchestrator release whose release
  // key equals the Maestro processKey, and the started job's key is the case instanceId.
  // Starting one removes the dependency on manually pre-seeded running instances.
  // Returns null when the required config is not set.
  const seedRunningInstance = async (): Promise<{
    instanceId: string;
    folderKey: string;
  } | null> => {
    const { processes, caseInstances } = getServices();
    const config = getTestConfig();

    if (!config.maestroCaseProcessKey || !config.folderId || !config.folderKey) {
      return null;
    }

    const [job] = await processes.start(
      { processKey: config.maestroCaseProcessKey },
      { folderId: Number(config.folderId) }
    );

    // The case instance usually surfaces in PIMS within seconds; the window allows for
    // occasional tenant slowness (polling exits as soon as the instance is Running)
    for (let attempt = 0; attempt < 18; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      try {
        const instance = await caseInstances.getById(job.key, config.folderKey);
        if (instance.latestRunStatus === InstanceStatus.RUNNING) {
          return { instanceId: job.key, folderKey: config.folderKey };
        }
      } catch {
        // not yet visible in PIMS
      }
    }
    throw new Error('Seeded case instance did not reach Running state within 90s');
  };

  // Timer-case instance started at suite start for the reopen test. It completes in the
  // background (~45s) while the earlier tests run, so reopen rarely has to wait.
  let seededCompletedJobKey: string | null = null;

  beforeAll(async () => {
    const { processes } = getServices();
    const config = getTestConfig();

    // Fire-and-forget the reopen fixture first so its completion overlaps the suite
    if (config.maestroCompletedCaseProcessKey && config.folderId) {
      const [job] = await processes.start(
        { processKey: config.maestroCompletedCaseProcessKey },
        { folderId: Number(config.folderId) }
      );
      seededCompletedJobKey = job.key;
    }

    seededInstance = await seedRunningInstance();
    if (!seededInstance) {
      console.log(
        'MAESTRO_TEST_CASE_PROCESS_KEY / folder config not set — running-instance tests ' +
          'will fall back to pre-existing instances'
      );
    }
  }, 120_000);

  /** Prefers the instance seeded for this run; falls back to any running instance. */
  const resolveRunningInstance = async (): Promise<{
    instanceId: string;
    folderKey: string;
  } | null> => {
    if (seededInstance) {
      return seededInstance;
    }
    const { caseInstances } = getServices();
    const instances = await caseInstances.getAll({ pageSize: 20 });
    const found = instances.items.find(
      (inst) => inst.latestRunStatus === InstanceStatus.RUNNING && inst.folderKey
    );
    return found ? { instanceId: found.instanceId, folderKey: found.folderKey } : null;
  };

  describe('getAll', () => {
    it('should retrieve all case instances', async () => {
      const { caseInstances } = getServices();

      try {
        // Keep the page small: getAll enriches every returned instance with its case JSON
        // (one extra API call each), so unbounded pages get slower as history accumulates.
        const result = await caseInstances.getAll({ pageSize: 10 });

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

      const result = await caseInstances.getAll({ pageSize: 10 });
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

  // pause must target a FRESHLY started instance: once the human task fully activates,
  // PIMS keeps the instance in Pausing until the task settles (observed 90s+), while a
  // fresh instance pauses within seconds. So this test seeds and cleans up its own
  // instance instead of sharing the run's seeded one.
  describe('pause and resume', () => {
    it('should pause a running case instance and resume it', async () => {
      const { caseInstances } = getServices();

      const target = await seedRunningInstance();
      if (!target) {
        throw new Error(
          'MAESTRO_TEST_CASE_PROCESS_KEY / folder config not set — cannot seed an instance for pause/resume'
        );
      }

      const pauseResult = await caseInstances.pause(target.instanceId, target.folderKey);
      expect(pauseResult.success).toBe(true);

      // Pausing is asynchronous; wait for the Paused state before resuming
      let lastStatus = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const current = await caseInstances.getById(target.instanceId, target.folderKey);
        lastStatus = current.latestRunStatus;
        if (lastStatus === InstanceStatus.PAUSED) {
          break;
        }
      }
      expect(lastStatus).toBe(InstanceStatus.PAUSED);

      const resumeResult = await caseInstances.resume(target.instanceId, target.folderKey);
      expect(resumeResult.success).toBe(true);

      // Cleanup: this test seeded its own instance
      await caseInstances.close(target.instanceId, target.folderKey);
    }, 180_000);
  });

  // Runs after pause/resume (see note there): the ad-hoc trigger spawns an in-flight task
  // on the instance, which blocks a subsequent pause from completing.
  describe('sendMessage', () => {
    it('should send a message to a running case instance', async () => {
      const { caseInstances } = getServices();

      const runningInstance = await resolveRunningInstance();

      if (!runningInstance) {
        throw new Error('No running case instance available — cannot test sendMessage');
      }

      // Publishing an ad-hoc trigger with an unmatched task name exercises the endpoint,
      // auth, folder-key header, and body format without completing or closing the case.
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

  describe('close', () => {
    it('should close a running case instance', async () => {
      const { caseInstances } = getServices();

      const target = await resolveRunningInstance();

      if (!target) {
        throw new Error('No running case instance available — cannot test close');
      }

      const result = await caseInstances.close(target.instanceId, target.folderKey);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      if (seededInstance && seededInstance.instanceId === target.instanceId) {
        // Consumed the seeded instance; afterAll must not close it again
        seededInstance = null;
      }
    });
  });

  // Reopen requires a Completed instance (close produces Cancelled, which PIMS rejects),
  // so this test seeds one from the auto-completing case process (runs to Completed
  // without human interaction), reopens that same instance, and closes it afterwards.
  describe('reopen', () => {
    it('should reopen a completed case instance from a stage', async () => {
      const { processes, caseInstances } = getServices();
      const config = getTestConfig();

      if (!config.maestroCompletedCaseProcessKey || !config.folderId || !config.folderKey) {
        throw new Error(
          'MAESTRO_TEST_COMPLETED_CASE_PROCESS_KEY / folder config not set — cannot seed a completed instance for reopen'
        );
      }

      // Use the instance started in beforeAll — it has been completing in the background
      // while the earlier tests ran, so this usually needs no waiting at all.
      let instanceId = seededCompletedJobKey;
      if (!instanceId) {
        const [job] = await processes.start(
          { processKey: config.maestroCompletedCaseProcessKey },
          { folderId: Number(config.folderId) }
        );
        instanceId = job.key;
      }

      // Check immediately, then poll only if it has not completed yet
      let completed = false;
      for (let attempt = 0; attempt < 24; attempt++) {
        try {
          const instance = await caseInstances.getById(instanceId, config.folderKey);
          if (instance.latestRunStatus === InstanceStatus.COMPLETED) {
            completed = true;
            break;
          }
        } catch {
          // not yet visible in PIMS
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      if (!completed) {
        throw new Error('Seeded auto-completing case instance did not complete within 120s');
      }

      const stages = await caseInstances.getStages(instanceId, config.folderKey);
      expect(stages.length).toBeGreaterThan(0);

      const result = await caseInstances.reopen(instanceId, config.folderKey, {
        stageId: stages[0].id,
        comment: 'Reopened by the SDK integration suite',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Cleanup: close the reopened instance — reopened instances do NOT re-complete on
      // their own, and letting them accumulate saturates the tenant's execution queue.
      await caseInstances.close(instanceId, config.folderKey);
    }, 180_000);
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
    // Close the seeded instance unless the close test already consumed it.
    // Pre-existing instances are never cleaned up here.
    if (!seededInstance) return;
    const { caseInstances } = getServices();
    await caseInstances.close(seededInstance.instanceId, seededInstance.folderKey);
    seededInstance = null;
  });
});
