// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobService } from '../../../../src/services/orchestrator/jobs';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawJob,
  createMockTransformedJobCollection,
} from '../../../utils/mocks/jobs';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import {
  JobGetAllOptions,
  JobGetByIdOptions,
  JobGetResponse,
} from '../../../../src/models/orchestrator/jobs.types';
import { PaginatedResponse } from '../../../../src/utils/pagination';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { JOB_TEST_CONSTANTS } from '../../../utils/constants/jobs';
import { JOB_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('JobService Unit Tests', () => {
  let jobService: JobService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    vi.mocked(PaginationHelpers.getAll).mockReset();

    jobService = new JobService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all jobs without pagination options', async () => {
      const mockResponse = createMockTransformedJobCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await jobService.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === JOB_ENDPOINTS.GET_ALL),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return jobs filtered by folder ID', async () => {
      const mockResponse = createMockTransformedJobCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: JobGetAllOptions = {
        folderId: TEST_CONSTANTS.FOLDER_ID,
      };

      const result = await jobService.getAll(options);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
        }),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated jobs when pagination options provided', async () => {
      const mockResponse = createMockTransformedJobCollection(100, {
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10,
      });

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: JobGetAllOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
      };

      const result = await jobService.getAll(options) as PaginatedResponse<JobGetResponse>;

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should return jobs with filter options', async () => {
      const mockResponse = createMockTransformedJobCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: JobGetAllOptions = {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        filter: "State eq 'Running'",
      };

      const result = await jobService.getAll(options);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
          filter: "State eq 'Running'",
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(jobService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should get job by ID successfully with all fields mapped correctly', async () => {
      const mockJob = createMockRawJob();

      mockApiClient.get.mockResolvedValue(mockJob);

      const result = await jobService.getById(JOB_TEST_CONSTANTS.JOB_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(JOB_TEST_CONSTANTS.JOB_ID);
      expect(result.key).toBe(JOB_TEST_CONSTANTS.JOB_KEY);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_ID(JOB_TEST_CONSTANTS.JOB_ID),
        expect.objectContaining({
          params: {},
        })
      );

      // Verify field transformations
      // CreationTime -> createdTime
      expect(result.createdTime).toBe(JOB_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();

      // OrganizationUnitId -> folderId
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect((result as any).OrganizationUnitId).toBeUndefined();

      // ReleaseName -> processName
      expect(result.processName).toBe(JOB_TEST_CONSTANTS.PROCESS_NAME);
      expect((result as any).ReleaseName).toBeUndefined();
    });

    it('should get job by ID with folderId option', async () => {
      const mockJob = createMockRawJob();

      mockApiClient.get.mockResolvedValue(mockJob);

      const result = await jobService.getById(JOB_TEST_CONSTANTS.JOB_ID, {
        folderId: TEST_CONSTANTS.FOLDER_ID,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(JOB_TEST_CONSTANTS.JOB_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_ID(JOB_TEST_CONSTANTS.JOB_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        })
      );
    });

    it('should get job by ID with expand option', async () => {
      const mockJob = createMockRawJob();

      mockApiClient.get.mockResolvedValue(mockJob);

      const options: JobGetByIdOptions = {
        expand: 'Release,Robot,Machine',
      };

      const result = await jobService.getById(JOB_TEST_CONSTANTS.JOB_ID, options);

      expect(result).toBeDefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_ID(JOB_TEST_CONSTANTS.JOB_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$expand': 'Release,Robot,Machine',
          }),
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        jobService.getById(JOB_TEST_CONSTANTS.JOB_ID)
      ).rejects.toThrow(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
    });
  });
});
