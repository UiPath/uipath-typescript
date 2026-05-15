// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MaestroProcessesService } from '../../../../src/services/maestro/processes';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { 
  MAESTRO_TEST_CONSTANTS,
  createMockProcess, 
  createMockProcessesApiResponse,
  createMockError, 
  TEST_CONSTANTS
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';

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

  describe('getTop', () => {
    const mockResponse = [
      {
        packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
        runCount: 5,
        processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY
      },
      {
        packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID_2,
        runCount: 3,
        processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY_2
      }
    ];

    const startDate = new Date('2026-04-01T00:00:00Z');
    const endDate = new Date('2026-05-01T00:00:00Z');

    it('should retrieve top processes by run count', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getTop(startDate, endDate);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES,
        {
          commonParams: {
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
            isCaseManagement: false
          },
          timezoneOffset: 0
        },
        {}
      );
      expect(result).toEqual(mockResponse);
      expect(result).toHaveLength(2);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.PACKAGE_ID);
      expect(result[0].runCount).toBe(5);
    });

    it('should return empty array when API returns null', async () => {
      mockApiClient.post.mockResolvedValue(null);

      const result = await service.getTop(startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTop(startDate, endDate)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});