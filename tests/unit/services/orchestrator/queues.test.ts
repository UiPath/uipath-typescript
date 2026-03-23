// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueService } from '../../../../src/services/orchestrator/queues';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createBasicQueueItem,
  createMockRawQueue,
  createMockRawQueueItem,
  createMockTransformedQueueCollection
} from '../../../utils/mocks/queues';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import {
  QueueGetAllOptions,
  QueueGetByIdOptions
} from '../../../../src/models/orchestrator/queues.types';
import { QUEUE_TEST_CONSTANTS } from '../../../utils/constants/queues';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { QUEUE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('QueueService Unit Tests', () => {
  let queueService: QueueService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    vi.mocked(PaginationHelpers.getAll).mockReset();

    queueService = new QueueService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get queue by ID successfully with all fields mapped correctly and queue methods attached', async () => {
      const mockQueue = createMockRawQueue();

      mockApiClient.get.mockResolvedValue(mockQueue);

      const result = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(result.name).toBe(QUEUE_TEST_CONSTANTS.QUEUE_NAME);
      expect(result.riskSlaInMinutes).toBe(QUEUE_TEST_CONSTANTS.RISK_SLA_IN_MINUTES);
      expect(result.createdTime).toBe(QUEUE_TEST_CONSTANTS.CREATED_TIME);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result.folderName).toBe(TEST_CONSTANTS.FOLDER_NAME);
      expect(result.getAllItems).toBeTypeOf('function');
      expect(result.insertItem).toBeTypeOf('function');
      expect(result.startTransaction).toBeTypeOf('function');
      expect(result.completeTransaction).toBeTypeOf('function');
      expect((result as any).creationTime).toBeUndefined();
      expect((result as any).organizationUnitId).toBeUndefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_ID(QUEUE_TEST_CONSTANTS.QUEUE_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should get queue with options successfully', async () => {
      const mockQueue = createMockRawQueue();
      mockApiClient.get.mockResolvedValue(mockQueue);

      const options: QueueGetByIdOptions = {
        select: QUEUE_TEST_CONSTANTS.ODATA_SELECT_FIELDS
      };

      const result = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        options
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(result.name).toBe(QUEUE_TEST_CONSTANTS.QUEUE_NAME);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_ID(QUEUE_TEST_CONSTANTS.QUEUE_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': QUEUE_TEST_CONSTANTS.ODATA_SELECT_FIELDS
          })
        })
      );
    });

    it('should delegate queue-bound getAllItems using queue metadata', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: [createBasicQueueItem()],
        totalCount: 1
      });

      const queue = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      const result = await queue.getAllItems();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          getEndpoint: expect.toSatisfy((fn: Function) => fn(TEST_CONSTANTS.FOLDER_ID) === QUEUE_ENDPOINTS.GET_ITEMS)
        }),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
          filter: `queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`
        })
      );
      expect(result.items).toHaveLength(1);
    });

    it('should insert an item via the queue-bound insertItem method', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      const queue = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      const specificData = { ...QUEUE_TEST_CONSTANTS.SPECIFIC_DATA_OBJECT };
      const result = await queue.insertItem(specificData, {
        priority: 'Normal',
        reference: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_REFERENCE
      });

      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID);
      expect(result.queueId).toBe(QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID);
      expect(result.specificData).toEqual(QUEUE_TEST_CONSTANTS.SPECIFIC_DATA_OBJECT);
      expect(result.specificDataJson).toBe(QUEUE_TEST_CONSTANTS.SPECIFIC_DATA_JSON);
      expect(result.createdTime).toBe(QUEUE_TEST_CONSTANTS.CREATED_TIME);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.ADD_ITEM,
        expect.objectContaining({
          itemData: expect.objectContaining({
            Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME,
            Priority: 'Normal',
            SpecificContent: specificData,
            Reference: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_REFERENCE
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should start a transaction via the queue-bound startTransaction method', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      const queue = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      const result = await queue.startTransaction();

      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID);
      expect(result.queueId).toBe(QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.START_TRANSACTION,
        {
          transactionData: {
            Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME
          }
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should complete a transaction via the queue-bound completeTransaction method', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());
      mockApiClient.post.mockResolvedValue(undefined);

      const queue = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      const result = await queue.completeTransaction(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID, {
        isSuccessful: true,
        outputData: { completed: true },
        processingException: { reason: 'ValidationError' }
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID),
        {
          transactionResult: {
            IsSuccessful: true,
            Output: { completed: true },
            ProcessingException: {
              Reason: 'ValidationError'
            }
          }
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle API errors', async () => {
      const error = createMockError(QUEUE_TEST_CONSTANTS.ERROR_QUEUE_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(QUEUE_TEST_CONSTANTS.ERROR_QUEUE_NOT_FOUND);
    });
  });

  describe('getAll', () => {
    it('should return all queues without pagination options', async () => {
      const mockResponse = createMockTransformedQueueCollection();
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await queueService.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === QUEUE_ENDPOINTS.GET_ALL),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should configure transformFn to return queue metadata with queue-bound methods', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await queueService.getAll();

      const paginationConfig = vi.mocked(PaginationHelpers.getAll).mock.calls[0][0] as any;
      const transformed = paginationConfig.transformFn(createMockRawQueue());

      expect(transformed.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(transformed.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(transformed.getAllItems).toBeTypeOf('function');
      expect(transformed.insertItem).toBeTypeOf('function');
      expect(transformed.startTransaction).toBeTypeOf('function');
      expect(transformed.completeTransaction).toBeTypeOf('function');
    });

    it('should return queues filtered by folder ID', async () => {
      const mockResponse = createMockTransformedQueueCollection();
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: QueueGetAllOptions = {
        folderId: TEST_CONSTANTS.FOLDER_ID
      };

      const result = await queueService.getAll(options);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn(TEST_CONSTANTS.FOLDER_ID) === QUEUE_ENDPOINTS.GET_BY_FOLDER),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated queues when pagination options provided', async () => {
      const mockResponse = createMockTransformedQueueCollection(100, {
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      });
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: QueueGetAllOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE
      };

      const result = await queueService.getAll(options) as any;

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(queueService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getAllItems', () => {
    it('should return queue items scoped to a specific queue and folder', async () => {
      const mockResponse = {
        items: [createBasicQueueItem()],
        totalCount: 1
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await queueService.getAllItems(QUEUE_TEST_CONSTANTS.QUEUE_ID, TEST_CONSTANTS.FOLDER_ID);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn(TEST_CONSTANTS.FOLDER_ID) === QUEUE_ENDPOINTS.GET_ITEMS),
          getByFolderEndpoint: QUEUE_ENDPOINTS.GET_ITEMS,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
          filter: `queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should configure transformFn to map queue item fields and parity fields', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await queueService.getAllItems(QUEUE_TEST_CONSTANTS.QUEUE_ID, TEST_CONSTANTS.FOLDER_ID);

      const paginationConfig = vi.mocked(PaginationHelpers.getAll).mock.calls[0][0] as any;
      const transformed = paginationConfig.transformFn(createMockRawQueueItem());

      expect(transformed.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(transformed.folderName).toBe(TEST_CONSTANTS.FOLDER_NAME);
      expect(transformed.queueId).toBe(QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID);
      expect(transformed.createdTime).toBe(QUEUE_TEST_CONSTANTS.CREATED_TIME);
      expect(transformed.specificData).toEqual(QUEUE_TEST_CONSTANTS.SPECIFIC_DATA_OBJECT);
      expect(transformed.specificDataJson).toBe(QUEUE_TEST_CONSTANTS.SPECIFIC_DATA_JSON);
      expect(transformed.outputData).toEqual(QUEUE_TEST_CONSTANTS.OUTPUT_DATA_OBJECT);
      expect(transformed.outputDataJson).toBe(QUEUE_TEST_CONSTANTS.OUTPUT_DATA_JSON);
      expect((transformed as any).organizationUnitId).toBeUndefined();
      expect((transformed as any).organizationUnitFullyQualifiedName).toBeUndefined();
      expect((transformed as any).queueDefinitionId).toBeUndefined();
      expect((transformed as any).creationTime).toBeUndefined();
      expect((transformed as any).specificContent).toBeUndefined();
      expect((transformed as any).output).toBeUndefined();
    });

    it('should return paginated queue items when pagination options provided', async () => {
      const mockResponse = {
        items: [createBasicQueueItem()],
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await queueService.getAllItems(QUEUE_TEST_CONSTANTS.QUEUE_ID, TEST_CONSTANTS.FOLDER_ID, {
        pageSize: TEST_CONSTANTS.PAGE_SIZE
      }) as any;

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
          filter: `queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should merge existing filters with queue ID filter', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await queueService.getAllItems(QUEUE_TEST_CONSTANTS.QUEUE_ID, TEST_CONSTANTS.FOLDER_ID, {
        filter: "status eq 'New'"
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
          filter: `(status eq 'New') and queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(
        queueService.getAllItems(QUEUE_TEST_CONSTANTS.QUEUE_ID, TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('public surface', () => {
    it('should not expose removed queue-name convenience methods on the service', () => {
      expect((queueService as any).getAllItemsByName).toBeUndefined();
      expect((queueService as any).insertItem).toBeUndefined();
      expect((queueService as any).insertItemByName).toBeUndefined();
      expect((queueService as any).startTransaction).toBeUndefined();
      expect((queueService as any).startTransactionByName).toBeUndefined();
      expect((queueService as any).completeTransaction).toBeUndefined();
      expect((queueService as any).completeTransactionByName).toBeUndefined();
    });
  });
});
