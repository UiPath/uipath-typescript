import { describe, it, expect } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';

const modes: InitMode[] = ['v1', 'v2'];

describe.each(modes)('Orchestrator Queues - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  describe('getAll', () => {
    it('should retrieve all queues', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const result = await queues.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 100,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });

    it('should retrieve queues with pagination options', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const result = await queues.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 10,
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeLessThanOrEqual(10);
    });

    it('should retrieve queues with filter', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const result = await queues.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 5,
        filter: "Name eq 'TestQueue'",
      });

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe('getById', () => {
    it('should retrieve a specific queue by ID', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const allQueues = await queues.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      if (allQueues.items.length === 0) {
        console.log('No queues available to test getById. Create a queue in the tenant first.');
        return;
      }

      const queueId = allQueues.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      if (!folderId) {
        console.log('Skipping getById test: INTEGRATION_TEST_FOLDER_ID not configured.');
        return;
      }

      const result = await queues.getById(queueId, folderId);

      expect(result).toBeDefined();
      expect(result.id).toBe(queueId);
      expect(result.name).toBeDefined();
      expect(typeof result.name).toBe('string');
    });
  });

  describe('Queue structure validation', () => {
    it('should have expected fields in queue objects', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const result = await queues.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      if (result.items.length === 0) {
        console.log('No queues available to validate structure');
        return;
      }

      const queue = result.items[0];

      expect(queue).toBeDefined();
      expect(queue.id).toBeDefined();
      expect(queue.name).toBeDefined();
      expect(queue.key).toBeDefined();
      expect(typeof queue.id).toBe('number');
      expect(typeof queue.name).toBe('string');
      expect(typeof queue.key).toBe('string');
    });
  });
});
