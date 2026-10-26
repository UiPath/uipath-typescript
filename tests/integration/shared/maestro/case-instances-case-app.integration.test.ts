import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';
import { isNotFoundError } from '../../../../src/core/errors';
import {
  CaseInstances,
  CaseInstanceElementType,
  CaseInstanceMessageName,
  InstanceStatus,
} from '../../../../src/services/maestro/cases';
import type { CaseInstanceGetResponse } from '../../../../src/models/maestro';

const modes: InitMode[] = ['v1'];

const POLL_INTERVAL_MS = 5000;
const POLL_ATTEMPTS = 36;

/** Prefix for task, stage and message names the case plan does not define */
const UNKNOWN_NAME_PREFIX = 'sdk-it-';
const CLOSE_COMMENT = 'Closed by the SDK integration suite';
const REOPEN_COMMENT = 'Reopened by the SDK integration suite';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 'user': the Case App routes authorize through the caller's Case persona grants, and the grant lookup
// fails closed with 403 for a PAT, so this suite runs under the user token only.
//
// skip: the CI integration user holds no Case persona grants in the test tenant, so getAll returns
// no instances and every write is rejected with 403. Re-enable once that user is assigned a Case
// persona (Cases.View, ViewSummary, RunAdhocTasks, SelectStage, Close, Reopen) on the
// MAESTRO_TEST_CASE_PROCESS_KEY and MAESTRO_TEST_COMPLETED_CASE_PROCESS_KEY processes.
describeIntegration('Maestro Case Instances (Case App routes) - Integration Tests', 'user', modes, () => {
  // Folder-permission service for status polling and cleanup, which have no Case App route.
  let caseInstances!: CaseInstances;
  let caseApp!: CaseInstances;
  let folderKey!: string;
  let instance!: CaseInstanceGetResponse;

  // Running instance started for this run; consumed by the close test or closed in afterAll.
  let seededInstanceId: string | null = null;
  // Auto-completing instance started in beforeAll so it completes while the earlier tests run.
  let completedInstanceId: string | null = null;
  // Set once reopen succeeds, so afterAll closes it if the test fails before its own close.
  let reopenedInstanceId: string | null = null;

  const waitForStatus = async (instanceId: string, status: InstanceStatus): Promise<void> => {
    for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
      try {
        const current = await caseInstances.getById(instanceId, folderKey);
        if (current.latestRunStatus === status) return;
      } catch {
        // not yet visible in PIMS
      }
      await sleep(POLL_INTERVAL_MS);
    }
    throw new Error(`Case instance ${instanceId} did not reach ${status} within 180s`);
  };

  beforeAll(async () => {
    const services = getServices();
    caseInstances = services.caseInstances;
    caseApp = new CaseInstances(services.sdk, { useCaseAppRoutes: true });

    const config = getTestConfig();
    if (!config.folderKey || !config.folderId || !config.maestroCaseProcessKey || !config.maestroCompletedCaseProcessKey) {
      throw new Error(
        'INTEGRATION_TEST_FOLDER_KEY, folder id, MAESTRO_TEST_CASE_PROCESS_KEY and ' +
          'MAESTRO_TEST_COMPLETED_CASE_PROCESS_KEY are required for Case App integration tests'
      );
    }
    folderKey = config.folderKey;

    const { processes } = getServices();
    const [completedJob] = await processes.start(
      { processKey: config.maestroCompletedCaseProcessKey },
      { folderId: Number(config.folderId) }
    );
    completedInstanceId = completedJob.key;

    const [runningJob] = await processes.start(
      { processKey: config.maestroCaseProcessKey },
      { folderId: Number(config.folderId) }
    );
    seededInstanceId = runningJob.key;
    await waitForStatus(seededInstanceId, InstanceStatus.RUNNING);

    const result = await caseApp.getAll({ folderKey, processKey: config.maestroCaseProcessKey, pageSize: 50 });
    const seeded = result.items.find(item => item.instanceId === seededInstanceId);
    if (!seeded) {
      throw new Error('Seeded case instance is not visible to this credential through getAll');
    }
    instance = seeded;
  }, 240_000);

  describe('getAll', () => {
    it('should return case instances with SDK field names', async () => {
      expect(instance.instanceId).toBe(seededInstanceId);
      expect(instance.folderKey).toBe(folderKey);
      expect(instance.startedTime).toBeDefined();
      expect((instance as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      expect((instance as unknown as Record<string, unknown>).externalId).toBeUndefined();
    });

    it('should accept the status filter', async () => {
      const result = await caseApp.getAll({ folderKey, statuses: [InstanceStatus.RUNNING], pageSize: 10 });

      result.items.forEach(item => expect(item.latestRunStatus).toBe(InstanceStatus.RUNNING));
    });
  });

  describe('getStagesForCaseApp', () => {
    it('should return the stages of the case instance', async () => {
      const result = await caseApp.getStagesForCaseApp(instance.instanceId, folderKey);

      expect(result.caseInstanceId).toBe(instance.instanceId);
      expect(Array.isArray(result.stages)).toBe(true);
    });
  });

  describe('getSlaSummaryForCaseApp', () => {
    it('should return the case-level SLA summary', async () => {
      const result = await caseApp.getSlaSummaryForCaseApp(instance.instanceId, folderKey);

      expect(result.caseInstanceId).toBe(instance.instanceId);
      expect(result.instanceStatus).toBeDefined();
      expect((result as unknown as Record<string, unknown>).externalId).toBeUndefined();
    });
  });

  describe('getCaseJsonForCaseApp', () => {
    it('should return the case plan as an object', async () => {
      const result = await caseApp.getCaseJsonForCaseApp(instance.instanceId, folderKey);

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });
  });

  describe('getExecutionHistory', () => {
    it('should return the timeline with SDK time field names', async () => {
      const result = await caseApp.getExecutionHistory(instance.instanceId, folderKey);

      expect(result.instanceId).toBe(instance.instanceId);
      expect(result.startedTime).toBeDefined();
      expect((result as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      result.elementExecutions.forEach(execution => {
        expect((execution as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      });
    });

    it('should accept an element-type filter', async () => {
      const result = await caseApp.getExecutionHistory(instance.instanceId, folderKey, {
        elementTypes: [CaseInstanceElementType.Hitl],
      });

      expect(Array.isArray(result.elementExecutions)).toBe(true);
    });
  });

  describe('getIncidentsForCaseApp', () => {
    it('should return an array of incidents', async () => {
      const result = await caseApp.getIncidentsForCaseApp(instance.instanceId, folderKey);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(incident => {
        expect(incident.errorTime).toBeDefined();
        expect((incident as unknown as Record<string, unknown>).errorTimeUtc).toBeUndefined();
      });
    });
  });

  describe('getAdhocTasksForCaseApp', () => {
    it('should return the triggerable ad-hoc tasks grouped by stage', async () => {
      const result = await caseApp.getAdhocTasksForCaseApp(instance.instanceId, folderKey);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(stage => expect(Array.isArray(stage.tasks)).toBe(true));
    });
  });

  // An unmatched name reaches the route, auth, folder header and body parsing without starting
  // any work on the case, which keeps the instance usable by the close test below.
  describe('triggerAdhocTaskForCaseApp', () => {
    it('should reject a task name the case plan does not define', async () => {
      await expect(
        caseApp.triggerAdhocTaskForCaseApp(instance.instanceId, folderKey, `${UNKNOWN_NAME_PREFIX}${generateRandomString(8)}`)
      ).rejects.toSatisfy(isNotFoundError);
    });
  });

  describe('selectStageForCaseApp', () => {
    it('should reject a stage name the case plan does not define', async () => {
      await expect(
        caseApp.selectStageForCaseApp(instance.instanceId, folderKey, `${UNKNOWN_NAME_PREFIX}${generateRandomString(8)}`)
      ).rejects.toSatisfy(isNotFoundError);
    });
  });

  describe('getStages', () => {
    it('should build the stages from the Case App routes', async () => {
      const stages = await caseApp.getStages(instance.instanceId, folderKey);

      expect(stages.length).toBeGreaterThan(0);
      stages.forEach(stage => expect(stage.id).toBeDefined());
    });
  });

  describe('sendMessage', () => {
    it('should deliver an ad-hoc trigger message to a running case instance', async () => {
      await expect(
        caseApp.sendMessage(instance.instanceId, folderKey, CaseInstanceMessageName.UserAdhocTrigger, {
          itemData: { taskNames: [`${UNKNOWN_NAME_PREFIX}${generateRandomString(8)}`] },
        })
      ).resolves.toBeUndefined();
    });
  });

  describe('close', () => {
    it('should close a running case instance', async () => {
      if (!seededInstanceId) {
        throw new Error('No seeded running case instance to close');
      }

      const result = await caseApp.close(seededInstanceId, folderKey, { comment: CLOSE_COMMENT });

      expect(result.data.instanceId).toBe(seededInstanceId);
      expect([InstanceStatus.CANCELING, InstanceStatus.CANCELLED]).toContain(result.data.status);
      expect(typeof result.data.isCompleted).toBe('boolean');
      seededInstanceId = null;
    });
  });

  // Reopen accepts only Completed cases (close produces Cancelled), so it uses the
  // auto-completing instance started in beforeAll, and closes it afterwards.
  describe('reopen', () => {
    it('should reopen a completed case instance from a stage', async () => {
      if (!completedInstanceId) {
        throw new Error('No auto-completing case instance was started');
      }
      await waitForStatus(completedInstanceId, InstanceStatus.COMPLETED);

      const { stages } = await caseApp.getStagesForCaseApp(completedInstanceId, folderKey);
      if (stages.length === 0) {
        throw new Error('Completed case instance has no stages to reopen from');
      }

      const result = await caseApp.reopen(completedInstanceId, folderKey, {
        stageId: stages[0].elementId,
        comment: REOPEN_COMMENT,
      });

      reopenedInstanceId = completedInstanceId;
      completedInstanceId = null;
      expect(result.data.instanceId).toBe(reopenedInstanceId);
      expect(result.data.status).toBeDefined();

      // Reopened instances do not re-complete on their own; close it so they don't accumulate.
      await caseApp.close(reopenedInstanceId, folderKey);
      reopenedInstanceId = null;
    }, 240_000);
  });

  // Cleanup goes through the v1 close, which folder permissions authorize, so a run that fails
  // for lack of Case grants still does not leave an instance running. A still-Completed instance
  // needs no cleanup.
  afterAll(async () => {
    for (const instanceId of [seededInstanceId, reopenedInstanceId]) {
      if (instanceId) await caseInstances.close(instanceId, folderKey);
    }
    seededInstanceId = null;
    reopenedInstanceId = null;
  });
}, { skip: true });
