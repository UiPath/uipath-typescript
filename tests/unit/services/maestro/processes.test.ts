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
});