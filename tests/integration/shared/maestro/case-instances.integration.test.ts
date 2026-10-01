import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  describeIntegration,
  InitMode,
} from '../../config/unified-setup';
import { hasValidPagination, generateRandomString } from '../../utils/helpers';
import { CaseInstanceMessageName, InstanceStatus } from '../../../../src/models/maestro';

const modes: InitMode[] = ['v0', 'v1'];

// A full integration leg finishes well inside an hour, so a Running fixture instance
// older than this cannot be held by a concurrent run.
const ORPHAN_MIN_AGE_MS = 60 * 60 * 1000;

describeIntegration('Maestro Case Instances - Integration Tests', 'both', modes, (_mode, authMode) => {
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

    // Reuse an existing Running instance of the fixture process before starting a new
    // one — interrupted runs leave them Running indefinitely (the human task never
    // completes), so scavenging them curbs instance growth in the tenant, where
    // terminal instances cannot be deleted via API. Only instances older than any
    // run still in flight qualify: a younger Running instance belongs to a concurrent
    // leg, which will pause and close it under us (observed live as
    // "Canceling->Pausing is not a valid state transition").
    const orphanMinAge = Date.now() - ORPHAN_MIN_AGE_MS;
    const existing = await caseInstances.getAll({
      processKey: config.maestroCaseProcessKey,
      pageSize: 20,
    });
    const runningOrphan = existing.items.find(
      (inst) =>
        inst.latestRunStatus === InstanceStatus.RUNNING &&
        inst.folderKey === config.folderKey &&
        new Date(inst.startedTime).getTime() < orphanMinAge
    );
    if (runningOrphan) {
      return { instanceId: runningOrphan.instanceId, folderKey: runningOrphan.folderKey };
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
  // True when the key above was found rather than started: every concurrent run sees
  // the same Completed orphan, so another leg may reopen and close it before we do.
  let seededCompletedIsShared = false;

  beforeAll(async () => {
    const { processes, caseInstances } = getServices();
    const config = getTestConfig();

    // Provide the reopen fixture first so any completion wait overlaps the suite.
    // Reuse a Completed timer instance from an interrupted run before starting a new
    // one — reuse keeps instance growth down, and an existing Completed instance means
    // the reopen test has zero wait.
    if (config.maestroCompletedCaseProcessKey && config.folderId && config.folderKey) {
      const existing = await caseInstances.getAll({
        processKey: config.maestroCompletedCaseProcessKey,
        pageSize: 20,
      });
      const completedOrphan = existing.items.find(
        (inst) =>
          inst.latestRunStatus === InstanceStatus.COMPLETED &&
          inst.folderKey === config.folderKey
      );
      if (completedOrphan) {
        seededCompletedJobKey = completedOrphan.instanceId;
        seededCompletedIsShared = true;
      } else {
        const [job] = await processes.start(
          { processKey: config.maestroCompletedCaseProcessKey },
          { folderId: Number(config.folderId) }
        );
        seededCompletedJobKey = job.key;
      }
    }

    seededInstance = await seedRunningInstance();
    if (!seededInstance) {
      console.log(
        'MAESTRO_TEST_CASE_PROCESS_KEY / folder config not set — running-instance tests ' +
          'will fall back to pre-existing instances'
      );
    }
  }, 120_000);

  /**
   * Prefers the instance seeded for this run; falls back to any running instance.
   * The seeded instance can die on its own between tests (observed live: a transient
   * platform fault moved it Running→Faulted, making the next pause fail with an invalid
   * state transition), so its status is re-verified on every resolve and a replacement
   * is seeded when it is no longer Running.
   */
  const resolveRunningInstance = async (): Promise<{
    instanceId: string;
    folderKey: string;
  } | null> => {
    const { caseInstances } = getServices();

    if (seededInstance) {
      const current = await caseInstances.getById(
        seededInstance.instanceId,
        seededInstance.folderKey
      );
      if (current.latestRunStatus === InstanceStatus.RUNNING) {
        return seededInstance;
      }
      seededInstance = await seedRunningInstance();
      if (seededInstance) {
        return seededInstance;
      }
    }

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
        throw error;
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
        throw error;
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
        throw error;
      }
    });
  });

  describe('getById', () => {
    it('should retrieve a specific case instance by ID', async () => {
      if (!testCaseInstanceId || !testCaseFolderKey) {
        throw new Error('No case instance with a folder key available — cannot test getById');
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
        throw new Error('No case instance with a folder key available — cannot test getStages');
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
        throw new Error('No case instance with a folder key available — cannot validate stage structure');
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
      // getAll enriches each instance with its case JSON (one call each); the ten
      // lookups overran 60 s once with no other run on the tenant
    }, 90_000);

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

  // pause → resume is self-restoring: the instance ends Running again for later tests.
  // Resume is valid from both Pausing and Paused (verified against the live API), so the
  // test does not wait for the Pausing→Paused transition — that transition is
  // load-dependent and can hang while the case's human task is active.
  describe('pause and resume', () => {
    it('should pause a running case instance and resume it', async () => {
      const { caseInstances } = getServices();

      const target = await resolveRunningInstance();
      if (!target) {
        throw new Error('No running case instance available — cannot test pause/resume');
      }

      const pauseResult = await caseInstances.pause(target.instanceId, target.folderKey);
      expect(pauseResult.success).toBe(true);

      // The pause takes effect asynchronously: status leaves Running for Pausing/Paused
      let pausedStatus = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        const current = await caseInstances.getById(target.instanceId, target.folderKey);
        pausedStatus = current.latestRunStatus;
        if (pausedStatus === InstanceStatus.PAUSED || pausedStatus === InstanceStatus.PAUSING) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      expect([InstanceStatus.PAUSED, InstanceStatus.PAUSING]).toContain(pausedStatus);

      const resumeResult = await caseInstances.resume(target.instanceId, target.folderKey);
      expect(resumeResult.success).toBe(true);

      // The instance must return to Running so later tests can keep using it. A resume
      // issued while the pause is still settling (status Pausing) is accepted but can be
      // lost — the pause completes afterwards and wins, leaving the instance Paused
      // (observed live: success=true resume, then Paused for 60s+). When the status
      // settles on Paused without running again, re-issue the resume: it is idempotent
      // from Paused and no longer races the pause transition.
      let resumedStatus = '';
      for (let attempt = 0; attempt < 30; attempt++) {
        const current = await caseInstances.getById(target.instanceId, target.folderKey);
        resumedStatus = current.latestRunStatus;
        if (resumedStatus === InstanceStatus.RUNNING) {
          break;
        }
        // On every 5th poll that reads Paused, assume the earlier resume was lost and
        // re-issue it (a trailing re-issue also restores the shared instance for later
        // tests even when this assertion is about to fail)
        if (resumedStatus === InstanceStatus.PAUSED && attempt % 5 === 4) {
          await caseInstances.resume(target.instanceId, target.folderKey);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      expect(resumedStatus).toBe(InstanceStatus.RUNNING);
    }, 120_000);
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
      // 120s: resolveRunningInstance may re-seed a dead fixture (up to ~90s)
    }, 120_000);
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
      // 120s: resolveRunningInstance may re-seed a dead fixture (up to ~90s)
    }, 120_000);
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

      const completedProcessKey = config.maestroCompletedCaseProcessKey;
      const folderId = Number(config.folderId);
      const folderKey = config.folderKey;

      const startOwnInstance = async (): Promise<string> => {
        const [job] = await processes.start({ processKey: completedProcessKey }, { folderId });
        return job.key;
      };

      // Use the instance from beforeAll — it has been completing in the background
      // while the earlier tests ran, so this usually needs no waiting at all. A found
      // (shared) orphan can be taken by a concurrent leg between beforeAll and here:
      // it then reads Running/Canceling/Cancelled instead of Completed, or the reopen
      // itself is rejected. Either way we switch to an instance of our own and wait
      // for that one; a reopen failure on our own instance is real and propagates.
      let shared = seededCompletedIsShared && seededCompletedJobKey !== null;
      let instanceId = seededCompletedJobKey ?? (await startOwnInstance());
      console.log(`reopen fixture: ${shared ? 'shared Completed orphan' : 'own instance'} ${instanceId}`);

      // Completion takes ~45s idle but the execution engine stalls for minutes under
      // load — sized to the same 180s ceiling the retry test uses for the fault wait.
      const deadline = Date.now() + 180_000;
      let result: Awaited<ReturnType<typeof caseInstances.reopen>> | null = null;
      while (result === null) {
        let status: string | null = null;
        try {
          status = (await caseInstances.getById(instanceId, folderKey)).latestRunStatus;
        } catch (error) {
          // not yet visible in PIMS, or PIMS answering 5xx; either way keep polling
          console.warn(`reopen fixture ${instanceId} not readable yet:`, error);
        }

        if (status === InstanceStatus.COMPLETED) {
          const stages = await caseInstances.getStages(instanceId, folderKey);
          expect(stages.length).toBeGreaterThan(0);
          try {
            result = await caseInstances.reopen(instanceId, folderKey, {
              stageId: stages[0].id,
              comment: 'Reopened by the SDK integration suite',
            });
            break;
          } catch (error) {
            if (!shared) throw error;
            console.warn(`Shared Completed instance ${instanceId} was claimed by another run; seeding our own:`, error);
          }
        } else if (shared && status !== null) {
          console.warn(`Shared Completed instance ${instanceId} now reads ${status}; seeding our own`);
        } else if (status === InstanceStatus.CANCELLED || status === InstanceStatus.FAULTED) {
          throw new Error(`Seeded auto-completing case instance ended ${status} instead of Completed`);
        }

        if (shared && status !== null) {
          shared = false;
          instanceId = await startOwnInstance();
          continue;
        }

        if (Date.now() > deadline) {
          throw new Error(
            `Seeded auto-completing case instance ${instanceId} did not complete within 180s (last status: ${status ?? 'unreadable'})`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Cleanup: close the reopened instance — reopened instances do NOT re-complete on
      // their own, and letting them accumulate saturates the tenant's execution queue.
      await caseInstances.close(instanceId, folderKey);
    }, 240_000);
  });

  describe('Case instance structure validation', () => {
    it('should have expected fields in case instance objects', async () => {
      const { caseInstances } = getServices();

      try {
        const result = await caseInstances.getAll({
          pageSize: 1,
        });

        if (result.items.length === 0) {
          throw new Error('No case instances available — cannot validate instance structure');
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
        throw error;
      }
    });
  });

  // insightsrtm_ rejects PAT — user-token cell only. Its SLA aggregations routinely take
  // 15–30s+ server-side (measured 16s, 23s, >30s across CI runs), so the tests carry a
  // 90s budget like the schema DDL tests.
  describe.skipIf(authMode !== 'user')('getSlaSummary', () => {
    // skip: slaDueTime comes back empty on this tenant's SLA rows, so the ISO
    // timestamp assertion cannot pass.
    it.skip('should retrieve SLA summary for case instances', async () => {
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
    }, 90_000);

    it('should support pagination with pageSize', async () => {
      const { caseInstances } = getServices();

      const result = await caseInstances.getSlaSummary({ pageSize: 5 });

      expect(result).toBeDefined();
      expect(result.items.length).toBeLessThanOrEqual(5);
    }, 90_000);
  });

  // insightsrtm_ rejects PAT — user-token cell only.
  describe.skipIf(authMode !== 'user')('getStagesSlaSummary', () => {
    // skip: the stages SLA aggregation now takes 43-60 s server-side on this tenant
    // (measured across 12 calls on 2026-10-01; p50 was 26 s a week earlier) and the
    // gateway answers 504 at 60 s, so no client budget can make it pass. Re-enable
    // once Insights RTM brings the aggregation back under the gateway limit.
    it.skip('should retrieve stages SLA summary for case instances', async () => {
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
    }, 90_000);

    // skip: same 60 s gateway ceiling as above, and this test calls the endpoint twice.
    it.skip('should support filtering by caseInstanceId', async () => {
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
    }, 90_000);
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
