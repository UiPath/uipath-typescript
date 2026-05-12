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
import { NotFoundError, ValidationError } from '../../../../src/core/errors';

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

  describe('getByName', () => {
    it('should return a matching process with bound methods (delegates to getAll + helper)', async () => {
      mockApiClient.get.mockResolvedValue(
        createMockProcessesApiResponse([
          createMockProcess({ name: MAESTRO_TEST_CONSTANTS.PACKAGE_ID }),
        ]),
      );

      const result = await service.getByName(MAESTRO_TEST_CONSTANTS.PACKAGE_ID, {
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
      });

      expect(result.name).toBe(MAESTRO_TEST_CONSTANTS.PACKAGE_ID);
      expect(typeof result.getIncidents).toBe('function');
    });

    it('should throw ValidationError without calling getAll when the name is empty', async () => {
      await expect(service.getByName('   ')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate NotFoundError from the shared filter when no process matches', async () => {
      mockApiClient.get.mockResolvedValue(createMockProcessesApiResponse([createMockProcess()]));

      await expect(
        service.getByName(MAESTRO_TEST_CONSTANTS.MISSING_PROCESS_NAME, {
          folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should wire the init-time folderKey into the fallback chain', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
      const scopedService = new MaestroProcessesService(instance);

      mockApiClient.get.mockResolvedValue(
        createMockProcessesApiResponse([
          createMockProcess({
            name: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
            folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY_OTHER,
          }),
          createMockProcess({
            name: MAESTRO_TEST_CONSTANTS.PACKAGE_ID,
            folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
          }),
        ]),
      );

      const result = await scopedService.getByName(MAESTRO_TEST_CONSTANTS.PACKAGE_ID);

      expect(result.folderKey).toBe(MAESTRO_TEST_CONSTANTS.FOLDER_KEY);
    });

    it('should propagate API errors from getAll', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getByName(MAESTRO_TEST_CONSTANTS.PACKAGE_ID),
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});