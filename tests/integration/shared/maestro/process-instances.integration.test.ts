import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
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
    const { processes } = getServices();
    const config = getTestConfig();

    if (config.maestroTestProcessKey && config.folderId) {
      const [job] = await processes.start(
        { processKey: config.maestroTestProcessKey },
        { folderId: Number(config.folderId) }
      );
      seededFaultedJobKey = job.key;
    }
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
        console.log('No instance available for testing');
        return;
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
        console.log('No instance available for testing');
        return;
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
        console.log('No instance available for testing');
        return;
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

      try {
        const instances = await processInstances.getAll({
          pageSize: 10,
        });

        // Never cancel the faulting-process instance seeded for the retry test — it is
        // briefly Running before it faults
        const runnableInstance = instances.items.find(
          (inst) =>
            inst.folderKey &&
            inst.instanceId !== seededFaultedJobKey &&
            inst.latestRunStatus &&
            inst.latestRunStatus.toLowerCase().match(/running|active|pending/)
        );

        if (!runnableInstance) {
          console.log('No running instance available to test cancellation');
          return;
        }

        try {
          const result = await processInstances.cancel(
            runnableInstance.instanceId,
            runnableInstance.folderKey
          );

          expect(result).toBeDefined();
          expect(result.success).toBe(true);

          const instance = await processInstances.getById(
            runnableInstance.instanceId,
            runnableInstance.folderKey
          );
          expect(instance.latestRunStatus).toMatch(/cancel|stopped|terminated/i);

          registerResource('processInstances', {
            id: runnableInstance.instanceId,
            folderKey: runnableInstance.folderKey,
          });
        } catch (error: any) {
          console.log('Cancel test failed:', error.message);
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
        console.log('No instance available for testing');
        return;
      }

      const { processInstances } = getServices();

      try {
        const result = await processInstances.getVariables(testInstanceId, testFolderKey);

        expect(result).toBeDefined();
        expect(result.instanceId).toBe(testInstanceId);
        expect(Array.isArray(result.globalVariables)).toBe(true);
      } catch (error: any) {
        console.log('Get variables test failed:', error.message);
      }
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
          console.log('No instances available to validate structure');
          return;
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
