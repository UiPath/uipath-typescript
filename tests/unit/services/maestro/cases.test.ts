// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CasesService } from '../../../../src/services/maestro/cases';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { 
  MAESTRO_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockCase, 
  createMockCasesGetAllApiResponse,
  createMockError 
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { ProcessType } from '../../../../src/models/maestro/cases.internal-types';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('CasesService', () => {
  let service: CasesService;
  let mockApiClient: any;

  beforeEach(async () => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    service = new CasesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all case management processes with instance statistics', async () => {
      
      const mockApiResponse = createMockCasesGetAllApiResponse([
        createMockCase(),
        createMockCase({ 
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY, 
          packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          name: MAESTRO_TEST_CONSTANTS.CASE_NAME
        })
      ]);
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement
          }
        }
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        name: MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT, // Service extracts name from packageId
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        folderName: TEST_CONSTANTS.FOLDER_NAME
      });

      expect(result[1]).toMatchObject({
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        name: MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT, // Service extracts name from packageId
        folderKey: MAESTRO_TEST_CONSTANTS.FOLDER_KEY,
        folderName: TEST_CONSTANTS.FOLDER_NAME
      });
    });

    it('should handle empty cases array', async () => {
      
      const mockApiResponse = { processes: [] };
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      expect(result).toEqual([]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement
          }
        }
      );
    });

    it('should handle response without processes property', async () => {
      
      const mockApiResponse = {
        // Response has data but no processes property
        someOtherProperty: MAESTRO_TEST_CONSTANTS.OTHER_PROPERTY,
      };
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      const result = await service.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
        {
          params: {
            processType: ProcessType.CaseManagement
          }
        }
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

    it('should extract case name from packageId with CaseManagement prefix', async () => {
      
      const mockApiResponse = createMockCasesGetAllApiResponse([
        createMockCase({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_NAME_WITH_PREFIX
        })
      ]);

      mockApiClient.get.mockResolvedValue(mockApiResponse);

      
      const result = await service.getAll();

      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_WITH_PREFIX);
    });

    it('should extract case name from packageId without CaseManagement prefix', async () => {

      const mockApiResponse = createMockCasesGetAllApiResponse([
        createMockCase({
          processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_NAME_WITHOUT_PREFIX
        })
      ]);

      mockApiClient.get.mockResolvedValue(mockApiResponse);


      const result = await service.getAll();

      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_WITHOUT_PREFIX);
    });
  });

  describe('getTop', () => {
    const mockResponse = [
      {
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        runCount: 10,
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY
      }
    ];

    const startDate = new Date('2026-04-01T00:00:00Z');
    const endDate = new Date('2026-05-01T00:00:00Z');

    it('should retrieve top case processes by run count', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getTop(startDate, endDate);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES,
        {
          commonParams: {
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
            isCaseManagement: true
          },
          timezoneOffset: 0
        },
        {}
      );
      expect(result).toEqual(mockResponse);
      expect(result).toHaveLength(1);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
    });

    it('should return empty array when no processes found', async () => {
      mockApiClient.post.mockResolvedValue([]);

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