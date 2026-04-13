// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MaestroProcessesService } from '../../../../src/services/maestro/processes';
import { MAESTRO_ENDPOINTS, PROCESS_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import {
  MAESTRO_TEST_CONSTANTS,
  createMockProcess,
  createMockProcessesApiResponse,
  createMockError,
  TEST_CONSTANTS,
  createMockProcessStartResponse,
  createMockProcessStartApiResponse,
} from '../../../utils/mocks';
import { PROCESS_TEST_CONSTANTS } from '../../../utils/constants';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { JobPriority, ProcessStartRequest } from '../../../../src/models/orchestrator/processes.types';
import { FOLDER_KEY } from '../../../../src/utils/constants/headers';
import { RequestOptions } from '../../../../src/models/common';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('MaestroProcessesService', () => {
  let service: MaestroProcessesService;
  let mockApiClient: any;

  beforeEach(async () => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    service = new MaestroProcessesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all processes with instance statistics', async () => {
      
      const mockApiResponse = createMockProcessesApiResponse([
        createMockProcess(),
        createMockProcess({ 
          processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY_2, 
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID_2,
          name: MAESTRO_TEST_CONSTANTS.PACKAGE_ID_2
        })
      ]);
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {}
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
        name: MAESTRO_TEST_CONSTANTS.PACKAGE_ID, // name should be set to packageId
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        folderName: 'Test Folder'
      });

      expect(result[1]).toMatchObject({
        processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY_2,
        packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID_2,
        name: MAESTRO_TEST_CONSTANTS.PACKAGE_ID_2,
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        folderName: 'Test Folder'
      });
    });

    it('should handle empty processes array', async () => {
      
      const mockApiResponse = { processes: [] };
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      
      expect(result).toEqual([]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {}
      );
    });

    it('should handle undefined processes in response', async () => {
      
      const mockApiResponse = {};
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      
      expect(result).toEqual([]);
    });

    it('should handle response without processes property', async () => {
      
      const mockApiResponse = {
        // Response has data but no processes property
        someOtherProperty: MAESTRO_TEST_CONSTANTS.OTHER_PROPERTY,
        metadata: { count: 0 }
      };
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {}
      );
      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      
      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should set name field to packageId for each process', async () => {
      
      const mockApiResponse = createMockProcessesApiResponse([
        createMockProcess({
          processKey: MAESTRO_TEST_CONSTANTS.CUSTOM_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.CUSTOM_PACKAGE_ID
        })
      ]);

      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.CUSTOM_PACKAGE_ID);
    });
  });

  describe('start', () => {
    it('should start process by processKey successfully with transformations applied', async () => {
      const mockJob = createMockProcessStartResponse();
      const mockResponse = createMockProcessStartApiResponse([mockJob]);
      mockApiClient.post.mockResolvedValue(mockResponse);

      const request = PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST as ProcessStartRequest;
      const result = await service.start(request, MAESTRO_TEST_CONSTANTS.FOLDER_KEY);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(PROCESS_TEST_CONSTANTS.JOB_KEY);
      expect(result[0].processName).toBe(PROCESS_TEST_CONSTANTS.PROCESS_NAME);
      expect(result[0].state).toBe('Running');

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
            [FOLDER_KEY]: MAESTRO_TEST_CONSTANTS.FOLDER_KEY
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
      const result = await service.start(request, MAESTRO_TEST_CONSTANTS.FOLDER_KEY);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(PROCESS_TEST_CONSTANTS.JOB_KEY);

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
      const result = await service.start(request, MAESTRO_TEST_CONSTANTS.FOLDER_KEY);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[1].key).toBe(PROCESS_TEST_CONSTANTS.JOB_KEY);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      const request = PROCESS_TEST_CONSTANTS.PROCESS_START_REQUEST as ProcessStartRequest;
      await expect(service.start(request, MAESTRO_TEST_CONSTANTS.FOLDER_KEY))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});