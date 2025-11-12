// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessService } from '../../../../src/services/orchestrator/processes';
import { PROCESS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { 
  createMockRawOrchestratorProcess, 
  createMockProcessStartResponse,
  createMockProcessStartApiResponse,
  createMockOrchestratorProcesses
} from '../../../utils/mocks/processes';
import { 
  createMockError, 
  TEST_CONSTANTS
} from '../../../utils/mocks';
import { 
  PROCESS_TEST_CONSTANTS
} from '../../../utils/constants';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { JobPriority, ProcessGetAllOptions, ProcessGetByIdOptions, ProcessStartRequest } from '../../../../src/models/orchestrator/processes.types';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';
import { RequestOptions } from '../../../../src/models/common';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  // Import/re-export the mock utilities from core
  return import('../../../utils/mocks/core');
});

// Setup mocks at module level
// NOTE: We do NOT mock transformData - we want to test the actual transformation logic!
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('ProcessService Unit Tests', () => {
  let service: ProcessService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { config, executionContext, tokenManager } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    service = new ProcessService(config, executionContext, tokenManager);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all processes with pagination when pagination options provided', async () => {
      const mockProcesses = createMockOrchestratorProcesses(2);
      const mockResponse = {
        items: mockProcesses,
        totalCount: 2,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 1
      };

      // Mock PaginationHelpers.getAll
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await service.getAll({ pageSize: TEST_CONSTANTS.PAGE_SIZE });

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: PROCESS_ENDPOINTS.GET_ALL,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(2);
    });

    it('should return all processes without pagination when no pagination options provided', async () => {
      const mockProcesses = createMockOrchestratorProcesses(2);
      const mockResponse = {
        items: mockProcesses,
        totalCount: 2
      };

      // Mock PaginationHelpers.getAll
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await service.getAll();

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: PROCESS_ENDPOINTS.GET_ALL,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(2);
    });

    it('should handle folderId filter', async () => {
      const mockResponse = {
        items: createMockOrchestratorProcesses(1),
        totalCount: 1
      };

      // Mock PaginationHelpers.getAll
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: ProcessGetAllOptions = { folderId: TEST_CONSTANTS.FOLDER_ID };
      await service.getAll(options);

      // Verify PaginationHelpers.getAll was called with folderId
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: PROCESS_ENDPOINTS.GET_ALL,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({ folderId: TEST_CONSTANTS.FOLDER_ID })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      
      // Mock PaginationHelpers.getAll to throw error
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

  });

  describe('getById', () => {
    it('should get process by ID successfully with all fields mapped correctly', async () => {
      const mockProcess = createMockRawOrchestratorProcess();
      mockApiClient.get.mockResolvedValue(mockProcess);

      const result = await service.getById(
        PROCESS_TEST_CONSTANTS.PROCESS_ID, 
        TEST_CONSTANTS.FOLDER_ID
      );
      
      // Verify the result (after transformation)
      expect(result).toBeDefined();
      expect(result.id).toBe(PROCESS_TEST_CONSTANTS.PROCESS_ID);
      expect(result.lastModifiedTime).toBe(PROCESS_TEST_CONSTANTS.TIME);
      expect(result.createdTime).toBe(PROCESS_TEST_CONSTANTS.TIME);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result.packageKey).toBe(PROCESS_TEST_CONSTANTS.PROCESS_KEY);
      expect(result.packageVersion).toBe(PROCESS_TEST_CONSTANTS.PACKAGE_VERSION);

      // Verify the API call has correct endpoint and headers
      expect(mockApiClient.get).toHaveBeenCalledWith(
        PROCESS_ENDPOINTS.GET_BY_ID(PROCESS_TEST_CONSTANTS.PROCESS_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          params: expect.any(Object)
        })
      );
    });

    it('should get process by ID with options', async () => {
      const mockProcess = createMockRawOrchestratorProcess();
      mockApiClient.get.mockResolvedValue(mockProcess);

      const options: ProcessGetByIdOptions = { expand: PROCESS_TEST_CONSTANTS.EXPAND_ARGUMENTS };
      await service.getById(
        PROCESS_TEST_CONSTANTS.PROCESS_ID, 
        TEST_CONSTANTS.FOLDER_ID,
        options
      );

      // Verify options are passed in params with $ prefix
      expect(mockApiClient.get).toHaveBeenCalledWith(
        PROCESS_ENDPOINTS.GET_BY_ID(PROCESS_TEST_CONSTANTS.PROCESS_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          params: expect.objectContaining({
            '$expand': PROCESS_TEST_CONSTANTS.EXPAND_ARGUMENTS
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(service.getById(
        PROCESS_TEST_CONSTANTS.PROCESS_ID, 
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('start', () => {
    it('should start process by processKey successfully with transformations applied', async () => {
      const mockJob = createMockProcessStartResponse();
      const mockResponse = createMockProcessStartApiResponse([mockJob]);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST as ProcessStartRequest;
      const result = await service.start(request, TEST_CONSTANTS.FOLDER_ID);

      // Verify the result with transformations applied
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(PROCESS_TEST_CONSTANTS.JOB_KEY);
      expect(result[0].processName).toBe(PROCESS_TEST_CONSTANTS.PROCESS_NAME);
      expect(result[0].folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result[0].state).toBe('Running');

      // Verify the API call has correct endpoint, body, and headers
      expect(mockApiClient.post).toHaveBeenCalledWith(
        PROCESS_ENDPOINTS.START_PROCESS,
        expect.objectContaining({
          startInfo: expect.objectContaining({
            releaseKey: PROCESS_TEST_CONSTANTS.PROCESS_KEY,
            jobPriority: JobPriority.Normal,
            inputArguments: PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST.inputArguments
          })
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          params: expect.any(Object)
        })
      );
    });

    it('should start process by processName successfully with transformations applied', async () => {
      const mockJob = createMockProcessStartResponse();
      const mockResponse = createMockProcessStartApiResponse([mockJob]);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST_WITH_NAME as ProcessStartRequest;
      const result = await service.start(request, TEST_CONSTANTS.FOLDER_ID);

      // Verify the result
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(PROCESS_TEST_CONSTANTS.JOB_KEY);

      // Verify the API call has correct body with processName mapped to releaseName
      expect(mockApiClient.post).toHaveBeenCalledWith(
        PROCESS_ENDPOINTS.START_PROCESS,
        expect.objectContaining({
          startInfo: expect.objectContaining({
            releaseName: PROCESS_TEST_CONSTANTS.PROCESS_NAME,
            jobPriority: JobPriority.High,
            inputArguments: PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST_WITH_NAME.inputArguments
          })
        }),
        expect.any(Object)
      );
    });

    it('should start process with options', async () => {
      const mockJob = createMockProcessStartResponse();
      const mockResponse = createMockProcessStartApiResponse([mockJob]);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST as ProcessStartRequest;
      const options: RequestOptions = { expand: PROCESS_TEST_CONSTANTS.EXPAND_ROBOT };
      await service.start(request, TEST_CONSTANTS.FOLDER_ID, options);

      // Verify options are passed in params with $ prefix
      expect(mockApiClient.post).toHaveBeenCalledWith(
        PROCESS_ENDPOINTS.START_PROCESS,
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          params: expect.objectContaining({
            '$expand': PROCESS_TEST_CONSTANTS.EXPAND_ROBOT
          })
        })
      );
    });

    it('should handle multiple jobs returned from start', async () => {
      const mockJobs = [
        createMockProcessStartResponse(),
        createMockProcessStartResponse({ 
          key: PROCESS_TEST_CONSTANTS.JOB_KEY,
          id: 2
        })
      ];
      const mockResponse = createMockProcessStartApiResponse(mockJobs);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST as ProcessStartRequest;
      const result = await service.start(request, TEST_CONSTANTS.FOLDER_ID);

      // Verify the result
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[1].key).toBe(PROCESS_TEST_CONSTANTS.JOB_KEY);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      const request = PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST as ProcessStartRequest;
      await expect(service.start(request, TEST_CONSTANTS.FOLDER_ID))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
