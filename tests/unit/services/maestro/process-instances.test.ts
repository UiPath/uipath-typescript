// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessInstancesService } from '../../../../src/services/maestro/process-instances';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { FOLDER_KEY, CONTENT_TYPES } from '../../../../src/utils/constants/headers';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  MAESTRO_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockProcessInstance,
  createMockBpmnWithVariables,
  createMockExecutionHistory,
  createMockProcessVariables,
  createMockMaestroApiOperationResponse
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import type { 
  ProcessInstanceGetAllWithPaginationOptions,
  ProcessInstanceOperationOptions,
  ProcessInstanceGetVariablesOptions,
  RawProcessInstanceGetResponse,
  ProcessInstanceExecutionHistoryResponse
} from '../../../../src/models/maestro';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// Use vi.hoisted to ensure mockPaginationHelpers is available during hoisting
const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('ProcessInstancesService', () => {
  let service: ProcessInstancesService;
  let mockApiClient: any;

  beforeEach(async () => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    service = new ProcessInstancesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all process instances without pagination', async () => {
      // Mock the pagination helper to return our test data
      const mockResponse = {
        items: [createMockProcessInstance()],
        totalCount: 1,
        nextPage: null
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
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated process instances when pagination options provided', async () => {
      // Mock the pagination helper to return our test data
      const mockResponse = {
        items: [createMockProcessInstance()],
        totalCount: 1,
        nextPage: 'nextPage'
      };
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: ProcessInstanceGetAllWithPaginationOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
        cursor: {
          value: TEST_CONSTANTS.CURSOR_VALUE
        }
      };

      const result = await service.getAll(options);

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
          cursor: expect.objectContaining({
            value: TEST_CONSTANTS.CURSOR_VALUE
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle filtering options', async () => {
      // Mock the pagination helper to return our test data
      const mockResponse = {
        items: [],
        totalCount: 0,
        nextPage: null
      };
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: ProcessInstanceGetAllWithPaginationOptions = {
        processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
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
          processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
          errorCode: MAESTRO_TEST_CONSTANTS.ERROR_CODE
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
    it('should return process instance by ID with operation methods', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const mockApiResponse: RawProcessInstanceGetResponse = createMockProcessInstance();

      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getById(instanceId, folderKey);

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          })
        }
      );

      expect(result).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.INSTANCE_ID);
      expect(result).toHaveProperty('cancel');
      expect(result).toHaveProperty('pause');
      expect(result).toHaveProperty('resume');
      expect(result).toHaveProperty('getExecutionHistory');
      expect(result).toHaveProperty('getBpmn');
      expect(result).toHaveProperty('getVariables');
    });

    it('should handle API errors', async () => {
      
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      
      await expect(service.getById(MAESTRO_TEST_CONSTANTS.INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });


  describe('getExecutionHistory', () => {
    it('should return execution history for process instance', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const mockApiResponse: ProcessInstanceExecutionHistoryResponse[] = [createMockExecutionHistory()];

      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getExecutionHistory(instanceId);

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_EXECUTION_HISTORY(instanceId),
        {}
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', MAESTRO_TEST_CONSTANTS.SPAN_ID);
      expect(result[0]).toHaveProperty('traceId', MAESTRO_TEST_CONSTANTS.TRACE_ID);
    });

    it('should handle API errors', async () => {
      
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      
      await expect(service.getExecutionHistory(MAESTRO_TEST_CONSTANTS.INSTANCE_ID)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getBpmn', () => {
    it('should return BPMN XML for process instance', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const mockBpmnXml = createMockBpmnWithVariables();

      mockApiClient.get.mockResolvedValue(mockBpmnXml);

      
      const result = await service.getBpmn(instanceId, folderKey);

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_BPMN(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey,
            'Accept': CONTENT_TYPES.XML
          })
        }
      );

      expect(result).toBe(mockBpmnXml);
    });

    it('should handle API errors', async () => {
      
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      
      await expect(service.getBpmn(MAESTRO_TEST_CONSTANTS.INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('cancel', () => {
    it('should cancel process instance successfully', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: ProcessInstanceOperationOptions = {
        comment: MAESTRO_TEST_CONSTANTS.CANCEL_COMMENT
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: 'Cancelled'
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);

      
      const result = await service.cancel(instanceId, folderKey, options);

      
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

    it('should cancel process instance without options', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: 'Cancelled'
      });

      mockApiClient.post.mockResolvedValue(mockApiResponse);

      
      const result = await service.cancel(instanceId, folderKey);

      
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

      
      await expect(service.cancel(MAESTRO_TEST_CONSTANTS.INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('pause', () => {
    it('should pause process instance successfully', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: ProcessInstanceOperationOptions = {
        comment: 'Pausing instance'
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: 'Paused'
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

      
      await expect(service.pause(MAESTRO_TEST_CONSTANTS.INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('resume', () => {
    it('should resume process instance successfully', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: ProcessInstanceOperationOptions = {
        comment: 'Resuming instance'
      };
      const mockApiResponse = createMockMaestroApiOperationResponse({
        status: 'Running'
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

      
      await expect(service.resume(MAESTRO_TEST_CONSTANTS.INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getVariables', () => {
    it('should return variables for process instance with BPMN metadata', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const mockBpmnXml = createMockBpmnWithVariables({
        elementId: MAESTRO_TEST_CONSTANTS.START_EVENT_ID,
        elementName: MAESTRO_TEST_CONSTANTS.START_EVENT_NAME,
        variableId: MAESTRO_TEST_CONSTANTS.VARIABLE_ID,
        variableName: MAESTRO_TEST_CONSTANTS.VARIABLE_NAME
      });

      const mockVariablesResponse = createMockProcessVariables({
        globals: {
          [MAESTRO_TEST_CONSTANTS.VARIABLE_ID]: MAESTRO_TEST_CONSTANTS.VARIABLE_VALUE
        }
      });

      mockApiClient.get
        .mockResolvedValueOnce(mockBpmnXml) // First call for BPMN
        .mockResolvedValueOnce(mockVariablesResponse); // Second call for variables

      
      const result = await service.getVariables(instanceId, folderKey);

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_BPMN(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey,
            'Accept': CONTENT_TYPES.XML
          })
        }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_VARIABLES(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          }),
          params: undefined
        }
      );

      expect(result).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.INSTANCE_ID);
      expect(result).toHaveProperty('elements');
      expect(result).toHaveProperty('globalVariables');
      expect(result.globalVariables).toHaveLength(1);
      expect(result.globalVariables[0]).toMatchObject({
        id: MAESTRO_TEST_CONSTANTS.VARIABLE_ID,
        name: MAESTRO_TEST_CONSTANTS.VARIABLE_NAME,
        type: MAESTRO_TEST_CONSTANTS.VARIABLE_TYPE,
        elementId: MAESTRO_TEST_CONSTANTS.START_EVENT_ID,
        source: MAESTRO_TEST_CONSTANTS.START_EVENT_NAME,
        value: MAESTRO_TEST_CONSTANTS.VARIABLE_VALUE
      });
    });

    it('should return variables with parentElementId filter', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const options: ProcessInstanceGetVariablesOptions = {
        parentElementId: 'parent-element-123'
      };

      const mockVariablesResponse = createMockProcessVariables({
        globals: {},
        parentElementId: 'parent-element-123'
      });

      mockApiClient.get
        .mockResolvedValueOnce('<?xml version="1.0"?><bpmn:definitions></bpmn:definitions>')
        .mockResolvedValueOnce(mockVariablesResponse);

      
      const result = await service.getVariables(instanceId, folderKey, options);

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSTANCES.GET_VARIABLES(instanceId),
        {
          headers: expect.objectContaining({
            [FOLDER_KEY]: folderKey
          }),
          params: {
            parentElementId: 'parent-element-123'
          }
        }
      );

      expect(result.parentElementId).toBe('parent-element-123');
    });

    it('should handle BPMN fetch failure gracefully', async () => {
      
      const instanceId = MAESTRO_TEST_CONSTANTS.INSTANCE_ID;
      const folderKey = MAESTRO_TEST_CONSTANTS.FOLDER_KEY;
      const mockVariablesResponse = createMockProcessVariables({
        globals: {
          [MAESTRO_TEST_CONSTANTS.VARIABLE_ID]: MAESTRO_TEST_CONSTANTS.VARIABLE_VALUE
        }
      });

      // Mock console.warn to avoid test output
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockApiClient.get
        .mockRejectedValueOnce(new Error('BPMN fetch failed')) // First call fails
        .mockResolvedValueOnce(mockVariablesResponse); // Second call succeeds

      
      const result = await service.getVariables(instanceId, folderKey);

      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch BPMN metadata'),
        expect.any(Error)
      );

      expect(result).toHaveProperty('instanceId', MAESTRO_TEST_CONSTANTS.INSTANCE_ID);
      expect(result.globalVariables).toHaveLength(0); // No metadata available

      consoleSpy.mockRestore();
    });

    it('should handle API errors', async () => {
      
      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      
      await expect(service.getVariables(MAESTRO_TEST_CONSTANTS.INSTANCE_ID, MAESTRO_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});