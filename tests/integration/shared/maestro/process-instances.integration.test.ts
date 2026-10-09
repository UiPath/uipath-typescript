import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  describeIntegration,
  InitMode,
} from '../../config/unified-setup';
import { InstanceStatus } from '../../../../src/models/maestro';
import type { ProcessInstanceExecutionHistoryResponse } from '../../../../src/models/maestro/process-instances.types';

const modes: InitMode[] = ['v0', 'v1'];

// Terminal states in which an instance has stopped mutating and its history is complete.
const SETTLED_STATUSES: ReadonlySet<string> = new Set([
  InstanceStatus.COMPLETED,
  InstanceStatus.FAULTED,
  InstanceStatus.CANCELLED,
]);

const RUNNING_WAIT_MS = 300_000;
// Outlasts the stale Faulted readings that follow a retry
const FAULT_RETRY_COOLDOWN_MS = 20_000;
const STATUS_CHANGE_WAIT_MS = 60_000;

describeIntegration('Maestro Process Instances - Integration Tests', 'both', modes, () => {
  let testInstanceId: string | null = null;
  // Seeded by the pause test and reused by the resume test
  let pausedInstance: { instanceId: string; folderKey: string } | null = null;
  let testFolderKey: string | null = null;

  // Faulting-process instance started at suite start for the retry test. It faults in the
  // background (~15s idle, minutes under full-suite load) while earlier tests run.
  let seededFaultedJobKey: string | null = null;

  // Starts a fresh instance of the deliberately-faulting process and waits until it is
  // Running — pause and cancel are rejected in any other state. Operating only on our own
  // instance keeps the tests safe under parallel runs.
  async function startRunningInstance(purpose: string): Promise<{ instanceId: string; folderKey: string }> {
    const { processes, processInstances } = getServices();
    const config = getTestConfig();

    if (!config.maestroTestProcessKey || !config.folderId || !config.folderKey) {
      throw new Error(
        `MAESTRO_TEST_PROCESS_KEY / folder config not set — cannot seed an instance for ${purpose}`
      );
    }

    const [job] = await processes.start(
      { processKey: config.maestroTestProcessKey },
      { folderId: Number(config.folderId) }
    );

    // The process runs ~15s before it faults. If it faults before the poll catches the
    // brief Running window, retry it: the retried run re-enters Running. The status may
    // keep reading Faulted for a few polls after a retry (propagation lag), so only a
    // Faulted reading that outlasts the cooldown triggers another retry — the deadline
    // bounds a genuinely stuck instance.
    let retryCount = 0;
    let lastRetryAt = 0;
    let lastStatus: string | null = null;
    // PIMS can take several minutes to bring a fresh instance to Running under load
    const runningDeadline = Date.now() + RUNNING_WAIT_MS;
    while (Date.now() < runningDeadline) {
      let status: string | null = null;
      try {
        status = (await processInstances.getById(job.key, config.folderKey)).latestRunStatus;
      } catch {
        // not yet visible in PIMS
      }
      lastStatus = status;

      if (status === InstanceStatus.RUNNING) {
        return { instanceId: job.key, folderKey: config.folderKey };
      }
      if (status === InstanceStatus.FAULTED && Date.now() - lastRetryAt >= FAULT_RETRY_COOLDOWN_MS) {
        // Outside the visibility catch: a failing retry() must propagate, not be
        // silently swallowed and re-attempted every poll
        retryCount++;
        lastRetryAt = Date.now();
        await processInstances.retry(job.key, config.folderKey);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error(
      `Seeded instance ${job.key} did not reach Running within ${RUNNING_WAIT_MS / 1000}s ` +
        `(last status: ${lastStatus ?? 'not visible'}, retries: ${retryCount}) — cannot test ${purpose}`
    );
  }

  // The status lags an accepted pause/resume, so poll until it matches; returns the last
  // status read, letting the caller's assertion report it on timeout
  async function waitForStatus(instanceId: string, folderKey: string, expected: RegExp): Promise<string> {
    const { processInstances } = getServices();
    const deadline = Date.now() + STATUS_CHANGE_WAIT_MS;
    let status = '';
    while (Date.now() < deadline) {
      status = (await processInstances.getById(instanceId, folderKey)).latestRunStatus;
      if (expected.test(status)) {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    return status;
  }

  beforeAll(async () => {
    const { processes, processInstances } = getServices();
    const config = getTestConfig();

    if (!config.maestroTestProcessKey || !config.folderId) {
      return;
    }

    // Reuse an existing Faulted instance when one exists — the retry test consumes its
    // fixture, so a Faulted leftover can only come from an interrupted run, and
    // scavenging it keeps the tenant clean (instances cannot be deleted via API).
    // Only when none exists is a fresh instance seeded.
    const existing = await processInstances.getAll({
      processKey: config.maestroTestProcessKey,
      pageSize: 20,
    });
    // The folder must match the configured one — the retry test reads the instance with
    // config.folderKey, so an orphan from another folder would 404 there
    const orphan = existing.items.find(
      (inst) =>
        inst.latestRunStatus === InstanceStatus.FAULTED && inst.folderKey === config.folderKey
    );
    if (orphan) {
      seededFaultedJobKey = orphan.instanceId;
      return;
    }

    const [job] = await processes.start(
      { processKey: config.maestroTestProcessKey },
      { folderId: Number(config.folderId) }
    );
    seededFaultedJobKey = job.key;
  }, 60_000);

  describe('getAll', () => {
    it('should retrieve all process instances', async () => {
      const { processInstances } = getServices();

      try {
        const result = await processInstances.getAll();

        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);

        // Never select the seeded retry fixture: pausing it stops its execution, so it
        // would never fault and the retry test would time out waiting
        const instance = result.items.find(
          (item) => item.instanceId && item.folderKey && item.instanceId !== seededFaultedJobKey
        );
        if (instance) {
          testInstanceId = instance.instanceId;
          testFolderKey = instance.folderKey;
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

    it('should retrieve instances with limit', async () => {
      const { processInstances } = getServices();

      try {
        const result = await processInstances.getAll({
          pageSize: 5,
        });

        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
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
      const { processInstances } = getServices();

      try {
        const firstPage = await processInstances.getAll({
          pageSize: 2,
        });

        expect(firstPage).toBeDefined();
        expect(firstPage.items).toBeDefined();

        if (firstPage.hasNextPage && firstPage.nextCursor) {
          const secondPage = await processInstances.getAll({
            pageSize: 2,
            cursor: firstPage.nextCursor,
          });

          expect(secondPage).toBeDefined();
          expect(secondPage.items).toBeDefined();
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
    it('should retrieve a specific process instance by ID', async () => {
      if (!testInstanceId || !testFolderKey) {
        throw new Error('No process instance with a folder key available — cannot test getById');
      }

      const { processInstances } = getServices();

      const result = await processInstances.getById(testInstanceId, testFolderKey);

      expect(result).toBeDefined();
      expect(result.instanceId).toBe(testInstanceId);
    });
  });

  describe('Instance lifecycle operations', () => {
    it('should pause a process instance', async () => {
      const { processInstances } = getServices();
      pausedInstance = await startRunningInstance('pause');
      const { instanceId, folderKey } = pausedInstance;

      const result = await processInstances.pause(instanceId, folderKey);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Pausing is transitional, so accept it alongside the settled Paused state
      expect(await waitForStatus(instanceId, folderKey, /paus|suspend/i)).toMatch(/paus|suspend/i);
    }, RUNNING_WAIT_MS + STATUS_CHANGE_WAIT_MS + 60_000);

    it('should resume a paused process instance', async () => {
      if (!pausedInstance) {
        throw new Error('The pause test did not leave a paused instance — cannot test resume');
      }

      const { processInstances } = getServices();
      const { instanceId, folderKey } = pausedInstance;

      const result = await processInstances.resume(instanceId, folderKey);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Resuming is transitional, so accept it alongside the settled Running state.
      // The resumed run faults on its own shortly after, so nothing is left executing.
      expect(await waitForStatus(instanceId, folderKey, /running|active|resum/i)).toMatch(
        /running|active|resum/i
      );
    }, STATUS_CHANGE_WAIT_MS + 60_000);

    it('should cancel a process instance', async () => {
      const { processInstances } = getServices();
      const { instanceId, folderKey } = await startRunningInstance('cancel');

      const result = await processInstances.cancel(instanceId, folderKey);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      const instance = await processInstances.getById(instanceId, folderKey);
      expect(instance.latestRunStatus).toMatch(/cancel|stopped|terminated/i);
      // leave room for the cancel call and verification after the wait-for-Running poll
    }, RUNNING_WAIT_MS + 60_000);
  });

  // Self-seeding: starts a fresh instance of the deliberately-faulting process (faults in
  // ~15s), retries it, then cancels it so nothing keeps executing. Operating only on our
  // own instance makes the test safe when multiple runs execute in parallel.
  describe('retry', () => {
    it('should retry a faulted process instance', async () => {
      const { processes, processInstances } = getServices();
      const config = getTestConfig();

      if (!config.maestroTestProcessKey || !config.folderId || !config.folderKey) {
        throw new Error(
          'MAESTRO_TEST_PROCESS_KEY / folder config not set — cannot seed a faulted instance for retry'
        );
      }

      // Use the instance started in beforeAll — it has been faulting in the background
      // while the earlier tests ran. Fall back to seeding one here if the hook could not.
      let instanceId = seededFaultedJobKey;
      if (!instanceId) {
        const [job] = await processes.start(
          { processKey: config.maestroTestProcessKey },
          { folderId: Number(config.folderId) }
        );
        instanceId = job.key;
      }

      // Check immediately, then poll: faulting takes ~15s on an idle tenant but can take
      // minutes when the full integration suite loads the tenant (e.g. the CI PR gate)
      let faulted = false;
      for (let attempt = 0; attempt < 36; attempt++) {
        try {
          const instance = await processInstances.getById(instanceId, config.folderKey);
          if (instance.latestRunStatus === InstanceStatus.FAULTED) {
            faulted = true;
            break;
          }
        } catch {
          // not yet visible in PIMS
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      if (!faulted) {
        throw new Error('Seeded instance of the faulting process did not fault within 180s');
      }

      const result = await processInstances.retry(instanceId, config.folderKey, {
        comment: 'Integration test retry',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      // Cleanup: cancel the retried (re-running) instance so it does not keep executing.
      // The Retrying→Canceling transition can be briefly invalid, so allow a few attempts.
      let cancelled = false;
      for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        try {
          await processInstances.cancel(instanceId, config.folderKey);
          cancelled = true;
        } catch {
          // transition not yet valid
        }
      }
      if (!cancelled) {
        console.log(`Could not cancel retried instance ${instanceId} — it will fault again on its own`);
      }
    }, 180_000);
  });

  describe('Instance details', () => {
    it('should retrieve process variables', async () => {
      if (!testInstanceId || !testFolderKey) {
        throw new Error('No process instance with a folder key available — cannot test getVariables');
      }

      const { processInstances } = getServices();

      const result = await processInstances.getVariables(testInstanceId, testFolderKey);

      expect(result).toBeDefined();
      expect(result.instanceId).toBe(testInstanceId);
      expect(Array.isArray(result.globalVariables)).toBe(true);
    });

    describe('execution history', () => {
      let executionHistory!: ProcessInstanceExecutionHistoryResponse[];

      beforeAll(async () => {
        if (!testFolderKey) {
          throw new Error('No folder key available — cannot test getExecutionHistory');
        }

        const { processInstances } = getServices();

        // getAll lists newest first, and the newest instance is often one another suite
        // cancelled before it executed a single element, leaving an empty history. Read
        // from a settled instance that has actually run something instead.
        const { items } = await processInstances.getAll({ pageSize: 20 });
        const settled = items.filter(
          (inst) =>
            inst.folderKey === testFolderKey &&
            inst.instanceId !== seededFaultedJobKey &&
            SETTLED_STATUSES.has(inst.latestRunStatus)
        );
        for (const inst of settled.slice(0, 5)) {
          const history = await processInstances.getExecutionHistory(inst.instanceId, inst.folderKey);
          if (history.length > 0) {
            executionHistory = history;
            return;
          }
        }
        throw new Error(
          'No settled process instance with execution history found — cannot test getExecutionHistory'
        );
      }, 60_000);

      it('should retrieve execution history', () => {
        expect(executionHistory).toBeDefined();
        expect(Array.isArray(executionHistory)).toBe(true);

        if (executionHistory.length > 0) {
          const historyItem = executionHistory[0];
          expect(typeof historyItem.id).toBe('string');
          expect(typeof historyItem.traceId).toBe('string');
          expect(typeof historyItem.name).toBe('string');
          expect(typeof historyItem.startedTime).toBe('string');
          expect(historyItem.parentId === null || typeof historyItem.parentId === 'string').toBe(true);
          expect(historyItem.endTime === null || typeof historyItem.endTime === 'string').toBe(true);
        }
      });

      it('should transform execution history fields from PascalCase to camelCase', () => {
        if (executionHistory.length === 0) {
          throw new Error('No execution history available to validate transform');
        }

        const historyItem = executionHistory[0];

        // (a) transformed camelCase fields exist
        expect(historyItem.id).toBeDefined();
        expect(historyItem.traceId).toBeDefined();
        expect(historyItem.name).toBeDefined();
        expect(historyItem.startedTime).toBeDefined();

        // (b) original PascalCase API fields are absent
        expect((historyItem as any).Id).toBeUndefined();
        expect((historyItem as any).TraceId).toBeUndefined();
        expect((historyItem as any).ParentId).toBeUndefined();
        expect((historyItem as any).Name).toBeUndefined();
        expect((historyItem as any).StartTime).toBeUndefined();
        expect((historyItem as any).EndTime).toBeUndefined();
      });
    });
  });

  describe('Instance structure validation', () => {
    it('should have expected fields in instance objects', async () => {
      const { processInstances } = getServices();

      try {
        const result = await processInstances.getAll({
          pageSize: 1,
        });

        if (result.items.length === 0) {
          throw new Error('No process instances available — cannot validate instance structure');
        }

        const instance = result.items[0];

        expect(instance.instanceId).toBeDefined();
        expect(typeof instance.instanceId).toBe('string');

        if (instance.latestRunStatus) {
          expect(typeof instance.latestRunStatus).toBe('string');
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

  afterAll(async () => {
    // Note: We don't cleanup test instances as they may be pre-existing
  });
}, {
  // PIMS answers take up to the 60 s gateway limit on the CI tenant, so the 30 s
  // default fails healthy responses; 90 s covers one slow call plus a follow-up.
  timeout: 90_000,
});
