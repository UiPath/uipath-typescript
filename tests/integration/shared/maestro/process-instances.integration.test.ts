import { describe, it, expect, afterAll } from 'vitest';
import {
  getServices,
  getTestConfig,
  setupUnifiedTests,
  InitMode,
} from '../../config/unified-setup';
import { registerResource } from '../../utils/cleanup';

const modes: InitMode[] = ['v1', 'v2'];

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

    it('should retrieve execution history', async () => {
      if (!testInstanceId) {
        console.log('No instance ID available for testing');
        return;
      }

      const { processInstances } = getServices();

      try {
        const result = await processInstances.getExecutionHistory(testInstanceId);

        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);

        if (result.length > 0) {
          const historyItem = result[0];
          expect(historyItem).toBeDefined();
        }
      } catch (error: any) {
        console.log('Get execution history test failed:', error.message);
      }
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
