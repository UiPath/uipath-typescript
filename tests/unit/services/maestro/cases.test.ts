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
  createMockTopRunCountResponse,
  createMockInstanceStatusTimeline,
  createMockTopFaultedCountResponse,
  createMockTopDurationResponse,
  createMockTopElementFailedCountResponse,
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

  describe('getTopRunCount', () => {
    const mockResponse = [
      createMockTopRunCountResponse({
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        runCount: MAESTRO_TEST_CONSTANTS.RUN_COUNT_CASE,
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY
      })
    ];

    it('should retrieve top case processes by run count with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getTopRunCount(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z')
      );

      expect(result).toHaveLength(1);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          commonParams: expect.objectContaining({ isCaseManagement: true })
        }),
        {}
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTopRunCount(new Date(), new Date())
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getInstanceStatusTimeline', () => {
    it('should call fetchInstanceStatusTimeline with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue([createMockInstanceStatusTimeline()]);

      const result = await service.getInstanceStatusTimeline(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
      );

      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_DATE_1);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
        expect.objectContaining({
          commonParams: expect.objectContaining({ isCaseManagement: true }),
        }),
        {},
      );
    });
  });

  describe('getTopFaultedCount', () => {
    it('should retrieve top case processes by failure count with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue([
        createMockTopFaultedCountResponse({
          packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          runCount: MAESTRO_TEST_CONSTANTS.FAULTED_COUNT_CASE,
        })
      ]);

      const result = await service.getTopFaultedCount(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
        { packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID }
      );

      expect(result).toHaveLength(1);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT);
      expect(result[0].faultedCount).toBe(MAESTRO_TEST_CONSTANTS.FAULTED_COUNT_CASE);
      expect((result[0] as any).runCount).toBeUndefined();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_WITH_FAILURE,
        expect.objectContaining({
          commonParams: expect.objectContaining({
            isCaseManagement: true,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          })
        }),
        {}
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTopFaultedCount(new Date(), new Date())
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getTopElementFailedCount', () => {
    it('should retrieve top elements by failure count with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue([createMockTopElementFailedCountResponse()]);

      const result = await service.getTopElementFailedCount(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
        { processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY }
      );

      expect(result).toHaveLength(1);
      expect(result[0].elementName).toBe(MAESTRO_TEST_CONSTANTS.ELEMENT_NAME_1);
      expect(result[0].failedCount).toBe(MAESTRO_TEST_CONSTANTS.ELEMENT_FAILED_COUNT_1);
      expect((result[0] as any).count).toBeUndefined();
      expect(result[0].elementType).toBe(MAESTRO_TEST_CONSTANTS.ELEMENT_TYPE_1);
      expect(result[0].processKey).toBe(MAESTRO_TEST_CONSTANTS.PROCESS_KEY);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.TOP_ELEMENTS_WITH_FAILURE,
        expect.objectContaining({
          commonParams: expect.objectContaining({
            isCaseManagement: true,
            processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
          })
        }),
        {}
      );
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTopElementFailedCount(new Date(), new Date())
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getTopExecutionDuration', () => {
    const mockResponse = [
      createMockTopDurationResponse({
        packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        duration: MAESTRO_TEST_CONSTANTS.DURATION_CASE,
        processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY
      })
    ];

    it('should retrieve top case processes by duration with isCaseManagement true', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getTopExecutionDuration(
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
        { packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID }
      );

      expect(result).toHaveLength(1);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID);
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.EXTRACTED_NAME_DEFAULT);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          commonParams: expect.objectContaining({
            isCaseManagement: true,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          })
        }),
        {}
      );
    });
  });

  describe('getElementStats', () => {
    it('should retrieve element stats for case instances', async () => {
      mockApiClient.post.mockResolvedValue([...MAESTRO_TEST_CONSTANTS.MOCK_ELEMENT_STATS]);

      const result = await service.getElementStats(
        MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
        MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
        new Date('2026-04-01T00:00:00Z'),
        new Date('2026-05-01T00:00:00Z'),
        MAESTRO_TEST_CONSTANTS.PACKAGE_VERSION
      );

      expect(result).toHaveLength(2);
      expect(result[0].elementId).toBe('Event_start');
      expect(result[0].successCount).toBe(2);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.ELEMENT_COUNT_BY_STATUS,
        expect.objectContaining({
          commonParams: expect.objectContaining({
            processKey: MAESTRO_TEST_CONSTANTS.CASE_PROCESS_KEY,
            packageId: MAESTRO_TEST_CONSTANTS.CASE_PACKAGE_ID,
          })
        }),
        {}
      );
    });
  });
});
