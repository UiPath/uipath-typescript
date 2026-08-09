import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { generateRandomString } from '../../utils/helpers';
import { QueueItemReviewStatus, QueueItemStatus, QueuePriority } from '../../../../src/models/orchestrator/queues.types';
import type { QueueGetResponse } from '../../../../src/models/orchestrator/queues.models';

const modes: InitMode[] = ['v0', 'v1'];

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

      expect(allQueues.items.length, 'No queues available to test getById. Create a queue in the tenant first.').toBeGreaterThan(0);

      const queueId = allQueues.items[0].id;
      const folderId = config.folderId ? Number(config.folderId) : undefined;

      expect(folderId, 'INTEGRATION_TEST_FOLDER_ID must be configured').toBeDefined();

      const result = await queues.getById(queueId, folderId!);

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

      expect(result.items.length, 'No queues available to validate structure').toBeGreaterThan(0);

      const queue = result.items[0];

      expect(queue).toBeDefined();
      expect(queue.id).toBeDefined();
      expect(queue.name).toBeDefined();
      expect(queue.key).toBeDefined();
      expect(typeof queue.id).toBe('number');
      expect(typeof queue.name).toBe('string');
      expect(typeof queue.key).toBe('string');
    });

    it('should attach queue methods to returned queues', async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      const result = await queues.getAll({
        folderId: config.folderId ? Number(config.folderId) : undefined,
        pageSize: 1,
      });

      expect(result.items.length, 'No queues available to validate methods').toBeGreaterThan(0);

      const queue = result.items[0];
      expect(typeof queue.getAllItems).toBe('function');
      expect(typeof queue.insertItem).toBe('function');
    });
  });

  // Items are inserted into a dedicated test queue (QUEUES_TEST_QUEUE_NAME).
  // Queue items have no delete API in the SDK, so inserted/processed items
  // remain in that queue — which is why the tests refuse to run against
  // arbitrary queues.
  describe('Queue items and transactions', () => {
    // The queue does not change between tests — resolve it once.
    let testQueue!: QueueGetResponse;

    beforeAll(async () => {
      const { queues } = getServices();
      const config = getTestConfig();

      if (!config.folderId) {
        throw new Error('INTEGRATION_TEST_FOLDER_ID must be configured for queue item tests');
      }
      if (!config.queuesTestQueueName) {
        throw new Error('QUEUES_TEST_QUEUE_NAME must be configured for queue item tests');
      }

      const folderId = Number(config.folderId);
      const result = await queues.getAll({
        folderId,
        filter: `name eq '${config.queuesTestQueueName}'`,
      });

      if (result.items.length === 0) {
        throw new Error(
          `Queue "${config.queuesTestQueueName}" was not found in folder ${folderId} — create it before running queue item tests`
        );
      }

      testQueue = result.items[0];
    });

    it('should insert an item and return it with payload keys preserved exactly', async () => {
      const queue = testQueue;
      const reference = `sdk-it-${generateRandomString(10)}`;

      // Mixed key casing on purpose — the SDK must not case-convert
      // user-defined payload keys.
      const payload = {
        InvoiceId: reference,
        amountDue: 42,
        Vendor_Name: 'IntegrationTest'
      };

      const item = await queue.insertItem(payload, {
        priority: QueuePriority.High,
        reference,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe('number');
      expect(item.status).toBe(QueueItemStatus.New);
      expect(item.priority).toBe(QueuePriority.High);
      expect(item.reference).toBe(reference);
      expect(item.queueId).toBe(queue.id);
      expect(item.dueDate).toBeDefined();

      // Transform validation: camelCase fields present with values...
      expect(item.createdTime).toBeDefined();
      expect(item.key).toBeDefined();
      expect(item.reviewStatus).toBe(QueueItemReviewStatus.None);
      expect(item.processingStartTime).toBeNull();
      expect(item.folderId).toBe(queue.folderId);
      // The insert response does not populate the folder name (listing does) —
      // which is why QueueItem types it string | null.
      expect(item.folderName).toBeNull();
      // ...original PascalCase / renamed wire fields absent...
      expect((item as any).CreationTime).toBeUndefined();
      expect((item as any).QueueDefinitionId).toBeUndefined();
      expect((item as any).SpecificContent).toBeUndefined();
      expect((item as any).startProcessing).toBeUndefined();
      // ...the JSON-string wire duplicates dropped...
      expect((item as any).specificDataJson).toBeUndefined();
      expect((item as any).outputDataJson).toBeUndefined();
      // ...and the payload keys preserved EXACTLY as provided.
      expect(item.specificData).toEqual(payload);
    });

    it('should round-trip every insert field the low-code parity contract requires', async () => {
      const queue = testQueue;
      const reference = `sdk-it-${generateRandomString(10)}`;

      // PLT-104203 requires AddQueueItem to support Name, SpecificContent,
      // Priority, Reference, DeferDate and DueDate. Name comes from the bound
      // queue; the rest are asserted below, including that Date options reach
      // the API as the intended instants.
      const deferDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const riskSlaDate = new Date(Date.now() + 12 * 60 * 60 * 1000);

      const item = await queue.insertItem({ InvoiceId: reference }, {
        priority: QueuePriority.Low,
        reference,
        deferDate,
        dueDate,
        riskSlaDate,
        progress: 'parity-check'
      });

      expect(item.priority).toBe(QueuePriority.Low);
      expect(item.reference).toBe(reference);
      expect(new Date(item.deferDate!).getTime()).toBe(deferDate.getTime());
      expect(new Date(item.dueDate!).getTime()).toBe(dueDate.getTime());
      expect(new Date(item.riskSlaDate!).getTime()).toBe(riskSlaDate.getTime());
      expect(item.specificData).toEqual({ InvoiceId: reference });
    });

    it('should list queue items filtered by reference', async () => {
      const queue = testQueue;
      const reference = `sdk-it-${generateRandomString(10)}`;

      await queue.insertItem({ InvoiceId: reference }, { reference });

      const items = await queue.getAllItems({
        filter: `reference eq '${reference}'`
      });

      expect(items.items.length).toBe(1);
      expect(items.items[0].reference).toBe(reference);
      expect(items.items[0].queueId).toBe(queue.id);
      expect(items.items[0].specificData).toEqual({ InvoiceId: reference });
    });

    it('should paginate queue items', async () => {
      const queue = testQueue;
      const reference = `sdk-it-${generateRandomString(10)}`;

      // Ensure at least one item exists
      await queue.insertItem({ InvoiceId: reference }, { reference });

      const page = await queue.getAllItems({ pageSize: 1 });

      expect(page.items.length).toBeLessThanOrEqual(1);
      expect(page.totalCount).toBeGreaterThan(0);
    });
  });
});
