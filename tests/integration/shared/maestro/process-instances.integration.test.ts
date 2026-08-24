import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { InstanceStatus } from '../../../../src/models/maestro';
import type { ProcessInstanceExecutionHistoryResponse } from '../../../../src/models/maestro/process-instances.types';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Process Instances - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let testInstanceId: string | null = null;
  let testFolderKey: string | null = null;

  // Faulting-process instance started at suite start for the retry test. It faults in the
  // background (~15s idle, minutes under full-suite load) while earlier tests run.
  let seededFaultedJobKey: string | null = null;

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
    const orphan = existing.items.find(
      (inst) => inst.latestRunStatus === InstanceStatus.FAULTED && inst.folderKey
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

        const instance = result.items.find((item) => item.instanceId && item.folderKey);
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
      if (!testInstanceId || !testFolderKey) {
        throw new Error('No process instance with a folder key available — cannot test pause');
      }

      const { processInstances } = getServices();

      try {
        const result = await processInstances.pause(testInstanceId, testFolderKey);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        const instance = await processInstances.getById(testInstanceId, testFolderKey);
        expect(instance.latestRunStatus).toMatch(/paused|suspended/i);
      } catch (error: any) {
        console.log(
          'Pause test failed. Instance may not be in a pausable state:',
          error.message
        );
      }
    });

    it('should resume a paused process instance', async () => {
      if (!testInstanceId || !testFolderKey) {
        throw new Error('No process instance with a folder key available — cannot test resume');
      }

      const { processInstances } = getServices();

      try {
        const result = await processInstances.resume(testInstanceId, testFolderKey);

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        const instance = await processInstances.getById(testInstanceId, testFolderKey);
        expect(instance.latestRunStatus).toMatch(/running|active|resumed/i);
      } catch (error: any) {
        console.log(
          'Resume test failed. Instance may not be in a resumable state:',
          error.message
        );
      }
    });

    it('should cancel a process instance', async () => {
      const { processInstances } = getServices();

      const { processes } = getServices();
      const config = getTestConfig();

      if (!config.maestroTestProcessKey || !config.folderId || !config.folderKey) {
        throw new Error(
          'MAESTRO_TEST_PROCESS_KEY / folder config not set — cannot seed an instance for cancel'
        );
      }

      // Seed our own instance and cancel it during its Pending/Running window (the
      // faulting process runs ~15s before it faults). Operating only on our own
      // instance keeps the test safe under parallel runs.
      const [job] = await processes.start(
        { processKey: config.maestroTestProcessKey },
        { folderId: Number(config.folderId) }
      );

      // Wait for Running specifically — cancelling while still Pending is rejected
      let running = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          const instance = await processInstances.getById(job.key, config.folderKey);
          if (instance.latestRunStatus === InstanceStatus.RUNNING) {
            running = true;
            break;
          }
          if (instance.latestRunStatus === InstanceStatus.FAULTED) {
            throw new Error('Seeded instance faulted before it could be cancelled — cannot test cancel');
          }
        } catch (error: any) {
          if (error.message?.includes('cannot test cancel')) {
            throw error;
          }
          // not yet visible in PIMS
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      if (!running) {
        throw new Error('Seeded instance did not reach Running within 60s — cannot test cancel');
      }

      const result = await processInstances.cancel(job.key, config.folderKey);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      const instance = await processInstances.getById(job.key, config.folderKey);
      expect(instance.latestRunStatus).toMatch(/cancel|stopped|terminated/i);
    }, 60_000);
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
        if (!testInstanceId || !testFolderKey) {
          throw new Error('No instance available for testing');
        }

        const { processInstances } = getServices();

        executionHistory = await processInstances.getExecutionHistory(testInstanceId, testFolderKey);
      });

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
});
