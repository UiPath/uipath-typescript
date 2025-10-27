// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueueService } from '../../../../src/services/orchestrator/queues';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawQueue,
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
    const { config, executionContext, tokenManager } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    queueService = new QueueService(config, executionContext, tokenManager);
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
  });
});
