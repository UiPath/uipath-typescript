import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';
import type { ProcessInstanceExecutionHistoryResponse } from '../../../../src/models/maestro/process-instances.types';

const modes: InitMode[] = ['v0', 'v1'];

describe.each(modes)('Maestro Process Instances - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let testInstanceId: string | null = null;

  describe('getAll', () => {
    it('should retrieve all process instances', async () => {
      const { processInstances } = getServices();

      try {
        const result = await processInstances.getAll();

        expect(result).toBeDefined();
        expect(result.items).toBeDefined();
        expect(Array.isArray(result.items)).toBe(true);

        if (result.items.length > 0) {
          testInstanceId = result.items[0].instanceId;
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
      if (!testInstanceId) {
        console.log('No instance ID available for testing');
        return;
      }

      const { processInstances } = getServices();
      const config = getTestConfig();

      const result = await processInstances.getById(testInstanceId, config.folderId || '');

      expect(result).toBeDefined();
      expect(result.instanceId).toBe(testInstanceId);
    });
  });

  describe('Instance lifecycle operations', () => {
    it('should pause a process instance', async () => {
      if (!testInstanceId) {
        console.log('No instance ID available for testing');
        return;
      }

      const { processInstances } = getServices();
      const config = getTestConfig();

      try {
        const result = await processInstances.pause(testInstanceId, config.folderId || '');

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        const instance = await processInstances.getById(testInstanceId, config.folderId || '');
        expect(instance.latestRunStatus).toMatch(/paused|suspended/i);
      } catch (error: any) {
        console.log(
          'Pause test failed. Instance may not be in a pausable state:',
          error.message
        );
      }
    });

    it('should resume a paused process instance', async () => {
      if (!testInstanceId) {
        console.log('No instance ID available for testing');
        return;
      }

      const { processInstances } = getServices();
      const config = getTestConfig();

      try {
        const result = await processInstances.resume(testInstanceId, config.folderId || '');

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        const instance = await processInstances.getById(testInstanceId, config.folderId || '');
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
      const config = getTestConfig();

      try {
        const instances = await processInstances.getAll({
          pageSize: 10,
        });

        const runnableInstance = instances.items.find(
          (inst: any) =>
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
            config.folderId || ''
          );

          expect(result).toBeDefined();
          expect(result.success).toBe(true);

          const instance = await processInstances.getById(
            runnableInstance.instanceId,
            config.folderId || ''
          );
          expect(instance.latestRunStatus).toMatch(/cancel|stopped|terminated/i);

          registerResource('processInstances', {
            id: runnableInstance.instanceId,
            folderKey: config.folderId,
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

  describe('retry', () => {
    let faultedInstanceId!: string;
    let folderKey!: string;

    beforeAll(async () => {
      const { processInstances } = getServices();
      const config = getTestConfig();

      if (!config.folderKey) {
        throw new Error('No folderKey configured for testing');
      }
      folderKey = config.folderKey;

      const instances = await processInstances.getAll({ pageSize: 50 });
      const faulted = instances.items.find((inst) =>
        /fault|fail/i.test(inst.latestRunStatus ?? '')
      );

      if (!faulted) {
        throw new Error(
          'No faulted process instance available in the test tenant to exercise retry. ' +
            'Seed a faulted instance in the "Integration Test" folder.'
        );
      }
      faultedInstanceId = faulted.instanceId;
    });

    it('should retry a faulted process instance', async () => {
      const { processInstances } = getServices();

      const result = await processInstances.retry(faultedInstanceId, folderKey, {
        comment: 'Integration test retry',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Instance details', () => {
    it('should retrieve process variables', async () => {
      if (!testInstanceId) {
        console.log('No instance ID available for testing');
        return;
      }

      const { processInstances } = getServices();
      const config = getTestConfig();

      try {
        const result = await processInstances.getVariables(testInstanceId, config.folderId || '');

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
        if (!testInstanceId) {
          throw new Error('No instance ID available for testing');
        }

        const { processInstances } = getServices();
        const config = getTestConfig();

        if (!config.folderKey) {
          throw new Error('No folderKey configured for testing');
        }

        executionHistory = await processInstances.getExecutionHistory(testInstanceId, config.folderKey);
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
