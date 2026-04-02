// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobService } from '../../../../src/services/orchestrator/jobs';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import {
  createMockTransformedJobCollection,
} from '../../../utils/mocks/jobs';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import {
  JobGetAllOptions,
} from '../../../../src/models/orchestrator/jobs.types';
import { JobGetResponse } from '../../../../src/models/orchestrator/jobs.models';
import { PaginatedResponse } from '../../../../src/utils/pagination';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { JOB_TEST_CONSTANTS } from '../../../utils/constants/jobs';
import { JOB_ENDPOINTS, ORCHESTRATOR_ATTACHMENT_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

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
      const rawJob = {
        Id: 123,
        Key: JOB_TEST_CONSTANTS.JOB_KEY,
        State: 'Successful',
        CreationTime: '2026-01-01T00:00:00Z',
      };

      const transformed = transformFn!(rawJob as Record<string, unknown>) as JobGetResponse;

      expect(transformed.getOutput).toBeDefined();
      expect(typeof transformed.getOutput).toBe('function');
    });
  });

  describe('getOutput', () => {
    const getOutputOptions = {
      jobKey: JOB_TEST_CONSTANTS.JOB_KEY,
    };

    it('should return parsed inline output when OutputArguments is set', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: JOB_TEST_CONSTANTS.OUTPUT_ARGUMENTS,
          OutputFile: null,
        }],
      });

      const result = await jobService.getOutput(getOutputOptions);

      expect(result).toEqual(JOB_TEST_CONSTANTS.PARSED_OUTPUT);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        JOB_ENDPOINTS.GET_ALL,
        expect.objectContaining({
          params: {
            $filter: `Key eq ${JOB_TEST_CONSTANTS.JOB_KEY}`,
            $select: 'OutputArguments,OutputFile',
            $top: 1,
          },
        })
      );
    });

    it('should return null when job has no output', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: null,
          OutputFile: null,
        }],
      });

      const result = await jobService.getOutput(getOutputOptions);

      expect(result).toBeNull();
    });

    it('should return null when no job is found for the given key', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [],
      });

      const result = await jobService.getOutput(getOutputOptions);

      expect(result).toBeNull();
    });

    it('should prefer OutputArguments over OutputFile when both are set', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: JOB_TEST_CONSTANTS.OUTPUT_ARGUMENTS,
          OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
        }],
      });

      const result = await jobService.getOutput(getOutputOptions);

      expect(result).toEqual(JOB_TEST_CONSTANTS.PARSED_OUTPUT);
      // Should only make one API call (job fetch), not fetch the attachment
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should download output from attachment when OutputFile is set', async () => {
      // First call: fetch job by key filter
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: null,
          OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
        }],
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

      // Mock fetch for blob download
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JOB_TEST_CONSTANTS.BLOB_CONTENT),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await jobService.getOutput(getOutputOptions);

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
          headers: { 'x-ms-blob-type': 'BlockBlob' },
        })
      );
    });

    it('should add auth header when blob requires authentication', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: null,
          OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
        }],
      });

      mockApiClient.get.mockResolvedValueOnce({
        Name: 'output.json',
        BlobFileAccess: {
          Uri: JOB_TEST_CONSTANTS.BLOB_URI,
          Headers: { Keys: [], Values: [] },
          RequiresAuth: true,
        },
      });

      // Mock getValidToken on the ApiClient
      mockApiClient.getValidToken = vi.fn().mockResolvedValue(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JOB_TEST_CONSTANTS.BLOB_CONTENT),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await jobService.getOutput(getOutputOptions);

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
        value: [{
          OutputArguments: null,
          OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
        }],
      });

      mockApiClient.get.mockResolvedValueOnce({
        Name: 'output.json',
        BlobFileAccess: {
          Uri: null,
          Headers: { Keys: [], Values: [] },
          RequiresAuth: false,
        },
      });

      const result = await jobService.getOutput(getOutputOptions);

      expect(result).toBeNull();
    });

    it('should throw AuthorizationError when blob download returns 403', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: null,
          OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
        }],
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

      await expect(jobService.getOutput(getOutputOptions)).rejects.toThrow('Forbidden');
    });

    it('should throw ServerError when blob download returns 500', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: null,
          OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
        }],
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

      await expect(jobService.getOutput(getOutputOptions)).rejects.toThrow('Internal Server Error');
    });

    it('should throw validation error when jobKey is missing', async () => {
      await expect(
        jobService.getOutput({ jobKey: '' })
      ).rejects.toThrow('jobKey is required for getOutput');
    });

    it('should propagate API errors from job fetch', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(jobService.getOutput(getOutputOptions)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE
      );
    });

    it('should propagate API errors from attachment fetch', async () => {
      mockApiClient.get.mockResolvedValueOnce({
        value: [{
          OutputArguments: null,
          OutputFile: JOB_TEST_CONSTANTS.OUTPUT_FILE_KEY,
        }],
      });

      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValueOnce(error);

      await expect(jobService.getOutput(getOutputOptions)).rejects.toThrow(
        TEST_CONSTANTS.ERROR_MESSAGE
      );
    });
  });
});
