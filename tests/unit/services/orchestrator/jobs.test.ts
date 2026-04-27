// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobService } from '../../../../src/services/orchestrator/jobs';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockTransformedJobCollection,
  createMockRawJob,
} from '../../../utils/mocks/jobs';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import {
  JobGetAllOptions,
  JobGetByIdOptions,
} from '../../../../src/models/orchestrator/jobs.types';
import { JobGetResponse } from '../../../../src/models/orchestrator/jobs.models';
import { PaginatedResponse } from '../../../../src/utils/pagination';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { JOB_TEST_CONSTANTS } from '../../../utils/constants/jobs';
import { JOB_ENDPOINTS, ORCHESTRATOR_ATTACHMENT_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { StopStrategy } from '../../../../src/models/orchestrator/processes.types';
import { JOB_KEY_RESOLUTION_CHUNK_SIZE } from '../../../../src/models/orchestrator/jobs.constants';

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
    mockApiClient.getValidToken = vi.fn().mockResolvedValue(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    vi.mocked(PaginationHelpers.getAll).mockReset();

    jobService = new JobService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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

    it('should attach getOutput method to transformed job objects', async () => {
      const mockResponse = createMockTransformedJobCollection();
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await jobService.getAll();

      // Capture the transformFn passed to PaginationHelpers.getAll
      const callArgs = vi.mocked(PaginationHelpers.getAll).mock.calls[0][0];
      const transformFn = callArgs.transformFn;

      // Apply the transform to a raw PascalCase job
      const rawJob = createMockRawJob();

      const transformed = transformFn!(rawJob as Record<string, unknown>) as JobGetResponse;

      expect(transformed.getOutput).toBeDefined();
      expect(typeof transformed.getOutput).toBe('function');
      expect(transformed.stop).toBeDefined();
      expect(typeof transformed.stop).toBe('function');
    });
  });

  describe('getById', () => {
    it('should return a job by key with transformed fields', async () => {
      const mockRawJob = createMockRawJob();
      mockApiClient.get.mockResolvedValueOnce(mockRawJob);

      const result = await jobService.getById(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_KEY(JOB_TEST_CONSTANTS.JOB_KEY),
        expect.objectContaining({
          params: {},
          headers: expect.objectContaining({
            'X-UIPATH-OrganizationUnitId': String(TEST_CONSTANTS.FOLDER_ID),
          }),
        })
      );

      // Verify transformed fields
      expect(result.id).toBe(JOB_TEST_CONSTANTS.JOB_ID);
      expect(result.key).toBe(JOB_TEST_CONSTANTS.JOB_KEY);
      expect(result.processName).toBe(JOB_TEST_CONSTANTS.PROCESS_NAME);
      expect(result.createdTime).toBe(JOB_TEST_CONSTANTS.CREATED_TIME);
      expect(result.folderId).toBe(TEST_CONSTANTS.FOLDER_ID);
      expect(result.folderName).toBe(TEST_CONSTANTS.FOLDER_NAME);
    });

    it('should verify original PascalCase fields are absent after transform', async () => {
      const mockRawJob = createMockRawJob();
      mockApiClient.get.mockResolvedValueOnce(mockRawJob);

      const result = await jobService.getById(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect((result as any).CreationTime).toBeUndefined();
      expect((result as any).ReleaseName).toBeUndefined();
      expect((result as any).OrganizationUnitId).toBeUndefined();
      expect((result as any).OrganizationUnitFullyQualifiedName).toBeUndefined();
      expect((result as any).LastModificationTime).toBeUndefined();
    });

    it('should attach bound methods to result', async () => {
      const mockRawJob = createMockRawJob();
      mockApiClient.get.mockResolvedValueOnce(mockRawJob);

      const result = await jobService.getById(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(result.getOutput).toBeDefined();
      expect(typeof result.getOutput).toBe('function');
      expect(result.stop).toBeDefined();
      expect(typeof result.stop).toBe('function');
    });

    it('should pass expand and select options with OData prefix', async () => {
      const mockRawJob = createMockRawJob();
      mockApiClient.get.mockResolvedValueOnce(mockRawJob);

      const options: JobGetByIdOptions = {
        expand: 'robot,machine',
        select: 'key,state',
      };

      await jobService.getById(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID, options);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_KEY(JOB_TEST_CONSTANTS.JOB_KEY),
        expect.objectContaining({
          params: {
            $expand: 'robot,machine',
            $select: 'key,state',
          },
        })
      );
    });

    it('should throw validation error when id is missing', async () => {
      await expect(
        jobService.getById('', TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow('id is required for getById');
    });

    it('should throw validation error when folderId is missing', async () => {
      await expect(
        jobService.getById(JOB_TEST_CONSTANTS.JOB_KEY, 0)
      ).rejects.toThrow('folderId is required for getById');
    });

    it('should handle API errors', async () => {
      const error = createMockError(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(
        jobService.getById(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
    });
  });

  describe('getOutput', () => {
    it('should return parsed inline output when OutputArguments is set', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: JOB_TEST_CONSTANTS.OUTPUT_ARGUMENTS,
        OutputFile: null,
      });

      const result = await jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(result).toEqual(JOB_TEST_CONSTANTS.PARSED_OUTPUT);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_BY_KEY(JOB_TEST_CONSTANTS.JOB_KEY),
        expect.objectContaining({
          params: {
            $select: 'outputArguments,outputFile',
          },
          headers: expect.objectContaining({
            'X-UIPATH-OrganizationUnitId': String(TEST_CONSTANTS.FOLDER_ID),
          }),
        })
      );
    });

    it('should return null when job has no output', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: null,
        OutputFile: null,
      });

      const result = await jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(result).toBeNull();
    });

    it('should prefer OutputArguments over OutputFile when both are set', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: JOB_TEST_CONSTANTS.OUTPUT_ARGUMENTS,
        OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
      });

      const result = await jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(result).toEqual(JOB_TEST_CONSTANTS.PARSED_OUTPUT);
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should download output from attachment when OutputFile is set', async () => {
      // First call: fetch job by key
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: null,
        OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
      });

      // Second call: fetch attachment blob access info
      mockApiClient.get.mockResolvedValueOnce({
        Name: 'output.json',
        BlobFileAccess: {
          Uri: JOB_TEST_CONSTANTS.BLOB_URI,
          Headers: { Keys: ['x-ms-blob-type'], Values: ['BlockBlob'] },
          RequiresAuth: false,
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JOB_TEST_CONSTANTS.BLOB_CONTENT),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(result).toEqual(JOB_TEST_CONSTANTS.PARSED_BLOB_OUTPUT);
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY),
        { params: {} }
      );
      expect(mockFetch).toHaveBeenCalledWith(
        JOB_TEST_CONSTANTS.BLOB_URI,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should add auth header when blob requires authentication', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: null,
        OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
      });

      mockApiClient.get.mockResolvedValueOnce({
        Name: 'output.json',
        BlobFileAccess: {
          Uri: JOB_TEST_CONSTANTS.BLOB_URI,
          Headers: { Keys: [], Values: [] },
          RequiresAuth: true,
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JOB_TEST_CONSTANTS.BLOB_CONTENT),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(result).toEqual(JOB_TEST_CONSTANTS.PARSED_BLOB_OUTPUT);
      expect(mockFetch).toHaveBeenCalledWith(
        JOB_TEST_CONSTANTS.BLOB_URI,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN}`,
          }),
        })
      );
    });

    it('should return null when attachment has no blob URI', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: null,
        OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
      });

      mockApiClient.get.mockResolvedValueOnce({
        Name: 'output.json',
        BlobFileAccess: {
          Uri: null,
          Headers: { Keys: [], Values: [] },
          RequiresAuth: false,
        },
      });

      const result = await jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(result).toBeNull();
    });

    it('should throw AuthorizationError when blob download returns 403', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: null,
        OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
      });

      mockApiClient.get.mockResolvedValueOnce({
        Name: 'output.json',
        BlobFileAccess: {
          Uri: JOB_TEST_CONSTANTS.BLOB_URI,
          Headers: { Keys: [], Values: [] },
          RequiresAuth: false,
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.reject(new Error('no json')),
        text: () => Promise.resolve('Forbidden'),
        headers: new Headers(),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID)).rejects.toThrow('Forbidden');
    });

    it('should throw ServerError when blob download returns 500', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: null,
        OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
      });

      mockApiClient.get.mockResolvedValueOnce({
        Name: 'output.json',
        BlobFileAccess: {
          Uri: JOB_TEST_CONSTANTS.BLOB_URI,
          Headers: { Keys: [], Values: [] },
          RequiresAuth: false,
        },
      });

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('no json')),
        text: () => Promise.resolve('Internal Server Error'),
        headers: new Headers(),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID)).rejects.toThrow('Internal Server Error');
    });

    it('should throw validation error when jobKey is missing', async () => {
      await expect(
        jobService.getOutput('', TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow('jobKey is required for getOutput');
    });

    it('should propagate API errors from job fetch', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE
      );
    });

    it('should propagate API errors from attachment fetch', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        OutputArguments: null,
        OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
      });

      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(jobService.getOutput(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE
      );
    });
  });

  describe('stop', () => {
    it('should stop a single job with default soft stop strategy', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [{ key: JOB_TEST_CONSTANTS.JOB_KEY, id: JOB_TEST_CONSTANTS.JOB_ID }],
      });
      mockApiClient.post.mockResolvedValueOnce(undefined);

      await jobService.stop(
        [JOB_TEST_CONSTANTS.JOB_KEY],
        TEST_CONSTANTS.FOLDER_ID
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
          filter: `key in ('${JOB_TEST_CONSTANTS.JOB_KEY}')`,
          select: 'id,key',
          pageSize: 1,
        })
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.STOP,
        { jobIds: [JOB_TEST_CONSTANTS.JOB_ID], strategy: StopStrategy.SoftStop },
        expect.any(Object)
      );
    });

    it('should stop multiple jobs with Kill strategy', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [
          { key: JOB_TEST_CONSTANTS.JOB_KEY, id: JOB_TEST_CONSTANTS.JOB_ID },
          { key: JOB_TEST_CONSTANTS.JOB_KEY_2, id: JOB_TEST_CONSTANTS.JOB_ID_2 },
        ],
      });
      mockApiClient.post.mockResolvedValueOnce(undefined);

      await jobService.stop(
        [JOB_TEST_CONSTANTS.JOB_KEY, JOB_TEST_CONSTANTS.JOB_KEY_2],
        TEST_CONSTANTS.FOLDER_ID,
        { strategy: StopStrategy.Kill }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.STOP,
        {
          jobIds: [JOB_TEST_CONSTANTS.JOB_ID, JOB_TEST_CONSTANTS.JOB_ID_2],
          strategy: StopStrategy.Kill,
        },
        expect.any(Object)
      );
    });

    it('should return immediately for empty job keys array', async () => {
      await jobService.stop([], TEST_CONSTANTS.FOLDER_ID);

      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw when job keys are not found', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [],
      });

      await expect(
        jobService.stop([JOB_TEST_CONSTANTS.JOB_KEY], TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(JOB_TEST_CONSTANTS.ERROR_JOBS_NOT_FOUND_FOR_KEYS);
    });

    it('should deduplicate job keys for resolution and return unique IDs', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [{ key: JOB_TEST_CONSTANTS.JOB_KEY, id: JOB_TEST_CONSTANTS.JOB_ID }],
      });
      mockApiClient.post.mockResolvedValueOnce(undefined);

      await jobService.stop(
        [JOB_TEST_CONSTANTS.JOB_KEY, JOB_TEST_CONSTANTS.JOB_KEY],
        TEST_CONSTANTS.FOLDER_ID
      );

      // Only one getAll call with deduplicated keys
      expect(PaginationHelpers.getAll).toHaveBeenCalledTimes(1);
    });

    it('should resolve keys in multiple chunks when count exceeds chunk size', async () => {
      const chunkSize = JOB_KEY_RESOLUTION_CHUNK_SIZE;
      const keys = Array.from(
        { length: chunkSize + 1 },
        (_, i) => `${i.toString().padStart(8, '0')}-bbbb-cccc-dddd-eeeeeeeeeeee`
      );

      // Chunk 1: first 50 keys
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: keys.slice(0, chunkSize).map((k, i) => ({ key: k, id: i + 1 })),
      });
      // Chunk 2: remaining 1 key
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [{ key: keys[chunkSize], id: chunkSize + 1 }],
      });
      mockApiClient.post.mockResolvedValueOnce(undefined);

      await jobService.stop(keys, TEST_CONSTANTS.FOLDER_ID);

      expect(PaginationHelpers.getAll).toHaveBeenCalledTimes(2);
    });

    it('should throw validation error when folderId is missing', async () => {
      await expect(
        jobService.stop([JOB_TEST_CONSTANTS.JOB_KEY], 0)
      ).rejects.toThrow('folderId is required for stop');
    });

    it('should propagate resolution API errors', async () => {
      const error = createMockError(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValueOnce(error);

      await expect(
        jobService.stop([JOB_TEST_CONSTANTS.JOB_KEY], TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
    });

    it('should propagate stop API errors', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [{ key: JOB_TEST_CONSTANTS.JOB_KEY, id: JOB_TEST_CONSTANTS.JOB_ID }],
      });

      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(
        jobService.stop([JOB_TEST_CONSTANTS.JOB_KEY], TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('resume', () => {
    it('should resume a suspended job', async () => {
      mockApiClient.post.mockResolvedValueOnce(undefined);

      await jobService.resume(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESUME,
        { jobKey: JOB_TEST_CONSTANTS.JOB_KEY },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-UIPATH-OrganizationUnitId': String(TEST_CONSTANTS.FOLDER_ID),
          }),
        })
      );
    });

    it('should stringify and pass input arguments when provided', async () => {
      mockApiClient.post.mockResolvedValueOnce(undefined);

      await jobService.resume(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID, {
        inputArguments: { approved: true },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESUME,
        {
          jobKey: JOB_TEST_CONSTANTS.JOB_KEY,
          inputArguments: '{"approved":true}',
        },
        expect.any(Object)
      );
    });

    it('should throw validation error when jobKey is missing', async () => {
      await expect(
        jobService.resume('', TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow('jobKey is required for resume');
    });

    it('should throw validation error when folderId is missing', async () => {
      await expect(
        jobService.resume(JOB_TEST_CONSTANTS.JOB_KEY, 0)
      ).rejects.toThrow('folderId is required for resume');
    });

    it('should handle API errors', async () => {
      const error = createMockError(JOB_TEST_CONSTANTS.ERROR_JOB_RESUME_FAILED);
      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(
        jobService.resume(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(JOB_TEST_CONSTANTS.ERROR_JOB_RESUME_FAILED);
    });
  });

  describe('restart', () => {
    it('should resolve job key and restart with transformed response', async () => {
      // Key resolution via getAll
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [{ key: JOB_TEST_CONSTANTS.JOB_KEY, id: JOB_TEST_CONSTANTS.JOB_ID }],
      });
      // Restart API call
      const mockRawJob = createMockRawJob({ State: 'Pending' });
      mockApiClient.post.mockResolvedValueOnce(mockRawJob);

      const result = await jobService.restart(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      // Verify key resolution
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID,
          filter: `key in ('${JOB_TEST_CONSTANTS.JOB_KEY}')`,
          select: 'id,key',
          pageSize: 1,
        })
      );

      // Verify restart call with resolved numeric ID
      expect(mockApiClient.post).toHaveBeenCalledWith(
        JOB_ENDPOINTS.RESTART,
        { jobId: JOB_TEST_CONSTANTS.JOB_ID },
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-UIPATH-OrganizationUnitId': String(TEST_CONSTANTS.FOLDER_ID),
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.key).toBe(JOB_TEST_CONSTANTS.JOB_KEY);

      // Verify transformed camelCase fields have expected values
      expect(result.data.createdTime).toBe(JOB_TEST_CONSTANTS.CREATED_TIME);
      expect(result.data.processName).toBe(JOB_TEST_CONSTANTS.PROCESS_NAME);

      // Verify original PascalCase fields are absent
      expect((result.data as any).CreationTime).toBeUndefined();
      expect((result.data as any).ReleaseName).toBeUndefined();
      expect((result.data as any).OrganizationUnitId).toBeUndefined();
    });

    it('should attach bound methods to the returned job', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [{ key: JOB_TEST_CONSTANTS.JOB_KEY, id: JOB_TEST_CONSTANTS.JOB_ID }],
      });
      const mockRawJob = createMockRawJob({ State: 'Pending' });
      mockApiClient.post.mockResolvedValueOnce(mockRawJob);

      const result = await jobService.restart(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID);

      expect(typeof result.data.getOutput).toBe('function');
      expect(typeof result.data.resume).toBe('function');
      expect(typeof result.data.restart).toBe('function');
    });

    it('should throw validation error when jobKey is missing', async () => {
      await expect(
        jobService.restart('', TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow('jobKey is required for restart');
    });

    it('should throw validation error when folderId is missing', async () => {
      await expect(
        jobService.restart(JOB_TEST_CONSTANTS.JOB_KEY, 0)
      ).rejects.toThrow('folderId is required for restart');
    });

    it('should handle API errors', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValueOnce({
        items: [{ key: JOB_TEST_CONSTANTS.JOB_KEY, id: JOB_TEST_CONSTANTS.JOB_ID }],
      });
      const error = createMockError(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
      mockApiClient.post.mockRejectedValueOnce(error);

      await expect(
        jobService.restart(JOB_TEST_CONSTANTS.JOB_KEY, TEST_CONSTANTS.FOLDER_ID)
      ).rejects.toThrow(JOB_TEST_CONSTANTS.ERROR_JOB_NOT_FOUND);
    });
  });
});
