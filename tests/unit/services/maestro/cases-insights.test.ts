// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CasesService } from '../../../../src/services/maestro/cases';
import { MAESTRO_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { TimeSliceUnit } from '../../../../src/models/common';
import {
  MAESTRO_TEST_CONSTANTS,
  createMockInstanceStatusByDate,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('CasesService - getInstanceStatusByDate', () => {
  let service: CasesService;
  let mockApiClient: any;

  beforeEach(async () => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
    service = new CasesService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return instance status data with required params only', async () => {
    const mockResponse = [
      createMockInstanceStatusByDate(),
      createMockInstanceStatusByDate({
        startTime: MAESTRO_TEST_CONSTANTS.INSIGHTS_DATE_2,
        status: MAESTRO_TEST_CONSTANTS.INSIGHTS_STATUS_FAULTED,
        count: MAESTRO_TEST_CONSTANTS.INSIGHTS_COUNT_1,
      }),
    ];
    mockApiClient.post.mockResolvedValue(mockResponse);

    const result = await service.getInstanceStatusByDate(
      MAESTRO_TEST_CONSTANTS.INSIGHTS_START_TIME,
      MAESTRO_TEST_CONSTANTS.INSIGHTS_END_TIME,
    );

    expect(mockApiClient.post).toHaveBeenCalledWith(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
      expect.objectContaining({
        commonParams: {
          startTime: MAESTRO_TEST_CONSTANTS.INSIGHTS_START_TIME,
          endTime: MAESTRO_TEST_CONSTANTS.INSIGHTS_END_TIME,
          isCaseManagement: true,
        },
        timezoneOffset: expect.any(Number),
      }),
      {},
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      startTime: MAESTRO_TEST_CONSTANTS.INSIGHTS_DATE_1,
      status: MAESTRO_TEST_CONSTANTS.INSIGHTS_STATUS_COMPLETED,
      count: MAESTRO_TEST_CONSTANTS.INSIGHTS_COUNT_2,
    });
  });

  it('should always send isCaseManagement as true', async () => {
    mockApiClient.post.mockResolvedValue([]);

    await service.getInstanceStatusByDate(
      MAESTRO_TEST_CONSTANTS.INSIGHTS_START_TIME,
      MAESTRO_TEST_CONSTANTS.INSIGHTS_END_TIME,
    );

    expect(mockApiClient.post).toHaveBeenCalledWith(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
      expect.objectContaining({
        commonParams: expect.objectContaining({
          isCaseManagement: true,
        }),
      }),
      {},
    );
  });

  it('should pass timeSliceUnit when provided', async () => {
    mockApiClient.post.mockResolvedValue([]);

    await service.getInstanceStatusByDate(
      MAESTRO_TEST_CONSTANTS.INSIGHTS_START_TIME,
      MAESTRO_TEST_CONSTANTS.INSIGHTS_END_TIME,
      { timeSliceUnit: TimeSliceUnit.Week },
    );

    expect(mockApiClient.post).toHaveBeenCalledWith(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
      expect.objectContaining({
        timeSliceUnit: TimeSliceUnit.Week,
      }),
      {},
    );
  });

  it('should compute timezoneOffset automatically', async () => {
    mockApiClient.post.mockResolvedValue([]);

    await service.getInstanceStatusByDate(
      MAESTRO_TEST_CONSTANTS.INSIGHTS_START_TIME,
      MAESTRO_TEST_CONSTANTS.INSIGHTS_END_TIME,
    );

    const callArgs = mockApiClient.post.mock.calls[0][1];
    expect(callArgs.timezoneOffset).toBe(new Date().getTimezoneOffset() * -1);
  });

  it('should return empty array when API returns no data', async () => {
    mockApiClient.post.mockResolvedValue(undefined);

    const result = await service.getInstanceStatusByDate(
      MAESTRO_TEST_CONSTANTS.INSIGHTS_START_TIME,
      MAESTRO_TEST_CONSTANTS.INSIGHTS_END_TIME,
    );

    expect(result).toEqual([]);
  });

  it('should handle API errors', async () => {
    const error = createMockError(MAESTRO_TEST_CONSTANTS.ERROR_INSIGHTS_FAILED);
    mockApiClient.post.mockRejectedValue(error);

    await expect(
      service.getInstanceStatusByDate(
        MAESTRO_TEST_CONSTANTS.INSIGHTS_START_TIME,
        MAESTRO_TEST_CONSTANTS.INSIGHTS_END_TIME,
      ),
    ).rejects.toThrow(MAESTRO_TEST_CONSTANTS.ERROR_INSIGHTS_FAILED);
  });
});
