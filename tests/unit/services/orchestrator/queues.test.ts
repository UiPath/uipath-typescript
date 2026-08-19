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
  QueueTransactionOutcome,
  QueueItemReviewStatus,
  QueueItemStatus,
  QueuePriority,
  QueueRef,
  QueueCompleteTransactionOptions
} from '../../../../src/models/orchestrator/queues.types';
import { NotFoundError, ValidationError } from '../../../../src/core/errors';
import { QUEUE_TEST_CONSTANTS } from '../../../utils/constants/queues';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { QUEUE_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY } from '../../../../src/utils/constants/headers';

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

    it('should keep returning plain queue data without attached methods', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());

      const result = await queueService.getById(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        TEST_CONSTANTS.FOLDER_ID
      );

      // The deprecated method's contract: pure data — safe to enumerate,
      // structuredClone, and postMessage.
      expect((result as any).getAllItems).toBeUndefined();
      expect((result as any).insertItem).toBeUndefined();
    });
  });

  describe('getByIdWithMethods', () => {
    it('should retrieve the queue with folder scoping via options and attach methods', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());

      const result = await queueService.getByIdWithMethods(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(result.name).toBe(QUEUE_TEST_CONSTANTS.QUEUE_NAME);
      expect(typeof result.getAllItems).toBe('function');
      expect(typeof result.insertItem).toBe('function');
      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_ID(QUEUE_TEST_CONSTANTS.QUEUE_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          // The folder fields go into headers only — never into OData params.
          params: expect.not.objectContaining({ '$folderId': expect.anything() })
        })
      );
    });

    it('should scope by folder key through options', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawQueue());

      await queueService.getByIdWithMethods(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        { folderKey: TEST_CONSTANTS.FOLDER_KEY }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_ID(QUEUE_TEST_CONSTANTS.QUEUE_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: TEST_CONSTANTS.FOLDER_KEY
          })
        })
      );
    });

    it('should throw a ValidationError when no folder scoping is provided', async () => {
      await expect(queueService.getByIdWithMethods(QUEUE_TEST_CONSTANTS.QUEUE_ID))
        .rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
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

  describe('getAllWithMethods', () => {
    it('should list queues across folders by default and attach methods via the transform', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueCollection()
      );

      await queueService.getAllWithMethods();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === QUEUE_ENDPOINTS.GET_ALL),
          transformFn: expect.any(Function)
        }),
        {}
      );

      // Run the transformFn the service handed to PaginationHelpers on a raw
      // queue and verify it produces a queue with bound methods.
      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const transformed = (config as any).transformFn(createMockRawQueue());

      expect(transformed.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(transformed.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(typeof transformed.getAllItems).toBe('function');
      expect(typeof transformed.insertItem).toBe('function');
    });

    it('should move folder scoping into headers and switch to the folder endpoint', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueCollection()
      );

      await queueService.getAllWithMethods({ folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === QUEUE_ENDPOINTS.GET_BY_FOLDER),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        }),
        expect.not.objectContaining({ folderId: expect.anything() })
      );
    });

    it('should scope by folder key through the request headers', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueCollection()
      );

      await queueService.getAllWithMethods({ folderKey: TEST_CONSTANTS.FOLDER_KEY });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === QUEUE_ENDPOINTS.GET_BY_FOLDER),
          headers: expect.objectContaining({
            [FOLDER_KEY]: TEST_CONSTANTS.FOLDER_KEY
          })
        }),
        expect.not.objectContaining({ folderKey: expect.anything() })
      );
    });

    it('should keep the deprecated getAll transform free of attached methods', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueCollection()
      );

      await queueService.getAll();

      // The deprecated method's contract: pure data — safe to enumerate,
      // structuredClone, and postMessage.
      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const transformed = (config as any).transformFn(createMockRawQueue());

      expect(transformed.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(transformed.getAllItems).toBeUndefined();
      expect(transformed.insertItem).toBeUndefined();
    });
  });

  describe('getAllItems', () => {
    it('should scope the listing to the queue and pass the folder', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection()
      );

      const result = await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      // The queue scoping filter is written with SDK field names and rewritten
      // to API names (queueId → queueDefinitionId) before delegating; the
      // folder moves into headers and must not leak into the query options.
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === QUEUE_ENDPOINTS.GET_ITEMS),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          transformFn: expect.any(Function)
        }),
        expect.objectContaining({
          filter: `queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`
        })
      );
      const [, passedOptions] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(passedOptions).not.toHaveProperty('folderId');

      expect(result).toBeDefined();
    });

    it('should scope by folder key through the request headers', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection()
      );

      await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        { folderKey: TEST_CONSTANTS.FOLDER_KEY }
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: TEST_CONSTANTS.FOLDER_KEY
          })
        }),
        expect.not.objectContaining({ folderKey: expect.anything() })
      );
    });

    it('should merge a caller filter with the queue filter and rewrite field names', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection()
      );

      await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        {
          folderId: TEST_CONSTANTS.FOLDER_ID,
          filter: "status eq 'Failed'",
          orderby: 'createdTime desc'
        }
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: `(status eq 'Failed') and queueDefinitionId eq ${QUEUE_TEST_CONSTANTS.QUEUE_ID}`,
          orderby: 'creationTime desc'
        })
      );
    });

    it('should pass pagination options through', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedQueueItemCollection(10)
      );

      await queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID, pageSize: TEST_CONSTANTS.PAGE_SIZE }
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
        { folderId: TEST_CONSTANTS.FOLDER_ID }
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
        { folderId: TEST_CONSTANTS.FOLDER_ID }
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
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(ValidationError);

      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should throw a ValidationError when no folder scoping is provided', async () => {
      await expect(queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID
      )).rejects.toBeInstanceOf(ValidationError);

      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(queueService.getAllItems(
        QUEUE_TEST_CONSTANTS.QUEUE_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('insertItemByName', () => {
    it('should post the item with queue name, defaulted priority, and untouched payload keys', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      const result = await queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
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
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
        {
          folderId: TEST_CONSTANTS.FOLDER_ID,
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
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should throw a ValidationError when queueName is missing', async () => {
      await expect(queueService.insertItemByName(
        undefined as unknown as string,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw a ValidationError when no folder scoping is provided', async () => {
      await expect(queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should scope by folder key through the request headers', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem());

      await queueService.insertItemByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT,
        { folderKey: TEST_CONSTANTS.FOLDER_KEY }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.ADD_ITEM,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: TEST_CONSTANTS.FOLDER_KEY
          })
        })
      );
    });
  });
  describe('getByName', () => {
    it('should look up the queue by exact name and attach methods', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawQueue()] });

      const result = await queueService.getByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          params: expect.objectContaining({
            '$filter': `Name eq '${QUEUE_TEST_CONSTANTS.QUEUE_NAME}'`,
            '$top': '1'
          })
        })
      );

      expect(result.id).toBe(QUEUE_TEST_CONSTANTS.QUEUE_ID);
      expect(result.name).toBe(QUEUE_TEST_CONSTANTS.QUEUE_NAME);
      expect(result.createdTime).toBe(QUEUE_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();
      expect(typeof result.getAllItems).toBe('function');
      expect(typeof result.insertItem).toBe('function');
    });

    it('should scope by folder key through the request headers', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawQueue()] });

      await queueService.getByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        { folderKey: TEST_CONSTANTS.FOLDER_KEY }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: TEST_CONSTANTS.FOLDER_KEY
          })
        })
      );
    });

    it('should throw a NotFoundError when no queue matches the name', async () => {
      mockApiClient.get.mockResolvedValue({ value: [] });

      await expect(queueService.getByName(
        QUEUE_TEST_CONSTANTS.QUEUE_NAME,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw a ValidationError when the name is missing', async () => {
      await expect(queueService.getByName(
        undefined as unknown as string,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getByKey', () => {
    it('should look up the queue by key with an unquoted GUID literal and attach methods', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawQueue()] });

      const result = await queueService.getByKey(
        QUEUE_TEST_CONSTANTS.QUEUE_KEY,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      // Key is Edm.Guid — the OData literal must be unquoted.
      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          params: expect.objectContaining({
            '$filter': `Key eq ${QUEUE_TEST_CONSTANTS.QUEUE_KEY}`,
            '$top': '1'
          })
        })
      );

      expect(result.key).toBe(QUEUE_TEST_CONSTANTS.QUEUE_KEY);
      expect(result.name).toBe(QUEUE_TEST_CONSTANTS.QUEUE_NAME);
      expect(typeof result.getAllItems).toBe('function');
      expect(typeof result.insertItem).toBe('function');
    });

    it('should throw a ValidationError when the key is not a GUID', async () => {
      await expect(queueService.getByKey(
        'not-a-guid',
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw a NotFoundError when no queue matches the key', async () => {
      mockApiClient.get.mockResolvedValue({ value: [] });

      await expect(queueService.getByKey(
        QUEUE_TEST_CONSTANTS.QUEUE_KEY,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw a ValidationError when no folder scoping is provided', async () => {
      await expect(queueService.getByKey(QUEUE_TEST_CONSTANTS.QUEUE_KEY))
        .rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('startTransaction', () => {
    it('should post the transaction request and return the transformed item', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem({
        Status: 'InProgress',
        StartProcessing: QUEUE_TEST_CONSTANTS.ITEM_START_PROCESSING
      }));

      const result = await queueService.startTransaction(
        { name: QUEUE_TEST_CONSTANTS.QUEUE_NAME },
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.START_TRANSACTION,
        {
          transactionData: { Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME }
        },
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe(QueueItemStatus.InProgress);
      expect(result!.processingStartTime).toBe(QUEUE_TEST_CONSTANTS.ITEM_START_PROCESSING);
      expect(result!.specificData).toEqual(QUEUE_TEST_CONSTANTS.ITEM_SPECIFIC_CONTENT);
    });

    it('should resolve the queue name first when selecting by id', async () => {
      mockApiClient.get.mockResolvedValue({ Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME });
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem({ Status: 'InProgress' }));

      await queueService.startTransaction(
        { id: QUEUE_TEST_CONSTANTS.QUEUE_ID },
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      // Resolution lookup: id -> name (the wire API only accepts the name)
      expect(mockApiClient.get).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.GET_BY_ID(QUEUE_TEST_CONSTANTS.QUEUE_ID),
        expect.objectContaining({ params: { '$select': 'Name' } })
      );
      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.START_TRANSACTION,
        { transactionData: { Name: QUEUE_TEST_CONSTANTS.QUEUE_NAME } },
        expect.anything()
      );
    });

    it('should not send a robot identifier', async () => {
      mockApiClient.post.mockResolvedValue(createMockRawQueueItem({ Status: 'InProgress' }));

      await queueService.startTransaction(
        { name: QUEUE_TEST_CONSTANTS.QUEUE_NAME },
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      // The API defines RobotIdentifier as the key of the robot that sent the
      // request, so the SDK never supplies one on the caller's behalf.
      const body = mockApiClient.post.mock.calls[0][1] as {
        transactionData: Record<string, unknown>;
      };
      expect(body.transactionData.RobotIdentifier).toBeUndefined();
    });

    it('should return null when no item is available (204 empty body)', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      const result = await queueService.startTransaction(
        { name: QUEUE_TEST_CONSTANTS.QUEUE_NAME },
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      expect(result).toBeNull();
    });

    it('should return null when the response body is an empty string', async () => {
      mockApiClient.post.mockResolvedValue('');

      const result = await queueService.startTransaction(
        { name: QUEUE_TEST_CONSTANTS.QUEUE_NAME },
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      );

      expect(result).toBeNull();
    });

    it('should throw a ValidationError when the queue selector is empty', async () => {
      await expect(queueService.startTransaction(
        {} as QueueRef,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw a ValidationError when no folder scoping is provided', async () => {
      await expect(queueService.startTransaction(
        { name: QUEUE_TEST_CONSTANTS.QUEUE_NAME },
        {}
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(queueService.startTransaction(
        { name: QUEUE_TEST_CONSTANTS.QUEUE_NAME },
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('completeTransaction', () => {
    it('should post a successful result with the output payload untouched', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      const options: QueueCompleteTransactionOptions = {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        outputData: QUEUE_TEST_CONSTANTS.ITEM_OUTPUT_CONTENT,
        progress: QUEUE_TEST_CONSTANTS.ITEM_PROGRESS
      };

      const result = await queueService.completeTransaction(
        QUEUE_TEST_CONSTANTS.ITEM_ID,
        QueueTransactionOutcome.Successful,
        options
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(QUEUE_TEST_CONSTANTS.ITEM_ID),
        expect.objectContaining({
          transactionResult: expect.objectContaining({
            IsSuccessful: true,
            Progress: QUEUE_TEST_CONSTANTS.ITEM_PROGRESS
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

      // Output keys are user-defined — sent exactly as provided
      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.transactionResult.Output).toEqual(QUEUE_TEST_CONSTANTS.ITEM_OUTPUT_CONTENT);

      expect(result).toBeUndefined();
    });

    it('should post a failed result with the processing error in API casing', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      await queueService.completeTransaction(
        QUEUE_TEST_CONSTANTS.ITEM_ID,
        QueueTransactionOutcome.Failed,
        {
          folderId: TEST_CONSTANTS.FOLDER_ID,
          processingError: {
            reason: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_REASON,
            details: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_DETAILS,
            type: QueueExceptionType.BusinessException
          }
        }
      );

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.transactionResult.IsSuccessful).toBe(false);
      expect(body.transactionResult.ProcessingException).toEqual({
        Reason: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_REASON,
        Details: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_DETAILS,
        Type: QUEUE_TEST_CONSTANTS.TRANSACTION_FAILURE_TYPE,
        AssociatedImageFilePath: undefined
      });
    });

    it('should convert Date fields to ISO strings in the transaction result', async () => {
      mockApiClient.post.mockResolvedValue(undefined);

      const deferDate = new Date(QUEUE_TEST_CONSTANTS.ITEM_DEFER_DATE);

      await queueService.completeTransaction(
        QUEUE_TEST_CONSTANTS.ITEM_ID,
        QueueTransactionOutcome.Failed,
        { folderId: TEST_CONSTANTS.FOLDER_ID, deferDate }
      );

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.transactionResult.DeferDate).toBe(deferDate.toISOString());
    });

    it('should throw a ValidationError when itemId is missing', async () => {
      await expect(queueService.completeTransaction(
        undefined as unknown as number,
        QueueTransactionOutcome.Successful,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw a ValidationError when no folder scoping is provided', async () => {
      await expect(queueService.completeTransaction(
        QUEUE_TEST_CONSTANTS.ITEM_ID,
        QueueTransactionOutcome.Successful
      )).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(QUEUE_TEST_CONSTANTS.ERROR_QUEUE_ITEM_NOT_FOUND);
      mockApiClient.post.mockRejectedValue(error);

      await expect(queueService.completeTransaction(
        QUEUE_TEST_CONSTANTS.ITEM_ID,
        QueueTransactionOutcome.Successful,
        { folderId: TEST_CONSTANTS.FOLDER_ID }
      )).rejects.toThrow(QUEUE_TEST_CONSTANTS.ERROR_QUEUE_ITEM_NOT_FOUND);
    });
  });
});
