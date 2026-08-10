// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueService } from '../../../../src/services/orchestrator/queues';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawQueue,
  createMockRawQueueItem,
  createMockTransformedQueueCollection,
  createMockTransformedQueueItemCollection
} from '../../../utils/mocks/queues';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import {
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueExceptionType,
  QueueItemReviewStatus,
  QueueItemStatus,
  QueuePriority
} from '../../../../src/models/orchestrator/queues.types';
import { ValidationError } from '../../../../src/core/errors';
import { QUEUE_TEST_CONSTANTS } from '../../../utils/constants/queues';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { QUEUE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  // Import/re-export the mock utilities from core
  return import('../../../utils/mocks/core');
});

// Setup mocks at module level
// NOTE: We do NOT mock transformData
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('QueueService Unit Tests', () => {
  let queueService: QueueService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    // Reset pagination helpers mock before each test
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

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(result.name).toBe(QUEUE_TEST_CONSTANTS.QUEUE_NAME);
      expect(result.riskSlaInMinutes).toBe(QUEUE_TEST_CONSTANTS.RISK_SLA_IN_MINUTES);

      // Verify the API call has correct endpoint and headers
      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_ID(QUEUE_TEST_CONSTANTS.QUEUE_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

      // Verify field transformations
      // CreationTime -> createdTime
      expect(result.createdTime).toBe(QUEUE_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined(); // Original field should be removed

      // OrganizationUnitId -> folderId
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect((result as any).OrganizationUnitId).toBeUndefined(); // Original field should be removed

      // OrganizationUnitFullyQualifiedName -> folderName
      expect(result.folderName).toBe(TEST_CONSTANTS.FOLDER_NAME);
      expect((result as any).OrganizationUnitFullyQualifiedName).toBeUndefined(); // Original field should be removed
    });

    it('should get queue with options successfully', async () => {
      const mockQueue = createMockRawQueue();
      mockApiClient.get.mockResolvedValue(mockQueue);

      const options: QueueGetByIdOptions = {
        select: QUEUE_TEST_CONSTANTS.ODATA_SELECT_FIELDS
      };

      const result =await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        options
      );

      //Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(result.name).toBe(QUEUE_TEST_CONSTANTS.QUEUE_NAME);
      expect(result.riskSlaInMinutes).toBe(QUEUE_TEST_CONSTANTS.RISK_SLA_IN_MINUTES);


      // Verify API call has options with OData prefix
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

      // Verify PaginationHelpers.getAll was called
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

      // Verify PaginationHelpers.getAll was called with folder options
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

      // Verify PaginationHelpers.getAll was called with pagination options
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

    it('should translate SDK field names to API names in filter/orderby before delegating', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueCollection(),
      );

      await queueService.getAll({
        filter: "folderName eq 'Finance' and folderId eq 7",
        orderby: 'createdTime desc',
      });

      // Options arriving at PaginationHelpers should already be in API field space:
      // folderName → organizationUnitFullyQualifiedName, folderId → organizationUnitId,
      // createdTime → creationTime.
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: "organizationUnitFullyQualifiedName eq 'Finance' and organizationUnitId eq 7",
          orderby: 'creationTime desc',
        }),
      );
    });
  });

  describe('OData field rewrite in getById', () => {
    it('should rewrite renamed SDK field names in select before calling the API', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());

      await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { select: 'name,createdTime,folderId' },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_ID(QUEUE_TEST_CONSTANTS.QUEUE_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'name,creationTime,organizationUnitId',
          }),
        }),
      );
    });
  });

  describe('bound queue methods', () => {
    it('should attach queue methods to the queue returned by getById', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());

      const queue = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(typeof queue.getAllItems).toBe('function');
      expect(typeof queue.insertItem).toBe('function');
    });

    it('should attach queue methods to queues returned via the getAll transform', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueCollection()
      );

      await queueService.getAll();

      // Run the transformFn the service handed to PaginationHelpers on a raw
      // queue and verify it produces a queue with bound methods.
      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const transformed = (config as any).transformFn(createMockRawQueue());

      expect(transformed.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(transformed.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(typeof transformed.getAllItems).toBe('function');
      expect(typeof transformed.insertItem).toBe('function');
    });
  });

  describe('getAllItems', () => {
    it('should scope the listing to the queue and pass the folder', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection()
      );

      const result = await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      // The queue scoping filter is written with SDK field names and rewritten
      // to API names (queueId → queueDefinitionId) before delegating.
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === QUEUE_ENDPOINTS.GET_ITEMS),
          transformFn: expect.any(Function)
        }),
        expect.objectContaining({
          filter: `queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`,
          folderId: TEST_CONSTANTS.FOLDER_ID
        })
      );

      expect(result).toBeDefined();
    });

    it('should merge a caller filter with the queue filter and rewrite field names', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection()
      );

      await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        {
          filter: "status eq 'Failed'",
          orderby: 'createdTime desc'
        }
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: `(status eq 'Failed') and queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`,
          orderby: 'creationTime desc',
          folderId: TEST_CONSTANTS.FOLDER_ID
        })
      );
    });

    it('should pass pagination options through', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection(10)
      );

      await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { pageSize: TEST_CONSTANTS.PAGE_SIZE }
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );
    });

    it('should transform queue items preserving user-defined payload keys exactly', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection()
      );

      await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const item = (config as any).transformFn(createMockRawQueueItem());

      // Renamed fields carry their values
      expect(item.id).toBe(QUEUE_TEST_CONSTANTS.ITEM_ID);
      expect(item.status).toBe(QueueItemStatus.New);
      expect(item.reviewStatus).toBe(QueueItemReviewStatus.None);
      expect(item.priority).toBe(QueuePriority.High);
      expect(item.queueId).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(item.createdTime).toBe(QUEUE_TEST_CONSTANTS.ITEM_CREATED_TIME);
      expect(item.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(item.folderName).toBe(TEST_CONSTANTS.FOLDER_NAME);
      expect(item.reference).toBe(QUEUE_TEST_CONSTANTS.ITEM_REFERENCE);
      expect(item.processingStartTime).toBeNull();
      expect(item.processingEndTime).toBeNull();
      expect(item.processingError).toBeNull();

      // The business payload keeps its keys EXACTLY as stored (mixed casing) —
      // no case conversion is applied to user-defined keys.
      expect(item.specificData).toEqual(QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT);
      // The JSON-string wire duplicates are dropped from the SDK shape.
      expect((item as any).specificDataJson).toBeUndefined();
      expect((item as any).outputDataJson).toBeUndefined();

      // Original PascalCase / renamed wire fields are gone
      expect((item as any).QueueDefinitionId).toBeUndefined();
      expect((item as any).CreationTime).toBeUndefined();
      expect((item as any).SpecificContent).toBeUndefined();
      expect((item as any).SpecificData).toBeUndefined();
      expect((item as any).OrganizationUnitId).toBeUndefined();
      expect((item as any).startProcessing).toBeUndefined();
      expect((item as any).endProcessing).toBeUndefined();
      expect((item as any).processingException).toBeUndefined();
    });

    it('should transform the nested processing error, including its createdTime rename', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection()
      );

      await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const item = (config as any).transformFn(createMockRawQueueItem({
        Status: 'Failed',
        ProcessingException: {
          Reason: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_REASON,
          Details: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_DETAILS,
          Type: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_TYPE,
          CreationTime: QUEUE_TEST_CONSTANTS.ITEM_CREATED_TIME
        }
      }));

      expect(item.status).toBe(QueueItemStatus.Failed);
      expect(item.processingError).toEqual({
        reason: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_REASON,
        details: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_DETAILS,
        type: QueueExceptionType.BusinessException,
        createdTime: QUEUE_TEST_CONSTANTS.ITEM_CREATED_TIME
      });
      // The nested wire-name variants are gone
      expect((item.processingError as any).creationTime).toBeUndefined();
      expect((item as any).processingException).toBeUndefined();
    });

    it('should throw a ValidationError when queueId is missing', async () => {
      await expect(queueService.getAllItems(
        undefined as unknown as number,
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toBeInstanceOf(ValidationError);

      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should throw a ValidationError when folderId is missing', async () => {
      await expect(queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        undefined as unknown as number
      )).rejects.toBeInstanceOf(ValidationError);

      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('insertItemByName', () => {
    it('should post the item with queue name, defaulted priority, and untouched payload keys', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      const result = await queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.ADD_ITEM,
        expect.objectContaining({
          itemData: expect.objectContaining({
            Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME,
            Priority: QueuePriority.Normal
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

      // The payload is attached under SpecificContent with its keys EXACTLY
      // as provided — user-defined keys are never case-converted.
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.itemData.SpecificContent).toEqual(QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT);

      // The created item is returned transformed
      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.ITEM_ID);
      expect(result.specificData).toEqual(QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT);
    });

    it('should serialize option metadata and Date fields into the item body', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      const deferDate = new Date(QUEUE_TEST_CONSTANTS.ITEM_DEFER_DATE);
      const dueDate = new Date(QUEUE_TEST_CONSTANTS.ITEM_DUE_DATE);

      await queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
        {
          priority: QueuePriority.High,
          reference: QUEUE_TEST_CONSTANTS.ITEM_REFERENCE,
          progress: QUEUE_TEST_CONSTANTS.ITEM_PROGRESS,
          deferDate,
          dueDate
        }
      );

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.itemData.Priority).toBe(QueuePriority.High);
      expect(body.itemData.Reference).toBe(QUEUE_TEST_CONSTANTS.ITEM_REFERENCE);
      expect(body.itemData.Progress).toBe(QUEUE_TEST_CONSTANTS.ITEM_PROGRESS);
      // Date options are converted to the ISO-8601 strings the API expects
      expect(body.itemData.DeferDate).toBe(deferDate.toISOString());
      expect(body.itemData.DueDate).toBe(dueDate.toISOString());
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should throw a ValidationError when queueName is missing', async () => {
      await expect(queueService.insertItemByName(
        undefined as unknown as string,
        TEST_CONSTANTS.FOLDER_ID,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw a ValidationError when folderId is missing', async () => {
      await expect(queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        undefined as unknown as number,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });
});
