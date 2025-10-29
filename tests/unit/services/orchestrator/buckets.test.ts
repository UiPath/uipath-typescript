// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BucketService } from '../../../../src/services/orchestrator/buckets';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { 
  createMockBuckets, 
  createMockFileMetadata,
  createMockBucketApiResponse,
  createMockReadUriApiResponse,
  createMockWriteUriApiResponse,
  createMockError,
  BUCKET_TEST_CONSTANTS
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import type { BucketGetByIdOptions, BucketGetAllOptions, BucketGetFileMetaDataWithPaginationOptions, BucketGetReadUriOptions, BucketGetResponse, BlobItem } from '../../../../src/models/orchestrator/buckets.types';
import { BucketOptions } from '../../../../src/models/orchestrator/buckets.types';
import { BUCKET_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import axios from 'axios';
import { FOLDER_ID } from '../../../../src/utils/constants/headers';
import { PaginatedResponse } from '../../../../src/utils/pagination/types';
import { ODATA_PAGINATION } from '../../../../src/utils/constants/common';
import { PaginationType } from '../../../../src/utils/pagination/internal-types';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');
vi.mock('axios');

// Import mock objects using vi.hoisted() - this ensures they're available before vi.mock() calls
const mocks = vi.hoisted(() => {
  // Import/re-export the mock utilities from core
  return import('../../../utils/mocks/core');
});

// Setup mocks at module level
// NOTE: We do NOT mock transformData - we want to test the actual transformation logic!
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);
vi.mock('../../../../src/core/context/execution', async () => (await mocks).mockExecutionContext);

