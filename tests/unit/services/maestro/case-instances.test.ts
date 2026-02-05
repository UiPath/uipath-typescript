// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CaseInstancesService } from '../../../../src/services/maestro/cases/case-instances';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { FOLDER_KEY } from '../../../../src/utils/constants/headers';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  MAESTRO_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockCaseInstance,
  createMockRawCaseInstance,
  createMockCaseJsonResponse,
  createMockCaseJsonWithStages,
  createMockCaseJsonWithSections,
  createMockCaseInstanceExecutionHistory,
  createMockMaestroApiOperationResponse,
  createMockActionTasksResponse,
} from '../../../utils/mocks';
import { createMockBaseResponse } from '../../../utils/mocks/core';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import type {
  CaseInstanceGetAllWithPaginationOptions,
  CaseInstanceOperationOptions,
  CaseInstanceReopenOptions,
  CaseInstanceGetResponse
} from '../../../../src/models/maestro';
import type { PaginatedResponse } from '../../../../src/utils/pagination/types';
import { ProcessType } from '../../../../src/models/maestro/cases.internal-types';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Use vi.hoisted to ensure mockPaginationHelpers is available during hoisting
const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('CaseInstancesService', () => {
  let service: CaseInstancesService;
  let mockApiClient: any;

  beforeEach(async () => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    service = new CaseInstancesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all case instances without pagination', async () => {
      // Mock the pagination helper to return our test data
      const mockResponse = {
        items: [createMockCaseInstance()],
        totalCount: 1
      };
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await service.getAll();

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          processType: ProcessType.CaseManagement
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated case instances when pagination options provided', async () => {
      const mockResponse = {
        items: [createMockCaseInstance()],
        totalCount: 100,
        hasNextPage: true,
        nextCursor: { value: TEST_CONSTANTS.NEXT_CURSOR },
        previousCursor: undefined,
        currentPage: 1,
        totalPages: 10,
        supportsPageJump: true
      };
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: CaseInstanceGetAllWithPaginationOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE
      } as CaseInstanceGetAllWithPaginationOptions;

      const result = await service.getAll(options) as PaginatedResponse<CaseInstanceGetResponse>;

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
          processType: ProcessType.CaseManagement
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
    });

    it('should handle filtering options', async () => {
      // Mock the pagination helper to return our test data
      const mockResponse = {
        items: [],
        totalCount: 0
      };
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: CaseInstanceGetAllWithPaginationOptions = {
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        errorCode: MAESTRO_TEST_CONSTANTS.ERROR_CODE
      };

      await service.getAll(options);

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          errorCode: MAESTRO_TEST_CONSTANTS.ERROR_CODE,
          processType: ProcessType.CaseManagement
        })
      );
    });

    it('should handle API errors', async () => {
      // Mock the pagination helper to throw an error
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should return case instance by ID with operation methods and transformed properties', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      
      // Mock raw API response with UTC time fields (before transformation)
      const mockRawApiResponse = createMockRawCaseInstance();
      
      const mockCaseJsonResponse = createMockCaseJsonResponse();

      mockApiClient.get
        .mockResolvedValueOnce(mockRawApiResponse)
        .mockResolvedValueOnce(mockCaseJsonResponse);
      
      const result = await service.getById(instanceId, folderKey);

      // Verify API calls
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.CASES.GET_CASE_JSON(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      // Verify the result has the transformed properties (PascalCase -> camelCase)
      expect(result).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID);
      expect(result).toHaveProperty('packageKey', MAESTRO_TEST_CONSTANTS.PACKAGE_KEY);
      expect(result).toHaveProperty('packageId', MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
      expect(result).toHaveProperty('latestRunStatus', TEST_CONSTANTS.RUNNING);
      expect(result).toHaveProperty('startedTime', MAESTRO_TEST_CONSTANTS.START_TIME); // StartedTimeUtc -> startedTime
      expect(result).not.toHaveProperty('startedTimeUtc'); // Original field should be removed
      
      // Verify case JSON fields are present (from enhancement)
      expect(result).toHaveProperty('caseType', MAESTRO_TEST_CONSTANTS.CASE_JSON_RESPONSE.root.name);
      expect(result).toHaveProperty('caseTitle', MAESTRO_TEST_CONSTANTS.CASE_JSON_RESPONSE.root.description);
      expect(result).toHaveProperty('caseAppConfig');
      expect(result.caseAppConfig).toBeDefined();
      
      // Verify operation methods are attached
      expect(result).toHaveProperty('close');
      expect(result).toHaveProperty('pause');
      expect(result).toHaveProperty('reopen');
      expect(typeof result.pause).toBe('function');
      expect(typeof result.resume).toBe('function');
      expect(typeof result.reopen).toBe('function');
      expect(result).toHaveProperty('getExecutionHistory');
      expect(result).toHaveProperty('getStages');
      expect(result).toHaveProperty('getActionTasks');
    });

    it('should handle case JSON without caseAppConfig', async () => {
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      
      // Mock raw API response with UTC time fields (before transformation)
      const mockRawApiResponse = createMockRawCaseInstance();

      // Case JSON without caseAppConfig
      const mockCaseJson = createMockBaseResponse({
        root: {
          name: MAESTRO_TEST_CONSTANTS.CASE_TYPE,
          description: MAESTRO_TEST_CONSTANTS.CASE_SUMMARY
          // No caseAppConfig
        }
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockRawApiResponse)
        .mockResolvedValueOnce(mockCaseJson);
      
      const result = await service.getById(instanceId, folderKey);
      
      expect(result).toHaveProperty('caseType', MAESTRO_TEST_CONSTANTS.CASE_TYPE);
      expect(result).toHaveProperty('caseTitle', MAESTRO_TEST_CONSTANTS.CASE_SUMMARY);
      expect(result).not.toHaveProperty('caseAppConfig');
    });

    it('should remove id field from overview items in caseAppConfig', async () => {
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      
      const mockRawApiResponse = createMockRawCaseInstance();
      const mockCaseJson = createMockCaseJsonWithSections();

      mockApiClient.get
        .mockResolvedValueOnce(mockRawApiResponse)
        .mockResolvedValueOnce(mockCaseJson);
      
      const result = await service.getById(instanceId, folderKey);
      
      expect(result).toHaveProperty('caseAppConfig');
      expect(result.caseAppConfig).toBeDefined();
      expect(result.caseAppConfig).toHaveProperty('overview');
      
      const overview = result.caseAppConfig?.overview;
      expect(Array.isArray(overview)).toBe(true);
      expect(overview).toHaveLength(2);
      
      // Verify id field is removed from overview items
      overview?.forEach((item: any) => {
        expect(item).not.toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('details');
      });
      
      // Verify constants are used correctly
      if (overview) {
        expect(overview[0].title).toBe(MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_TITLE);
        expect(overview[0].details).toBe(MAESTRO_TEST_CONSTANTS.CASE_APP_OVERVIEW_DETAILS);
      }
    });

    it('should handle case JSON with empty description', async () => {
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      
      // Mock raw API response with UTC time fields (before transformation)
      const mockRawApiResponse = createMockRawCaseInstance();

      // Case JSON with empty description
      const mockCaseJson = createMockBaseResponse({
        root: {
          name: MAESTRO_TEST_CONSTANTS.CASE_TYPE,
          description: ''
        }
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockRawApiResponse)
        .mockResolvedValueOnce(mockCaseJson);
      
      const result = await service.getById(instanceId, folderKey);
      
      expect(result).toHaveProperty('caseType', MAESTRO_TEST_CONSTANTS.CASE_TYPE);
      expect(result).not.toHaveProperty('caseTitle'); // Should not have caseTitle when description is empty
      expect(result).not.toHaveProperty('caseAppConfig');
    });

    it('should handle case JSON fetch failure', async () => {
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      
      // Mock raw API response with UTC time fields (before transformation)
      const mockRawApiResponse = createMockRawCaseInstance();

      mockApiClient.get
        .mockResolvedValueOnce(mockRawApiResponse)
        .mockRejectedValueOnce(new Error('Case JSON fetch failed'));
      
      const result = await service.getById(instanceId, folderKey);
      
      expect(result).toHaveProperty('instanceId', instanceId);
      expect(result).not.toHaveProperty('caseType');
      expect(result).not.toHaveProperty('caseTitle');
    });

    it('should handle initial API error', async () => {
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(service.getById(MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should return instance without enhancement when folderKey is missing', async () => {
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      
      // Mock raw API response without folderKey (using override to set it to undefined)
      const mockRawApiResponse = createMockRawCaseInstance({ folderKey: undefined });

      mockApiClient.get.mockResolvedValueOnce(mockRawApiResponse);
      
      const result = await service.getById(instanceId, folderKey);

      // Verify only one API call was made (no case JSON call)
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      // Verify the result doesn't have enhanced properties
      expect(result).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID);
      expect(result).not.toHaveProperty('caseType');
      expect(result).not.toHaveProperty('caseTitle');
      expect(result).not.toHaveProperty('caseAppConfig');
      // folderKey is undefined, which triggers the early return
      expect(result.folderKey).toBeUndefined();
    });
  });

  describe('close', () => {
    it('should close case instance successfully', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: CaseInstanceOperationOptions = {
        comment: MAESTRO_TEST_CONSTANTS.CANCEL_COMMENT
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: TEST_CONSTANTS.CANCELLED
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);

      const result = await service.close(instanceId, folderKey, options);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.CANCEL(instanceId),
        options,
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApiResponse);
    });

    it('should close case instance without options', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: TEST_CONSTANTS.CANCELLED
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);
      
      const result = await service.close(instanceId, folderKey);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.CANCEL(instanceId),
        {},
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApiResponse);
    });

    it('should handle API errors', async () => {
      
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);
      
      await expect(service.close(MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('pause', () => {
    it('should pause case instance successfully', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: CaseInstanceOperationOptions = {
        comment: 'Pausing case instance'
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: MAESTRO_TEST_CONSTANTS.TASK_STATUS_PAUSED
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);

      const result = await service.pause(instanceId, folderKey, options);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.PAUSE(instanceId),
        options,
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApiResponse);
    });

    it('should handle API errors', async () => {
      
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);
      
      await expect(service.pause(MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('resume', () => {
    it('should resume case instance successfully', async () => {

      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: CaseInstanceOperationOptions = {
        comment: 'Resuming case instance'
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: TEST_CONSTANTS.RUNNING
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);

      const result = await service.resume(instanceId, folderKey, options);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.RESUME(instanceId),
        options,
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApiResponse);
    });

    it('should handle API errors', async () => {

      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.resume(MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('reopen', () => {
    it('should reopen case instance successfully with stageId and comment', async () => {
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: CaseInstanceReopenOptions = {
        stageId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID,
        comment: MAESTRO_TEST_CONSTANTS.TEST_COMMENT
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: TEST_CONSTANTS.RUNNING
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);

      const result = await service.reopen(instanceId, folderKey, options);

      // Verify API is called with transformed request body (PascalCase)
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.CASES.REOPEN(instanceId),
        {
          StartElementId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID,
          Comment: MAESTRO_TEST_CONSTANTS.TEST_COMMENT
        },
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApiResponse);
    });

    it('should reopen case instance with only stageId', async () => {
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: CaseInstanceReopenOptions = {
        stageId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: TEST_CONSTANTS.RUNNING
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);

      const result = await service.reopen(instanceId, folderKey, options);

      // Verify API is called with transformed request body (PascalCase, no Comment)
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.CASES.REOPEN(instanceId),
        {
          StartElementId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID
        },
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockApiResponse);
    });

    it('should handle API errors', async () => {
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      const options: CaseInstanceReopenOptions = {
        stageId: MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID
      };

      await expect(service.reopen(
        MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID,
        MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        options
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getExecutionHistory', () => {
    it('should return execution history for case instance with proper transformation', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;

      // Mock raw API response (before transformation) with UTC time fields
      const mockRawApiResponse = createMockCaseInstanceExecutionHistory();

      mockApiClient.get.mockResolvedValue(mockRawApiResponse);
      
      const result = await service.getExecutionHistory(instanceId, folderKey);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.CASES.GET_ELEMENT_EXECUTIONS(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      // Verify the result has the transformed properties
      expect(result).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID);
      expect(result).toHaveProperty('elementExecutions');
      expect(Array.isArray(result.elementExecutions)).toBe(true);
      expect(result.elementExecutions).toHaveLength(1);
      
      // Verify transformation of element execution
      const elementExecution = result.elementExecutions[0];
      expect(elementExecution).toHaveProperty('elementId', MAESTRO_TEST_CONSTANTS.CASE_TASK_ID);
      expect(elementExecution).toHaveProperty('startedTime', MAESTRO_TEST_CONSTANTS.START_TIME); // Transformed field
      expect(elementExecution).toHaveProperty('completedTime', MAESTRO_TEST_CONSTANTS.END_TIME); // Transformed field
      expect(elementExecution).toHaveProperty('parentElementId', MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID);
      
      // Verify that raw UTC fields are not present (transformed away)
      expect(elementExecution).not.toHaveProperty('startedTimeUtc');

      // Verify transformation of nested element runs
      expect(elementExecution).toHaveProperty('elementRuns');
      expect(Array.isArray(elementExecution.elementRuns)).toBe(true);
      expect(elementExecution.elementRuns).toHaveLength(1);
      
      const elementRun = elementExecution.elementRuns[0];
      expect(elementRun).toHaveProperty('elementRunId', MAESTRO_TEST_CONSTANTS.ELEMENT_RUN_ID);
      expect(elementRun).toHaveProperty('startedTime', MAESTRO_TEST_CONSTANTS.START_TIME); // Transformed field
      expect(elementRun).toHaveProperty('completedTime', MAESTRO_TEST_CONSTANTS.END_TIME); // Transformed field
      expect(elementRun).toHaveProperty('parentElementRunId', null);
      
      // Verify that raw UTC fields are not present in nested runs (transformed away)
      expect(elementRun).not.toHaveProperty('completedTimeUtc');
    });

    it('should handle API errors', async () => {
      
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);
      
      await expect(service.getExecutionHistory(MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getStages', () => {
    const instanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;

    it('should return case stages with tasks, SLA, and execution data', async () => {
      const mockExecutionHistory = createMockCaseInstanceExecutionHistory();
      const mockCaseJson = createMockCaseJsonWithStages(); // Default scenario with all features

      mockApiClient.get
        .mockResolvedValueOnce(mockExecutionHistory)
        .mockResolvedValueOnce(mockCaseJson);

      const result = await service.getStages(instanceId, folderKey);

      // Verify API calls
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.CASES.GET_ELEMENT_EXECUTIONS(instanceId),
        { headers: expect.objectContaining({ [FOLDER_KEY]: folderKey }) }
      );
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.CASES.GET_CASE_JSON(instanceId),
        { headers: expect.objectContaining({ [FOLDER_KEY]: folderKey }) }
      );

      // Verify stage data
      expect(result).toHaveLength(1);
      const stage = result[0];
      expect(stage.id).toBe(MAESTRO_TEST_CONSTANTS.CASE_STAGE_ID);
      expect(stage.name).toBe(MAESTRO_TEST_CONSTANTS.CASE_STAGE_NAME);
      
      // Verify SLA data
      expect(stage.sla).toBeDefined();
      expect(stage.sla).toHaveProperty('length', MAESTRO_TEST_CONSTANTS.SLA_COUNT_14_DAYS);
      expect(stage.sla).toHaveProperty('duration', MAESTRO_TEST_CONSTANTS.SLA_DURATION_DAYS);
      expect(stage.sla!.escalationRule).toHaveLength(1);
      
      // Verify task data with execution history
      expect(stage.tasks).toHaveLength(1);
      const task = stage.tasks[0][0];
      expect(task.id).toBe(MAESTRO_TEST_CONSTANTS.CASE_TASK_ID);
      expect(task.name).toBe(MAESTRO_TEST_CONSTANTS.CASE_TASK_NAME);
      expect(task.status).toBe(MAESTRO_TEST_CONSTANTS.TASK_STATUS_COMPLETED);
      expect(task.startedTime).toBe(MAESTRO_TEST_CONSTANTS.START_TIME);
      expect(task.completedTime).toBe(MAESTRO_TEST_CONSTANTS.END_TIME);
    });

    it('should handle edge cases gracefully', async () => {
      // Test missing case JSON
      mockApiClient.get
        .mockResolvedValueOnce(createMockCaseInstanceExecutionHistory())
        .mockResolvedValueOnce(null);

      let result = await service.getStages(instanceId, folderKey);
      expect(result).toEqual([]);
      
      mockApiClient.get.mockReset();

      // Test empty nodes
      mockApiClient.get
        .mockResolvedValueOnce(createMockCaseInstanceExecutionHistory())
        .mockResolvedValueOnce(createMockCaseJsonWithStages('empty'));

      result = await service.getStages(instanceId, folderKey);
      expect(result).toEqual([]);
      
      mockApiClient.get.mockReset();

      // Test stage without tasks
      mockApiClient.get
        .mockResolvedValueOnce(createMockCaseInstanceExecutionHistory())
        .mockResolvedValueOnce(createMockCaseJsonWithStages('no-tasks'));
      
      result = await service.getStages(instanceId, folderKey);
      expect(result).toHaveLength(1);
      expect(result[0].tasks).toEqual([]);
      
      mockApiClient.get.mockReset();

      // Test stage without SLA
      mockApiClient.get
        .mockResolvedValueOnce(createMockCaseInstanceExecutionHistory())
        .mockResolvedValueOnce(createMockCaseJsonWithStages('no-sla'));
      
      result = await service.getStages(instanceId, folderKey);
      expect(result).toHaveLength(1);
      expect(result[0].sla).toBeUndefined();
      
      mockApiClient.get.mockReset();

      // Test task name from bindings
      mockApiClient.get
        .mockResolvedValueOnce(createMockCaseInstanceExecutionHistory())
        .mockResolvedValueOnce(createMockCaseJsonWithStages('binding-task'));
      
      result = await service.getStages(instanceId, folderKey);
      expect(result).toHaveLength(1);
      expect(result[0].tasks[0][0].name).toBe(MAESTRO_TEST_CONSTANTS.BINDING_DEFAULT_RESOLVED);
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.get
        .mockRejectedValueOnce(new Error(TEST_CONSTANTS.ERROR_MESSAGE))
        .mockRejectedValueOnce(new Error(TEST_CONSTANTS.ERROR_MESSAGE));
      
      const result = await service.getStages(instanceId, folderKey);
      expect(result).toEqual([]);

      mockApiClient.get
        .mockResolvedValueOnce(createMockCaseInstanceExecutionHistory())
        .mockRejectedValueOnce(new Error(TEST_CONSTANTS.ERROR_MESSAGE));
      
      const result2 = await service.getStages(instanceId, folderKey);
      expect(result2).toEqual([]);
    });
  });

  describe('getActionTasks', () => {
    it('should return human in the loop tasks for case instance', async () => {
      
      const caseInstanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const mockResponse = createMockActionTasksResponse();

      const mockTaskService = {
        getAll: vi.fn().mockResolvedValue(mockResponse)
      };
      (service as any).taskService = mockTaskService;

      const result = await service.getActionTasks(caseInstanceId);

      expect(mockTaskService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringContaining(caseInstanceId),
          expand: expect.any(String)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should combine existing filter with case instance filter', async () => {
      
      const caseInstanceId = MAESTRO_TEST_CONSTANTS.CASE_INSTANCE_ID;
      const existingFilter = 'Status eq \'Pending\'';
      const mockResponse = {
        items: [],
        totalCount: 0
      };

      const mockTaskService = {
        getAll: vi.fn().mockResolvedValue(mockResponse)
      };
      (service as any).taskService = mockTaskService;

      const options = {
        filter: existingFilter
      };

      const result = await service.getActionTasks(caseInstanceId, options);

      expect(mockTaskService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: expect.stringMatching(new RegExp(`.*${caseInstanceId}.*${existingFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*`)),
          expand: expect.any(String)
        })
      );

      expect(result).toEqual(mockResponse);
    });

  });
});