// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MaestroProcessesService } from '../../../../src/services/maestro/processes';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { TimeInterval } from '../../../../src/models/maestro';
import {
  MAESTRO_TEST_CONSTANTS,
  createMockProcess,
  createMockProcessesApiResponse,
  createMockTopRunCountResponse,
  createMockInstanceStatusTimeline,
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

  describe('getTopRunCount', () => {
    const mockResponse = [
      createMockTopRunCountResponse(),
      createMockTopRunCountResponse({
        packageId: MAESTRO_TEST_CONSTANTS.PACKAGE_ID_2,
        runCount: MAESTRO_TEST_CONSTANTS.RUN_COUNT_PROCESS_2,
        processKey: MAESTRO_TEST_CONSTANTS.PROCESS_KEY_2
      })
    ];

    const startDate = new Date('2026-04-01T00:00:00Z');
    const endDate = new Date('2026-05-01T00:00:00Z');

    it('should retrieve top processes by run count', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getTopRunCount(startDate, endDate);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_RUN_COUNT,
        {
          commonParams: {
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
            isCaseManagement: false
          }
        },
        {}
      );
      expect(result).toHaveLength(2);
      expect(result[0].packageId).toBe(MAESTRO_TEST_CONSTANTS.PACKAGE_ID);
      expect(result[0].name).toBe(MAESTRO_TEST_CONSTANTS.PACKAGE_ID);
      expect(result[0].runCount).toBe(MAESTRO_TEST_CONSTANTS.RUN_COUNT_PROCESS_1);
    });

    it('should return empty array when API returns null', async () => {
      mockApiClient.post.mockResolvedValue(null);

      const result = await service.getTopRunCount(startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        service.getTopRunCount(startDate, endDate)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getInstanceStatusTimeline', () => {
    const mockResponse = [
      createMockInstanceStatusTimeline(),
      createMockInstanceStatusTimeline({
        startTime: MAESTRO_TEST_CONSTANTS.INSIGHTS_DATE_2,
        status: MAESTRO_TEST_CONSTANTS.INSIGHTS_STATUS_FAULTED,
        count: MAESTRO_TEST_CONSTANTS.INSIGHTS_COUNT_1,
      }),
    ];

    const startDate = new Date('2026-04-01T00:00:00Z');
    const endDate = new Date('2026-05-01T00:00:00Z');

    it('should retrieve instance status by date', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await service.getInstanceStatusTimeline(startDate, endDate);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
        {
          commonParams: {
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
            isCaseManagement: false,
          },
          timeSliceUnit: undefined,
          timezoneOffset: new Date().getTimezoneOffset() * -1,
        },
        {},
      );
      expect(result).toHaveLength(2);
      expect(result[0].startTime).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_DATE_1);
      expect(result[0].status).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_STATUS_COMPLETED);
      expect(result[0].count).toBe(MAESTRO_TEST_CONSTANTS.INSIGHTS_COUNT_2);
    });

    it('should pass groupBy as timeSliceUnit to the API', async () => {
      mockApiClient.post.mockResolvedValue(mockResponse);

      await service.getInstanceStatusTimeline(startDate, endDate, {
        groupBy: TimeInterval.Hour,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
        expect.objectContaining({
          timeSliceUnit: TimeInterval.Hour,
        }),
        {},
      );
    });

    it('should return empty array when API returns null', async () => {
      mockApiClient.post.mockResolvedValue(null);

      const result = await service.getInstanceStatusTimeline(startDate, endDate);

      expect(result).toEqual([]);
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(
        createMockError(MAESTRO_TEST_CONSTANTS.ERROR_INSIGHTS_FAILED),
      );

      await expect(
        service.getInstanceStatusTimeline(startDate, endDate),
      ).rejects.toThrow(MAESTRO_TEST_CONSTANTS.ERROR_INSIGHTS_FAILED);
    });
  });
});
