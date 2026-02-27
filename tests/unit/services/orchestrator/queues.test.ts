// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueService } from '../../../../src/services/orchestrator/queues';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createBasicQueue,
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
    it('should get queue by ID successfully with all fields mapped correctly', async () => {
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
      expect(transformed.content).toEqual(QUEUE_TEST_CONSTANTS.CONTENT);
      expect(transformed.specificData).toBe(QUEUE_TEST_CONSTANTS.SPECIFIC_DATA);
      expect(transformed.output).toEqual(QUEUE_TEST_CONSTANTS.OUTPUT);
      expect(transformed.outputData).toBe(QUEUE_TEST_CONSTANTS.OUTPUT_DATA);
      expect((transformed as any).organizationUnitId).toBeUndefined();
      expect((transformed as any).organizationUnitFullyQualifiedName).toBeUndefined();
      expect((transformed as any).queueDefinitionId).toBeUndefined();
      expect((transformed as any).creationTime).toBeUndefined();
      expect((transformed as any).specificContent).toBeUndefined();
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

  describe('getAllItemsByName', () => {
    it('should resolve queue ID by name and delegate to getAllItems', async () => {
      vi.spyOn(queueService, 'getAll').mockResolvedValue({
        items: [createBasicQueue()],
        totalCount: 1
      } as any);

      const getAllItemsSpy = vi.spyOn(queueService, 'getAllItems').mockResolvedValue({
        items: [createBasicQueueItem()],
        totalCount: 1
      } as any);

      const result = await queueService.getAllItemsByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(getAllItemsSpy).toHaveBeenCalledWith(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        undefined
      );
      expect(result.items).toHaveLength(1);
    });

    it('should throw when queue name is not found', async () => {
      vi.spyOn(queueService, 'getAll').mockResolvedValue({
        items: [],
        totalCount: 0
      } as any);

      await expect(queueService.getAllItemsByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(`Queue '${QUEUE_TEST_CONSTANTS.QUEUE_NAME}' was not found`);
    });
  });

  describe('insertItemByName', () => {
    it('should insert queue item and map response fields', async () => {
      const mockQueueItem = createMockRawQueueItem();
      mockApiClient.post.mockResolvedValue(mockQueueItem);

      const content = { ...QUEUE_TEST_CONSTANTS.CONTENT };
      const result = await queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID,
        content,
        {
          priority: 'Normal',
          reference: QUEUE_TEST_CONSTANTS.QUEUE_ITEM_REFERENCE
        }
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID);
      expect(result.queueId).toBe(QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID);
      expect(result.createdTime).toBe(QUEUE_TEST_CONSTANTS.CREATED_TIME);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result.folderName).toBe(TEST_CONSTANTS.FOLDER_NAME);
      expect(result.content).toEqual(QUEUE_TEST_CONSTANTS.CONTENT);
      expect(result.specificData).toBe(QUEUE_TEST_CONSTANTS.SPECIFIC_DATA);
      expect(result.outputData).toBe(QUEUE_TEST_CONSTANTS.OUTPUT_DATA);
      expect((result as any).queueDefinitionId).toBeUndefined();
      expect((result as any).creationTime).toBeUndefined();
      expect((result as any).organizationUnitId).toBeUndefined();
      expect((result as any).specificContent).toBeUndefined();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.ADD_ITEM,
        expect.objectContaining({
          itemData: expect.objectContaining({
            Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME,
            Priority: 'Normal',
            SpecificContent: content,
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

    it('should use Normal as default priority when not provided', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      await queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID,
        { ...QUEUE_TEST_CONSTANTS.CONTENT }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.ADD_ITEM,
        expect.objectContaining({
          itemData: expect.objectContaining({
            Priority: 'Normal'
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('insertItem', () => {
    it('should resolve queue name from ID and delegate to insertItemByName', async () => {
      vi.spyOn(queueService, 'getById').mockResolvedValue(createBasicQueue());
      const insertByNameSpy = vi.spyOn(queueService, 'insertItemByName').mockResolvedValue(createBasicQueueItem());

      const content = { ...QUEUE_TEST_CONSTANTS.CONTENT };
      const result = await queueService.insertItem(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        content
      );

      expect(insertByNameSpy).toHaveBeenCalledWith(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID,
        content,
        {}
      );
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID);
    });

    it('should handle API errors', async () => {
      vi.spyOn(queueService, 'getById').mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(queueService.insertItem(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { ...QUEUE_TEST_CONSTANTS.CONTENT }
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('startTransactionByName', () => {
    it('should start a transaction and map queue item fields', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      const result = await queueService.startTransactionByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID);
      expect(result.queueId).toBe(QUEUE_TEST_CONSTANTS.QUEUE_DEFINITION_ID);
      expect(result.createdTime).toBe(QUEUE_TEST_CONSTANTS.CREATED_TIME);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result.folderName).toBe(TEST_CONSTANTS.FOLDER_NAME);
      expect(result.specificData).toBe(QUEUE_TEST_CONSTANTS.SPECIFIC_DATA);
      expect(result.outputData).toBe(QUEUE_TEST_CONSTANTS.OUTPUT_DATA);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.START_TRANSACTION,
        expect.objectContaining({
          transactionData: expect.objectContaining({
            Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });
  });

  describe('startTransaction', () => {
    it('should resolve queue name from ID and delegate to startTransactionByName', async () => {
      vi.spyOn(queueService, 'getById').mockResolvedValue(createBasicQueue());
      const startByNameSpy = vi.spyOn(queueService, 'startTransactionByName').mockResolvedValue(createBasicQueueItem());

      const result = await queueService.startTransaction(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(startByNameSpy).toHaveBeenCalledWith(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID
      );
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID);
    });

    it('should handle API errors', async () => {
      vi.spyOn(queueService, 'getById').mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(queueService.startTransaction(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('completeTransaction', () => {
    it('should complete a transaction with expected payload and return response metadata', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      const options = {
        isSuccessful: true,
        output: { completed: true }
      };

      const result = await queueService.completeTransaction(
        QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
        TEST_CONSTANTS.FOLDER_ID,
        options
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID),
        expect.objectContaining({
          transactionResult: {
            IsSuccessful: true,
            Output: { completed: true },
            ProcessingException: undefined,
            DeferDate: undefined,
            DueDate: undefined,
            Analytics: undefined,
            Progress: undefined,
            OperationId: undefined
          }
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
      expect(result).toEqual({ success: true });
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(queueService.completeTransaction(
        QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { isSuccessful: false, processingException: { reason: 'ValidationError' } }
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('completeTransactionByName', () => {
    it('should validate queue item ownership and delegate completion', async () => {
      vi.spyOn(queueService, 'getAll').mockResolvedValue({
        items: [createBasicQueue()],
        totalCount: 1
      } as any);

      const getAllItemsSpy = vi.spyOn(queueService, 'getAllItems').mockResolvedValue({
        items: [createBasicQueueItem()],
        totalCount: 1
      } as any);

      const completeTransactionSpy = vi.spyOn(queueService, 'completeTransaction')
        .mockResolvedValue({ success: true });

      const options = { isSuccessful: true };
      const result = await queueService.completeTransactionByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
        TEST_CONSTANTS.FOLDER_ID,
        options
      );

      expect(getAllItemsSpy).toHaveBeenCalledWith(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        expect.objectContaining({
          filter: `id eq ${QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID}`
        })
      );
      expect(completeTransactionSpy).toHaveBeenCalledWith(
        QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
        TEST_CONSTANTS.FOLDER_ID,
        options
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw if queue item is not found in the named queue', async () => {
      vi.spyOn(queueService, 'getAll').mockResolvedValue({
        items: [createBasicQueue()],
        totalCount: 1
      } as any);

      vi.spyOn(queueService, 'getAllItems').mockResolvedValue({
        items: [],
        totalCount: 0
      } as any);

      await expect(queueService.completeTransactionByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { isSuccessful: false }
      )).rejects.toThrow(`Queue item '${QUEUE_TEST_CONSTANTS.QUEUE_ITEM_ID}' was not found`);
    });
  });
});
