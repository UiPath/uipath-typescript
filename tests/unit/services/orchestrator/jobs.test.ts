// ===== IMPORTS =====
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JobService } from '../../../../src/services/orchestrator/jobs';
import { JOB_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockRawJob,
  createMockJobTransformed,
  createMockJobs,
} from '../../../utils/mocks/jobs';
import {
  createMockError,
  TEST_CONSTANTS
} from '../../../utils/mocks';
import {
  JOB_TEST_CONSTANTS
} from '../../../utils/constants';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { JobGetAllOptions, JobGetByIdOptions } from '../../../../src/models/orchestrator/jobs.types';
import { StopStrategy } from '../../../../src/models/orchestrator/processes.types';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

const mocks = vi.hoisted(() => {
  return import('../../../utils/mocks/core');
});

vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('JobService Unit Tests', () => {
  let service: JobService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    service = new JobService(instance);

    vi.mocked(PaginationHelpers.getAll).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all jobs with pagination when pagination options provided', async () => {
      const mockJobsList = createMockJobs(2);
      const mockResponse = {
        items: mockJobsList,
        totalCount: 2,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 1
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await service.getAll({ pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: JOB_ENDPOINTS.GET_ALL,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(2);
    });

    it('should return all jobs without pagination when no pagination options provided', async () => {
      const mockJobsList = createMockJobs(2);
      const mockResponse = {
        items: mockJobsList,
        totalCount: 2
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await service.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: JOB_ENDPOINTS.GET_ALL,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(2);
    });

    it('should handle folderId filter', async () => {
      const mockResponse = {
        items: createMockJobs(1),
        totalCount: 1
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: JobGetAllOptions = { folderId: TEST_CONSTANTS.FOLDER_ID };
      await service.getAll(options);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: JOB_ENDPOINTS.GET_ALL,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({ folderId: TEST_CONSTANTS.FOLDER_ID })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(service.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should get job by ID successfully with all fields mapped correctly', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      const result = await service.getById(JOB_TEST_CONSTANTS.JOB_ID);

      expect(result).toBeDefined();
      expect(result.id).toBe(JOB_TEST_CONSTANTS.JOB_ID);
      expect(result.key).toBe(JOB_TEST_CONSTANTS.JOB_KEY);
      expect(result.lastModifiedTime).toBe(JOB_TEST_CONSTANTS.TIME);
      expect(result.createdTime).toBe(JOB_TEST_CONSTANTS.TIME);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result.processName).toBe(JOB_TEST_CONSTANTS.PROCESS_NAME);
      expect(result.processVersionId).toBe(JOB_TEST_CONSTANTS.PROCESS_VERSION_ID);
      expect(result.packageType).toBe('Process');

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_ID(JOB_TEST_CONSTANTS.JOB_ID),
        expect.objectContaining({
          params: expect.any(Object)
        })
      );
    });

    it('should get job by ID with folder context', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      await service.getById(JOB_TEST_CONSTANTS.JOB_ID, { folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_ID(JOB_TEST_CONSTANTS.JOB_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          }),
          params: expect.any(Object)
        })
      );
    });

    it('should get job by ID with expand options', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      const options: JobGetByIdOptions = { expand: JOB_TEST_CONSTANTS.EXPAND_ROBOT };
      await service.getById(JOB_TEST_CONSTANTS.JOB_ID, options);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_ID(JOB_TEST_CONSTANTS.JOB_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$expand': JOB_TEST_CONSTANTS.EXPAND_ROBOT
          })
        })
      );
    });

    it('should return job with bound methods', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      const result = await service.getById(JOB_TEST_CONSTANTS.JOB_ID);

      expect(result.stop).toBeDefined();
      expect(typeof result.stop).toBe('function');
      expect(result.restart).toBeDefined();
      expect(typeof result.restart).toBe('function');
      expect(result.resume).toBeDefined();
      expect(typeof result.resume).toBe('function');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(service.getById(JOB_TEST_CONSTANTS.JOB_ID))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('stop', () => {
    it('should stop a job with SoftStop strategy', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await service.stop(JOB_TEST_CONSTANTS.JOB_ID, { strategy: StopStrategy.SoftStop });

      expect(result).toEqual({ success: true, data: { id: JOB_TEST_CONSTANTS.JOB_ID } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.STOP(JOB_TEST_CONSTANTS.JOB_ID),
        { strategy: StopStrategy.SoftStop },
        expect.objectContaining({ headers: {} })
      );
    });

    it('should stop a job with Kill strategy and folder context', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await service.stop(
        JOB_TEST_CONSTANTS.JOB_ID,
        { strategy: StopStrategy.Kill },
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(result).toEqual({ success: true, data: { id: JOB_TEST_CONSTANTS.JOB_ID } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.STOP(JOB_TEST_CONSTANTS.JOB_ID),
        { strategy: StopStrategy.Kill },
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.stop(JOB_TEST_CONSTANTS.JOB_ID, { strategy: StopStrategy.SoftStop }))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('stopJobs', () => {
    it('should stop multiple jobs', async () => {
      const jobIds = [JOB_TEST_CONSTANTS.JOB_ID, JOB_TEST_CONSTANTS.JOB_ID_2];
      mockApiClient.post.mockResolvedValue({});

      const result = await service.stopJobs({
        jobIds,
        strategy: StopStrategy.SoftStop,
      });

      expect(result).toEqual({ success: true, data: { jobIds } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.STOP_JOBS,
        { jobIds, strategy: StopStrategy.SoftStop },
        expect.objectContaining({ headers: {} })
      );
    });

    it('should stop multiple jobs with folder context', async () => {
      const jobIds = [JOB_TEST_CONSTANTS.JOB_ID];
      mockApiClient.post.mockResolvedValue({});

      await service.stopJobs(
        { jobIds, strategy: StopStrategy.Kill },
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.STOP_JOBS,
        { jobIds, strategy: StopStrategy.Kill },
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.stopJobs({
        jobIds: [JOB_TEST_CONSTANTS.JOB_ID],
        strategy: StopStrategy.SoftStop,
      })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('restart', () => {
    it('should restart a job', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await service.restart(JOB_TEST_CONSTANTS.JOB_ID);

      expect(result).toEqual({ success: true, data: { id: JOB_TEST_CONSTANTS.JOB_ID } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESTART,
        { jobId: JOB_TEST_CONSTANTS.JOB_ID },
        expect.objectContaining({ headers: {} })
      );
    });

    it('should restart a job with folder context', async () => {
      mockApiClient.post.mockResolvedValue({});

      await service.restart(JOB_TEST_CONSTANTS.JOB_ID, TEST_CONSTANTS.FOLDER_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESTART,
        { jobId: JOB_TEST_CONSTANTS.JOB_ID },
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.restart(JOB_TEST_CONSTANTS.JOB_ID))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('resume', () => {
    it('should resume a job', async () => {
      mockApiClient.post.mockResolvedValue({});

      const result = await service.resume({ jobKey: JOB_TEST_CONSTANTS.JOB_KEY });

      expect(result).toEqual({ success: true, data: { jobKey: JOB_TEST_CONSTANTS.JOB_KEY } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESUME,
        { jobKey: JOB_TEST_CONSTANTS.JOB_KEY },
        expect.objectContaining({ headers: {} })
      );
    });

    it('should resume a job with input arguments', async () => {
      mockApiClient.post.mockResolvedValue({});

      await service.resume({
        jobKey: JOB_TEST_CONSTANTS.JOB_KEY,
        inputArguments: JOB_TEST_CONSTANTS.INPUT_ARGUMENTS,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESUME,
        {
          jobKey: JOB_TEST_CONSTANTS.JOB_KEY,
          inputArguments: JOB_TEST_CONSTANTS.INPUT_ARGUMENTS,
        },
        expect.objectContaining({ headers: {} })
      );
    });

    it('should resume a job with folder context', async () => {
      mockApiClient.post.mockResolvedValue({});

      await service.resume(
        { jobKey: JOB_TEST_CONSTANTS.JOB_KEY },
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESUME,
        { jobKey: JOB_TEST_CONSTANTS.JOB_KEY },
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(service.resume({ jobKey: JOB_TEST_CONSTANTS.JOB_KEY }))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('bound methods', () => {
    it('should call stop via bound method on job response', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      const job = await service.getById(JOB_TEST_CONSTANTS.JOB_ID);

      // Mock the post for the stop call
      mockApiClient.post.mockResolvedValue({});

      const result = await job.stop(StopStrategy.SoftStop);

      expect(result).toEqual({ success: true, data: { id: JOB_TEST_CONSTANTS.JOB_ID } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.STOP(JOB_TEST_CONSTANTS.JOB_ID),
        { strategy: StopStrategy.SoftStop },
        expect.any(Object)
      );
    });

    it('should call restart via bound method on job response', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      const job = await service.getById(JOB_TEST_CONSTANTS.JOB_ID);

      mockApiClient.post.mockResolvedValue({});

      const result = await job.restart();

      expect(result).toEqual({ success: true, data: { id: JOB_TEST_CONSTANTS.JOB_ID } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESTART,
        { jobId: JOB_TEST_CONSTANTS.JOB_ID },
        expect.any(Object)
      );
    });

    it('should call resume via bound method on job response', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      const job = await service.getById(JOB_TEST_CONSTANTS.JOB_ID);

      mockApiClient.post.mockResolvedValue({});

      const result = await job.resume();

      expect(result).toEqual({ success: true, data: { jobKey: JOB_TEST_CONSTANTS.JOB_KEY } });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESUME,
        { jobKey: JOB_TEST_CONSTANTS.JOB_KEY },
        expect.any(Object)
      );
    });

    it('should call resume with input arguments via bound method', async () => {
      const mockJob = createMockRawJob();
      mockApiClient.get.mockResolvedValue(mockJob);

      const job = await service.getById(JOB_TEST_CONSTANTS.JOB_ID);

      mockApiClient.post.mockResolvedValue({});

      await job.resume(JOB_TEST_CONSTANTS.INPUT_ARGUMENTS);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESUME,
        {
          jobKey: JOB_TEST_CONSTANTS.JOB_KEY,
          inputArguments: JOB_TEST_CONSTANTS.INPUT_ARGUMENTS,
        },
        expect.any(Object)
      );
    });
  });
});