// ===== TEST SUITE =====
describe('BucketService Unit Tests', () => {
  let bucketService: BucketService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { config, executionContext, tokenManager } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    // executionContext.get is now mocked at module level

    bucketService = new BucketService(config, executionContext, tokenManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get bucket by ID successfully with all fields mapped correctly', async () => {
      const mockApiResponse = createMockBucketApiResponse();
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      const result = await bucketService.getById(BUCKET_TEST_CONSTANTS.BUCKET_ID, TEST_CONSTANTS.FOLDER_ID);

      // Verify the result - the service transforms PascalCase to camelCase
      expect(result).toBeDefined();
      expect(result.id).toBe(BUCKET_TEST_CONSTANTS.BUCKET_ID);
      expect(result.name).toBe(BUCKET_TEST_CONSTANTS.BUCKET_NAME);
      expect(result.description).toBe(BUCKET_TEST_CONSTANTS.BUCKET_DESCRIPTION);
      expect(result.identifier).toBe(BUCKET_TEST_CONSTANTS.BUCKET_IDENTIFIER);
      expect(result.storageProvider).toBe(BUCKET_TEST_CONSTANTS.STORAGE_PROVIDER);
      expect(result.options).toBe(BucketOptions.None);

      // Verify the API call has correct endpoint and headers
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_BY_ID(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: {},
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should get bucket with options successfully', async () => {
      const mockApiResponse = createMockBucketApiResponse({ Options: BucketOptions.ReadOnly });
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      const options: BucketGetByIdOptions = { 
        expand: BUCKET_TEST_CONSTANTS.EXPAND_FOLDERS, 
        select: BUCKET_TEST_CONSTANTS.SELECT_ID_NAME 
      };
      const result = await bucketService.getById(BUCKET_TEST_CONSTANTS.BUCKET_ID, TEST_CONSTANTS.FOLDER_ID, options);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(BUCKET_TEST_CONSTANTS.BUCKET_ID);
      expect(result.name).toBe(BUCKET_TEST_CONSTANTS.BUCKET_NAME);
      expect(result.options).toBe(BucketOptions.ReadOnly);

      // Verify the API call includes options with $ prefix
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_BY_ID(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            $expand: BUCKET_TEST_CONSTANTS.EXPAND_FOLDERS,
            $select: BUCKET_TEST_CONSTANTS.SELECT_ID_NAME
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );
    });

    it('should throw ValidationError when bucketId is missing', async () => {
      await expect(bucketService.getById(null as any, TEST_CONSTANTS.FOLDER_ID))
        .rejects.toThrow('bucketId is required for getById');
    });

    it('should throw ValidationError when folderId is missing', async () => {
      await expect(bucketService.getById(BUCKET_TEST_CONSTANTS.BUCKET_ID, null as any))
        .rejects.toThrow('folderId is required for getById');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(bucketService.getById(BUCKET_TEST_CONSTANTS.BUCKET_ID, TEST_CONSTANTS.FOLDER_ID))
        .rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getAll', () => {

    it('should return all buckets without pagination', async () => {
      const mockBuckets = createMockBuckets(3);
      const mockResponse = {
        items: mockBuckets,
        totalCount: 3
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await bucketService.getAll();

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: BUCKET_ENDPOINTS.GET_BY_FOLDER,
          transformFn: expect.any(Function),
          pagination: expect.objectContaining({
            paginationType: PaginationType.OFFSET,
            itemsField: ODATA_PAGINATION.ITEMS_FIELD,
            totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
          })
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(3);
    });

    it('should return paginated buckets when pagination options provided', async () => {
      const mockBuckets = createMockBuckets(10);
      const mockResponse = {
        items: mockBuckets,
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: BucketGetAllOptions = { pageSize: TEST_CONSTANTS.PAGE_SIZE };
      const result = await bucketService.getAll(options) as PaginatedResponse<BucketGetResponse>;

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          getByFolderEndpoint: BUCKET_ENDPOINTS.GET_BY_FOLDER,
          transformFn: expect.any(Function),
          pagination: expect.objectContaining({
            itemsField: ODATA_PAGINATION.ITEMS_FIELD,
            totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD
          })
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should return buckets within a folder when folderId is provided', async () => {
      const mockBuckets = createMockBuckets(2);
      const mockResponse = {
        items: mockBuckets,
        totalCount: 2
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: BucketGetAllOptions = { folderId: TEST_CONSTANTS.FOLDER_ID };
      await bucketService.getAll(options);

      // Verify PaginationHelpers.getAll was called with folderId
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: (folderId: number) => string) => fn(TEST_CONSTANTS.FOLDER_ID) === BUCKET_ENDPOINTS.GET_BY_FOLDER),
          getByFolderEndpoint: BUCKET_ENDPOINTS.GET_BY_FOLDER,
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(bucketService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getFileMetaData', () => {

    it('should return file metadata without pagination', async () => {
      const mockBlobItems = createMockFileMetadata(3);
      const mockResponse = {
        items: mockBlobItems,
        totalCount: 3
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await bucketService.getFileMetaData(
        BUCKET_TEST_CONSTANTS.BUCKET_ID, 
        TEST_CONSTANTS.FOLDER_ID
      );

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy(fn => fn(BUCKET_TEST_CONSTANTS.BUCKET_ID) === BUCKET_ENDPOINTS.GET_FILE_META_DATA(BUCKET_TEST_CONSTANTS.BUCKET_ID)), // BUCKET_ENDPOINTS.GET_FILE_META_DATA
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ['prefix']
        }),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(3);
    });

    it('should return paginated file metadata when pagination options provided', async () => {
      const mockBlobItems = createMockFileMetadata(10);
      const mockResponse = {
        items: mockBlobItems,
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      };

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: BucketGetFileMetaDataWithPaginationOptions = { 
        pageSize: TEST_CONSTANTS.PAGE_SIZE, 
        prefix: BUCKET_TEST_CONSTANTS.PREFIX 
      };
      const result = await bucketService.getFileMetaData(
        BUCKET_TEST_CONSTANTS.BUCKET_ID, 
        TEST_CONSTANTS.FOLDER_ID, 
        options
      ) as PaginatedResponse<BlobItem>;

      // Verify PaginationHelpers.getAll was called with correct parameters
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ['prefix']
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
          prefix: BUCKET_TEST_CONSTANTS.PREFIX,
          folderId: TEST_CONSTANTS.FOLDER_ID
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
    });

    it('should throw ValidationError when bucketId is missing', async () => {
      await expect(bucketService.getFileMetaData(null as any, TEST_CONSTANTS.FOLDER_ID))
        .rejects.toThrow('bucketId is required for getFileMetaData');
    });

    it('should throw ValidationError when folderId is missing', async () => {
      await expect(bucketService.getFileMetaData(BUCKET_TEST_CONSTANTS.BUCKET_ID, null as any))
        .rejects.toThrow('folderId is required for getFileMetaData');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(bucketService.getFileMetaData(
        BUCKET_TEST_CONSTANTS.BUCKET_ID, 
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('uploadFile', () => {

    it('should upload file with Buffer content', async () => {

      // Mock the internal _getWriteUri call
      const mockUploadUriResponse = createMockWriteUriApiResponse({ 
        RequiresAuth: false,
        Headers: { Keys: [], Values: [] }
      });
      mockApiClient.get.mockResolvedValueOnce(mockUploadUriResponse);

      // Mock axios.put for the actual upload
      vi.mocked(axios.put).mockResolvedValueOnce({status: 201});

      const bufferContent = Buffer.from(BUCKET_TEST_CONSTANTS.FILE_CONTENT);
      const result = await bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: bufferContent
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(201);

      // Verify the API call for getting write URI
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            path: BUCKET_TEST_CONSTANTS.FILE_PATH
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

      // Verify axios.put was called with Buffer content and proper header handling
      expect(axios.put).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        bufferContent, // Verify exact Buffer content is passed
        expect.objectContaining({
          headers: expect.any(Object) // Headers should be empty object since Keys/Values are empty
        })
      );

      // Verify the success logic: status >= 200 && status < 300
      expect(result.success).toBe(true); // 201 is in range [200, 300)
    });

    it('should upload Blob content file with authentication when requiresAuth is true', async () => {
      // Mock the internal _getWriteUri call with RequiresAuth: true
      const mockUploadUriResponse = createMockWriteUriApiResponse({ 
        RequiresAuth: true,
        Headers: { 
          Keys: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER],
          Values: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE]
        }
      });
      mockApiClient.get.mockResolvedValueOnce(mockUploadUriResponse);

      // Mock axios.put for the actual upload
      vi.mocked(axios.put).mockResolvedValueOnce({
        status: BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE
      });

      const fileContent = new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]);
      const result = await bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: fileContent
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE);

      // Verify the API call for getting write URI (same pattern as other tests)
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            path: BUCKET_TEST_CONSTANTS.FILE_PATH
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

      // Verify axios.put was called with authentication headers and transformations
      expect(axios.put).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        fileContent,
        expect.objectContaining({
          headers: expect.objectContaining({
            [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER]: BUCKET_TEST_CONSTANTS.CONTENT_TYPE, // Verify header transformation from array to record
            [TEST_CONSTANTS.AUTHORIZATION_HEADER]: TEST_CONSTANTS.BEARER_PREFIX + ' ' + TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN // Verify secret token authentication
          })
        })
      );

      expect(result.success).toBe(true);
    });

    it('should automatically refresh expired OAuth token during file upload', async () => {
      // Override the mock to return non-secret token that is expired
      bucketService['executionContext'].get = vi.fn().mockReturnValue({
        type: TEST_CONSTANTS.OAUTH_TOKEN_TYPE,
        token: TEST_CONSTANTS.EXPIRED_ACCESS_TOKEN,
        expires_at: Date.now() - 1000 // Expired token
      });

      // Mock tokenManager methods by replacing the methods directly
      bucketService['tokenManager'].isTokenExpired = vi.fn().mockReturnValue(true);
      bucketService['tokenManager'].refreshAccessToken = vi.fn().mockResolvedValue({
        access_token: TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN,
        token_type: 'Bearer',
        expires_in: 3600
      });

      // Mock the internal _getWriteUri call with RequiresAuth: true
      const mockUploadUriResponse = createMockWriteUriApiResponse({ 
        Headers: { 
          Keys: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER],
          Values: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE]
        }
      });
      mockApiClient.get.mockResolvedValueOnce(mockUploadUriResponse);

      // Mock axios.put for the actual upload
      vi.mocked(axios.put).mockResolvedValueOnce({
        status: BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE
      });

      const fileContent = new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]);
      const result = await bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: fileContent
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE);

      // Verify that token refresh was called since token was expired
      expect(bucketService['tokenManager'].refreshAccessToken).toHaveBeenCalledTimes(1);

      // Verify axios.put was called with refreshed token
      expect(axios.put).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        fileContent,
        expect.objectContaining({
          headers: expect.objectContaining({
            [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER]: BUCKET_TEST_CONSTANTS.CONTENT_TYPE,
            [TEST_CONSTANTS.AUTHORIZATION_HEADER]: TEST_CONSTANTS.BEARER_PREFIX + ' ' + TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN
          })
        })
      );
    });

    it('should upload file with oauth token when not expired', async () => {
      // Override the mock to return non-secret token that is not expired
      bucketService['executionContext'].get = vi.fn().mockReturnValue({
        type: TEST_CONSTANTS.OAUTH_TOKEN_TYPE,
        token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN,
        expires_at: Date.now() + 3600000 // Valid token (1 hour from now)
      });

      // Mock tokenManager methods by replacing the methods directly
      bucketService['tokenManager'].isTokenExpired = vi.fn().mockReturnValue(false);
      bucketService['tokenManager'].refreshAccessToken = vi.fn().mockResolvedValue({
        access_token: TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN, // refreshed token
        token_type: 'Bearer',
        expires_in: 3600
      });

      // Mock the internal _getWriteUri call with RequiresAuth: true
      const mockUploadUriResponse = createMockWriteUriApiResponse({ 
        Headers: { 
          Keys: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER],
          Values: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE]
        }
      });
      mockApiClient.get.mockResolvedValueOnce(mockUploadUriResponse);

      // Mock axios.put for the actual upload
      vi.mocked(axios.put).mockResolvedValueOnce({
        status: BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE
      });

      const fileContent = new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]);
      const result = await bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: fileContent
      });

      // Verify the result
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE);

      // Verify axios.put was called with original token
      expect(axios.put).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        fileContent,
        expect.objectContaining({
          headers: expect.objectContaining({
            [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER]: BUCKET_TEST_CONSTANTS.CONTENT_TYPE,
            [TEST_CONSTANTS.AUTHORIZATION_HEADER]: TEST_CONSTANTS.BEARER_PREFIX + ' ' + TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN
          })
        })
      );

      // Verify that token refresh was NOT called since token is still valid
      expect(bucketService['tokenManager'].refreshAccessToken).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when bucketId is missing', async () => {
      await expect(bucketService.uploadFile({
        bucketId: null as any,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT])
      })).rejects.toThrow('bucketId is required for uploadFile');
    });

    it('should throw ValidationError when folderId is missing', async () => {
      await expect(bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: null as any,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT])
      })).rejects.toThrow('folderId is required for uploadFile');
    });

    it('should throw ValidationError when path is missing', async () => {
      await expect(bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: null as any,
        content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT])
      })).rejects.toThrow('path is required for uploadFile');
    });

    it('should throw ValidationError when content is missing', async () => {
      await expect(bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: null as any
      })).rejects.toThrow('content is required for uploadFile');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT])
      })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getReadUri', () => {
    it('should get read URI successfully with transformations applied', async () => {
      const mockApiResponse = createMockReadUriApiResponse();
      mockApiClient.get.mockResolvedValue(mockApiResponse);

      const options: BucketGetReadUriOptions = {
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH
      };
      const result = await bucketService.getReadUri(options);

      // Verify the API call
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            path: BUCKET_TEST_CONSTANTS.FILE_PATH
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

        // Verify the result - the service transforms PascalCase to camelCase and applies BucketMap
        expect(result).toBeDefined();
        expect(result.uri).toBe(BUCKET_TEST_CONSTANTS.READ_URI);
        expect(result.httpMethod).toBe(BUCKET_TEST_CONSTANTS.HTTP_METHOD);
        expect(result.requiresAuth).toBe(true);
        expect(result.headers).toEqual(BUCKET_TEST_CONSTANTS.BLOB_HEADERS);
    });

    it('should throw ValidationError when bucketId is missing', async () => {
      await expect(bucketService.getReadUri({
        bucketId: null as any,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH
      })).rejects.toThrow('bucketId is required for getUri');
    });

    it('should throw ValidationError when folderId is missing', async () => {
      await expect(bucketService.getReadUri({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: null as any,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH
      })).rejects.toThrow('folderId is required for getUri');
    });

    it('should throw ValidationError when path is missing', async () => {
      await expect(bucketService.getReadUri({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: null as any
      })).rejects.toThrow('path is required for getUri');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(bucketService.getReadUri({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH
      })).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});