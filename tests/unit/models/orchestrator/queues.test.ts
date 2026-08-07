import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createQueueWithMethods,
  QueueServiceModel
} from '../../../../src/models/orchestrator/queues.models';
import {
  createBasicQueue,
  createBasicQueueItem,
  createMockTransformedQueueItemCollection
} from '../../../utils/mocks/queues';
import { QUEUE_TEST_CONSTANTS } from '../../../utils/constants/queues';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import {
  QueuePriority
} from '../../../../src/models/orchestrator/queues.types';

// ===== TEST SUITE =====
describe('Queue Models', () => {
  let mockService: QueueServiceModel;

  beforeEach(() => {
    // Create a mock service
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      getAllItems: vi.fn(),
      insertItemByName: vi.fn()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('bound methods on queue', () => {
    describe('queue.getAllItems()', () => {
      it('should delegate to service.getAllItems with the bound queue ID and folder ID', async () => {
        const queueData = createBasicQueue();
        const queue = createQueueWithMethods(queueData, mockService);

        const mockResponse = createMockTransformedQueueItemCollection();
        vi.mocked(mockService.getAllItems).mockResolvedValue(mockResponse);

        const options = { filter: "status eq 'Failed'" };
        const result = await queue.getAllItems(options);

        expect(mockService.getAllItems).toHaveBeenCalledWith(
          queueData.id,
          queueData.folderId,
          options
        );
        expect(result).toEqual(mockResponse);
      });

      it('should reject when the queue ID is undefined', async () => {
        const queueData = createBasicQueue({ id: undefined as unknown as number });
        const queue = createQueueWithMethods(queueData, mockService);

        await expect(queue.getAllItems()).rejects.toThrow('Queue ID is undefined');
        expect(mockService.getAllItems).not.toHaveBeenCalled();
      });
    });

    describe('queue.insertItem()', () => {
      it('should delegate to service.insertItemByName with the bound queue name and folder ID', async () => {
        const queueData = createBasicQueue();
        const queue = createQueueWithMethods(queueData, mockService);

        const createdItem = createBasicQueueItem();
        vi.mocked(mockService.insertItemByName).mockResolvedValue(createdItem);

        const options = {
          priority: QueuePriority.High,
          reference: QUEUE_TEST_CONSTANTS.ITEM_REFERENCE
        };
        const result = await queue.insertItem(
          QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
          options
        );

        expect(mockService.insertItemByName).toHaveBeenCalledWith(
          queueData.name,
          queueData.folderId,
          QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
          options
        );
        expect(result).toEqual(createdItem);
      });

      it('should reject when the queue name is undefined', async () => {
        const queueData = createBasicQueue({ name: undefined as unknown as string });
        const queue = createQueueWithMethods(queueData, mockService);

        await expect(queue.insertItem(QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT))
          .rejects.toThrow('Queue name is undefined');
        expect(mockService.insertItemByName).not.toHaveBeenCalled();
      });

      it('should reject when the folder ID is undefined', async () => {
        const queueData = createBasicQueue({ folderId: undefined as unknown as number });
        const queue = createQueueWithMethods(queueData, mockService);

        await expect(queue.insertItem(QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT))
          .rejects.toThrow('Folder ID is undefined');
        expect(mockService.insertItemByName).not.toHaveBeenCalled();
      });
    });
  });

  describe('createQueueWithMethods', () => {
    it('should preserve all queue fields and attach the bound methods', () => {
      const queueData = createBasicQueue();
      const queue = createQueueWithMethods(queueData, mockService);

      // Data preserved
      expect(queue.id).toBe(queueData.id);
      expect(queue.name).toBe(queueData.name);
      expect(queue.key).toBe(queueData.key);
      expect(queue.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);

      // Methods attached
      expect(typeof queue.getAllItems).toBe('function');
      expect(typeof queue.insertItem).toBe('function');
    });
  });
});
