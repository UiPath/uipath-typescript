import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, describeIntegration, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';
import { isNotFoundError } from '../../../../src/core/errors';
import {
  CaseApp,
  CaseAppElementType,
  CaseInstanceMessageName,
  InstanceStatus,
} from '../../../../src/services/maestro/case-app';
import type { CaseAppInstanceGetResponse } from '../../../../src/models/maestro';

const modes: InitMode[] = ['v1'];

const POLL_INTERVAL_MS = 5000;
const POLL_ATTEMPTS = 36;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 'user': the v3 routes authorize through the caller's Case persona grants, and the grant lookup
// fails closed with 403 for a PAT, so this suite runs under the user token only.
describeIntegration('Maestro Case App - Integration Tests', 'user', modes, () => {
  let caseApp!: CaseApp;
  let folderKey!: string;
  let instance!: CaseAppInstanceGetResponse;

  // Running instance started for this run; consumed by the close test or closed in afterAll.
  let seededInstanceId: string | null = null;
  // Auto-completing instance started in beforeAll so it completes while the earlier tests run.
  let completedInstanceId: string | null = null;

  const waitForStatus = async (instanceId: string, status: InstanceStatus): Promise<void> => {
    const { caseInstances } = getServices();
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
    const service = getServices().caseApp;
    if (!service) {
      throw new Error('CaseApp service is not registered for this init mode');
    }
    caseApp = service;

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

    const result = await caseApp.getAll(folderKey, { processKey: config.maestroCaseProcessKey, pageSize: 50 });
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
  });

  describe('getStages', () => {
    it('should return the stages of the case instance', async () => {
      const result = await caseApp.getStages(instance.instanceId, folderKey);

      expect(result.caseInstanceId).toBe(instance.instanceId);
      expect(Array.isArray(result.stages)).toBe(true);
    });
  });

  describe('getSlaSummary', () => {
    it('should return the case-level SLA summary', async () => {
      const result = await caseApp.getSlaSummary(instance.instanceId, folderKey);

      expect(result.caseInstanceId).toBe(instance.instanceId);
      expect(result.instanceStatus).toBeDefined();
      expect((result as unknown as Record<string, unknown>).externalId).toBeUndefined();
    });
  });

  describe('getCaseJson', () => {
    it('should return the case plan as an object', async () => {
      const result = await caseApp.getCaseJson(instance.instanceId, folderKey);

      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });
  });

  describe('getElementExecutions', () => {
    it('should return the timeline with SDK time field names', async () => {
      const result = await caseApp.getElementExecutions(instance.instanceId, folderKey);

      expect(result.instanceId).toBe(instance.instanceId);
      expect(result.startedTime).toBeDefined();
      expect((result as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      result.elementExecutions.forEach(execution => {
        expect((execution as unknown as Record<string, unknown>).startedTimeUtc).toBeUndefined();
      });
    });

    it('should accept an element-type filter', async () => {
      const result = await caseApp.getElementExecutions(instance.instanceId, folderKey, {
        elementTypes: [CaseAppElementType.Hitl],
      });

      expect(Array.isArray(result.elementExecutions)).toBe(true);
    });
  });

  describe('getIncidents', () => {
    it('should return an array of incidents', async () => {
      const result = await caseApp.getIncidents(instance.instanceId, folderKey);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(incident => {
        expect(incident.errorTime).toBeDefined();
        expect((incident as unknown as Record<string, unknown>).errorTimeUtc).toBeUndefined();
      });
    });
  });

  describe('getAdhocTasks', () => {
    it('should return the triggerable ad-hoc tasks grouped by stage', async () => {
      const result = await caseApp.getAdhocTasks(instance.instanceId, folderKey);

      expect(Array.isArray(result)).toBe(true);
      result.forEach(stage => expect(Array.isArray(stage.tasks)).toBe(true));
    });
  });

  // An unmatched name reaches the route, auth, folder header and body parsing without starting
  // any work on the case, which keeps the instance usable by the close test below.
  describe('triggerAdhocTask', () => {
    it('should reject a task name the case plan does not define', async () => {
      await expect(
        caseApp.triggerAdhocTask(instance.instanceId, folderKey, `sdk-it-${generateRandomString(8)}`)
      ).rejects.toSatisfy(isNotFoundError);
    });
  });

  describe('selectStage', () => {
    it('should reject a stage name the case plan does not define', async () => {
      await expect(
        caseApp.selectStage(instance.instanceId, folderKey, `sdk-it-${generateRandomString(8)}`)
      ).rejects.toSatisfy(isNotFoundError);
    });
  });

  describe('sendMessage', () => {
    it('should deliver an ad-hoc trigger message to a running case instance', async () => {
      const result = await caseApp.sendMessage(
        instance.instanceId,
        folderKey,
        CaseInstanceMessageName.UserAdhocTrigger,
        { itemData: { taskNames: [`sdk-it-${generateRandomString(8)}`] } }
      );

      expect(result.id).toBeDefined();
    });
  });

  describe('close', () => {
    it('should close a running case instance', async () => {
      if (!seededInstanceId) {
        throw new Error('No seeded running case instance to close');
      }

      const result = await caseApp.close(seededInstanceId, folderKey, { comment: 'Closed by the SDK integration suite' });

      expect(result.instanceId).toBe(seededInstanceId);
      expect([InstanceStatus.CANCELING, InstanceStatus.CANCELLED]).toContain(result.status);
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

      const { stages } = await caseApp.getStages(completedInstanceId, folderKey);
      if (stages.length === 0) {
        throw new Error('Completed case instance has no stages to reopen from');
      }

      const result = await caseApp.reopen(completedInstanceId, folderKey, stages[0].elementId, {
        comment: 'Reopened by the SDK integration suite',
      });

      expect(result.instanceId).toBe(completedInstanceId);
      expect(result.status).toBeDefined();

      // Reopened instances do not re-complete on their own; close it so they don't accumulate.
      await caseApp.close(completedInstanceId, folderKey);
      completedInstanceId = null;
    }, 240_000);
  });

  afterAll(async () => {
    if (!seededInstanceId) return;
    await caseApp.close(seededInstanceId, folderKey);
    seededInstanceId = null;
  });
});
