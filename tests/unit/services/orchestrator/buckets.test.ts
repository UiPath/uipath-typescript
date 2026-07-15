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
import type { BucketGetByIdOptions, BucketGetAllOptions, BucketGetFileMetaDataWithPaginationOptions, BucketGetReadUriOptions, BucketGetResponse, BlobItem, BucketGetFilesOptions, BucketFile } from '../../../../src/models/orchestrator/buckets.types';
import { BucketOptions } from '../../../../src/models/orchestrator/buckets.types';
import { BUCKET_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../../../../src/utils/constants/headers';
import { PaginatedResponse } from '../../../../src/utils/pagination/types';
import { ODATA_PAGINATION } from '../../../../src/utils/constants/common';
import { PaginationType } from '../../../../src/utils/pagination/internal-types';
import { NotFoundError, ValidationError } from '../../../../src/core/errors';

// ===== MOCKING =====
// Mock the dependencies
vi.mock('../../../../src/core/http/api-client');


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
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    // executionContext.get is now mocked at module level

    bucketService = new BucketService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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

  describe('getByName', () => {
    it('should return a transformed bucket when the OData response contains one item', async () => {
      const rawBucket = createMockBucketApiResponse();
      mockApiClient.get.mockResolvedValue({ value: [rawBucket] });

      const result = await bucketService.getByName(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME,
        { folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH },
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(BUCKET_TEST_CONSTANTS.BUCKET_ID);
      expect(result.name).toBe(BUCKET_TEST_CONSTANTS.BUCKET_NAME);
      expect(result.identifier).toBe(BUCKET_TEST_CONSTANTS.BUCKET_IDENTIFIER);

      // Transform validation — camelCase fields present, PascalCase originals absent
      expect((result as any).Id).toBeUndefined();
      expect((result as any).Name).toBeUndefined();
      expect((result as any).StorageProvider).toBeUndefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$filter': `Name eq '${BUCKET_TEST_CONSTANTS.BUCKET_NAME}'`,
            '$top': '1',
          }),
        }),
      );
    });

    it('should route a numeric folderId to X-UIPATH-OrganizationUnitId', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockBucketApiResponse()] });

      await bucketService.getByName(BUCKET_TEST_CONSTANTS.BUCKET_NAME, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
      });
      expect(requestSpec.headers[FOLDER_KEY]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
    });

    it('should route folderKey to X-UIPATH-FolderKey', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockBucketApiResponse()] });

      await bucketService.getByName(BUCKET_TEST_CONSTANTS.BUCKET_NAME, { folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
      });
      expect(requestSpec.headers[FOLDER_ID]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
    });

    it('should route folderPath to X-UIPATH-FolderPath-Encoded (base64-of-UTF-16-LE)', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockBucketApiResponse()] });

      await bucketService.getByName(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME,
        { folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH_WITH_SPACE },
      );

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_WITH_SPACE_ENCODED,
      });
      expect(requestSpec.headers[FOLDER_ID]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_KEY]).toBeUndefined();
    });

    it('should pass query options through to the request', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockBucketApiResponse()] });

      await bucketService.getByName(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME,
        {
          folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH,
          select: BUCKET_TEST_CONSTANTS.SELECT_ID_NAME,
        },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': BUCKET_TEST_CONSTANTS.SELECT_ID_NAME,
          }),
        }),
      );
    });

    it('should OData-escape single quotes in the name', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockBucketApiResponse()] });

      await bucketService.getByName(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME_WITH_QUOTE,
        { folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$filter': `Name eq '${BUCKET_TEST_CONSTANTS.BUCKET_NAME_WITH_QUOTE_ESCAPED}'`,
          }),
        }),
      );
    });

    it('should throw NotFoundError when the OData value array is empty', async () => {
      mockApiClient.get.mockResolvedValue({ value: [] });

      await expect(
        bucketService.getByName(BUCKET_TEST_CONSTANTS.MISSING_BUCKET_NAME, { folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError for an empty name', async () => {
      await expect(
        bucketService.getByName('   ', { folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should fall back to SDK init-time folderKey when no folder is provided', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
      const scopedService = new BucketService(instance);

      mockApiClient.get.mockResolvedValue({ value: [createMockBucketApiResponse()] });

      await scopedService.getByName(BUCKET_TEST_CONSTANTS.BUCKET_NAME);

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
      });
      expect(requestSpec.headers[FOLDER_ID]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
    });

    it('should suppress the init-time folderKey fallback when caller provides explicit folder', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
      const scopedService = new BucketService(instance);

      mockApiClient.get.mockResolvedValue({ value: [createMockBucketApiResponse()] });

      await scopedService.getByName(BUCKET_TEST_CONSTANTS.BUCKET_NAME, { folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH });

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_ENCODED,
      });
      expect(requestSpec.headers[FOLDER_KEY]).toBeUndefined();
    });

    it('should throw ValidationError when no folder context is resolvable', async () => {
      await expect(bucketService.getByName(BUCKET_TEST_CONSTANTS.BUCKET_NAME))
        .rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
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
        expect.anything(),
      );

      // With no folder in options, use the cross-folder endpoint and send no folder headers.
      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls.at(-1)!;
      expect((config as any).getEndpoint()).toBe(BUCKET_ENDPOINTS.GET_ALL);
      expect((config as any).headers).toBeUndefined();

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(3);
    });

    it('should route folderKey to the FolderKey header and use the folder-scoped endpoint', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await bucketService.getAll({ folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });

      const [config, restOptions] = vi.mocked(PaginationHelpers.getAll).mock.calls.at(-1)!;
      expect((config as any).headers).toMatchObject({
        [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
      });
      expect((config as any).getEndpoint()).toBe(BUCKET_ENDPOINTS.GET_BY_FOLDER);
      // Stripped from the OData pass-through options before delegation.
      expect(restOptions).not.toHaveProperty('folderKey');
    });

    it('should route folderPath to the encoded FolderPath header', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await bucketService.getAll({ folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH_WITH_SPACE });

      const [config, restOptions] = vi.mocked(PaginationHelpers.getAll).mock.calls.at(-1)!;
      expect((config as any).headers).toMatchObject({
        [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_WITH_SPACE_ENCODED,
      });
      expect((config as any).getEndpoint()).toBe(BUCKET_ENDPOINTS.GET_BY_FOLDER);
      expect(restOptions).not.toHaveProperty('folderPath');
    });

    it('should NOT fall back to SDK init-time folderKey when no folder is in options (cross-folder preserved)', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
      const scopedService = new BucketService(instance);
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await scopedService.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls.at(-1)!;
      expect((config as any).headers).toBeUndefined();
      expect((config as any).getEndpoint()).toBe(BUCKET_ENDPOINTS.GET_ALL);
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

    it('should return file metadata without pagination (deprecated positional form)', async () => {
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

      // Verify PaginationHelpers.getAll was called with the right config + headers built from folderId
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy(fn => fn(BUCKET_TEST_CONSTANTS.BUCKET_ID) === BUCKET_ENDPOINTS.GET_FILE_META_DATA(BUCKET_TEST_CONSTANTS.BUCKET_ID)),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ['prefix'],
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
        expect.any(Object),
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(3);
    });

    it('should return paginated file metadata when pagination options provided (deprecated positional form)', async () => {
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

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.any(Object),
          excludeFromPrefix: ['prefix'],
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
          prefix: BUCKET_TEST_CONSTANTS.PREFIX,
        }),
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
    });

    it('should accept the new options-object form with folderId', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await bucketService.getFileMetaData(BUCKET_TEST_CONSTANTS.BUCKET_ID, {
        folderId: TEST_CONSTANTS.FOLDER_ID,
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
        expect.any(Object),
      );
      expect(PaginationHelpers.getAll).not.toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_KEY]: expect.anything() }),
        }),
        expect.any(Object),
      );
      expect(PaginationHelpers.getAll).not.toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_PATH_ENCODED]: expect.anything() }),
        }),
        expect.any(Object),
      );
    });

    it('should route folderKey from the options object to X-UIPATH-FolderKey', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await bucketService.getFileMetaData(BUCKET_TEST_CONSTANTS.BUCKET_ID, {
        folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
          }),
        }),
        expect.any(Object),
      );
      expect(PaginationHelpers.getAll).not.toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }),
        }),
        expect.any(Object),
      );
    });

    it('should route folderPath from the options object to X-UIPATH-FolderPath-Encoded', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await bucketService.getFileMetaData(BUCKET_TEST_CONSTANTS.BUCKET_ID, {
        folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH,
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_ENCODED,
          }),
        }),
        expect.any(Object),
      );
      expect(PaginationHelpers.getAll).not.toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }),
        }),
        expect.any(Object),
      );
    });

    it('should fall back to the SDK init-time folderKey when no folder context is supplied', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
      const scopedService = new BucketService(instance);

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await scopedService.getFileMetaData(BUCKET_TEST_CONSTANTS.BUCKET_ID);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
          }),
        }),
        expect.any(Object),
      );
    });

    it('should throw ValidationError when bucket is missing', async () => {
      await expect(bucketService.getFileMetaData(null as any, TEST_CONSTANTS.FOLDER_ID))
        .rejects.toThrow('bucket is required for Buckets.getFileMetaData');
    });

    it('should throw ValidationError when no folder context can be resolved', async () => {
      await expect(
        bucketService.getFileMetaData(BUCKET_TEST_CONSTANTS.BUCKET_ID),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(bucketService.getFileMetaData(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should translate SDK field names to API names in filter before delegating', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 } as any);

      await bucketService.getFileMetaData(BUCKET_TEST_CONSTANTS.BUCKET_ID, {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        filter: "path eq '/data/file.pdf'",
      });

      // path → fullPath (from BucketMap reversed).
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: "fullPath eq '/data/file.pdf'",
        }),
      );
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

      // Mock fetch for the actual upload
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 201 }));

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

      // Verify fetch was called with Buffer content and proper header handling
      expect(mockFetch).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        expect.objectContaining({
          method: 'PUT',
          body: bufferContent,
          headers: expect.any(Object)
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

      // Mock fetch for the actual upload
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE })
      );

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

      // Verify fetch was called with authentication headers and transformations
      expect(mockFetch).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        expect.objectContaining({
          method: 'PUT',
          body: fileContent,
          headers: expect.objectContaining({
            [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER]: BUCKET_TEST_CONSTANTS.CONTENT_TYPE,
            [TEST_CONSTANTS.AUTHORIZATION_HEADER]: TEST_CONSTANTS.BEARER_PREFIX + ' ' + TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN
          })
        })
      );

      expect(result.success).toBe(true);

    });

    it('should automatically refresh expired OAuth token during file upload', async () => {
      // Mock getValidAuthToken to return a refreshed token (simulating token refresh)
      const getValidAuthTokenSpy = vi.spyOn(bucketService as any, 'getValidAuthToken')
        .mockResolvedValue(TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN);

      // Mock the internal _getWriteUri call with RequiresAuth: true
      const mockUploadUriResponse = createMockWriteUriApiResponse({
        Headers: {
          Keys: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER],
          Values: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE]
        }
      });
      mockApiClient.get.mockResolvedValueOnce(mockUploadUriResponse);

      // Mock fetch for the actual upload
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE })
      );

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

      // Verify that getValidAuthToken was called
      expect(getValidAuthTokenSpy).toHaveBeenCalledTimes(1);

      // Verify fetch was called with refreshed token
      expect(mockFetch).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        expect.objectContaining({
          method: 'PUT',
          body: fileContent,
          headers: expect.objectContaining({
            [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER]: BUCKET_TEST_CONSTANTS.CONTENT_TYPE,
            [TEST_CONSTANTS.AUTHORIZATION_HEADER]: TEST_CONSTANTS.BEARER_PREFIX + ' ' + TEST_CONSTANTS.REFRESHED_ACCESS_TOKEN
          })
        })
      );



    });

    it('should upload file with oauth token when not expired', async () => {
      // Mock getValidAuthToken to return the current valid token
      const getValidAuthTokenSpy = vi.spyOn(bucketService as any, 'getValidAuthToken')
        .mockResolvedValue(TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN);

      // Mock the internal _getWriteUri call with RequiresAuth: true
      const mockUploadUriResponse = createMockWriteUriApiResponse({
        Headers: {
          Keys: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER],
          Values: [BUCKET_TEST_CONSTANTS.CONTENT_TYPE]
        }
      });
      mockApiClient.get.mockResolvedValueOnce(mockUploadUriResponse);

      // Mock fetch for the actual upload
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: BUCKET_TEST_CONSTANTS.UPLOAD_SUCCESS_STATUS_CODE })
      );

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

      // Verify getValidAuthToken was called
      expect(getValidAuthTokenSpy).toHaveBeenCalledTimes(1);

      // Verify fetch was called with original token
      expect(mockFetch).toHaveBeenCalledWith(
        BUCKET_TEST_CONSTANTS.UPLOAD_URI,
        expect.objectContaining({
          method: 'PUT',
          body: fileContent,
          headers: expect.objectContaining({
            [BUCKET_TEST_CONSTANTS.CONTENT_TYPE_HEADER]: BUCKET_TEST_CONSTANTS.CONTENT_TYPE,
            [TEST_CONSTANTS.AUTHORIZATION_HEADER]: TEST_CONSTANTS.BEARER_PREFIX + ' ' + TEST_CONSTANTS.DEFAULT_ACCESS_TOKEN
          })
        })
      );



    });

    it('should throw ValidationError when bucket is missing', async () => {
      await expect(bucketService.uploadFile({
        bucketId: null as any,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT])
      })).rejects.toThrow('bucket is required for Buckets.uploadFile');
    });

    it('should throw ValidationError when no folder context can be resolved', async () => {
      await expect(bucketService.uploadFile({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
        content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
      })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should route folderKey from the options object to X-UIPATH-FolderKey', async () => {
      mockApiClient.get.mockResolvedValue(createMockWriteUriApiResponse());
      // Stub fetch so _uploadToUri doesn't hit the network
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 } as Response);

      try {
        await bucketService.uploadFile({
          bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
          folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
          path: BUCKET_TEST_CONSTANTS.FILE_PATH,
          content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
        });

        expect(mockApiClient.get).toHaveBeenCalledWith(
          BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
          expect.objectContaining({
            headers: expect.objectContaining({ [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY }),
          }),
        );
        expect(mockApiClient.get).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should route folderPath from the options object to X-UIPATH-FolderPath-Encoded', async () => {
      mockApiClient.get.mockResolvedValue(createMockWriteUriApiResponse());
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 } as Response);

      try {
        await bucketService.uploadFile({
          bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
          folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH,
          path: BUCKET_TEST_CONSTANTS.FILE_PATH,
          content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
        });

        expect(mockApiClient.get).toHaveBeenCalledWith(
          BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
          expect.objectContaining({
            headers: expect.objectContaining({ [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_ENCODED }),
          }),
        );
        expect(mockApiClient.get).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should fall back to the SDK init-time folderKey when no folder context is supplied', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
      const scopedService = new BucketService(instance);
      mockApiClient.get.mockResolvedValue(createMockWriteUriApiResponse());
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 } as Response);

      try {
        await scopedService.uploadFile({
          bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
          path: BUCKET_TEST_CONSTANTS.FILE_PATH,
          content: new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
        });

        expect(mockApiClient.get).toHaveBeenCalledWith(
          BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
          expect.objectContaining({
            headers: expect.objectContaining({ [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY }),
          }),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
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

  describe('uploadFile — positional form', () => {
    it('should upload file using positional bucketId/path/content', async () => {
      mockApiClient.get.mockResolvedValueOnce(createMockWriteUriApiResponse({
        RequiresAuth: false,
        Headers: { Keys: [], Values: [] },
      }));
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 201 }));

      const result = await bucketService.uploadFile(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        Buffer.from(BUCKET_TEST_CONSTANTS.FILE_CONTENT),
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(result).toEqual({ success: true, statusCode: 201 });
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString() }),
        }),
      );
      mockFetch.mockRestore();
    });

    it('should route folderKey from the positional options to X-UIPATH-FolderKey', async () => {
      mockApiClient.get.mockResolvedValueOnce(createMockWriteUriApiResponse());
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 } as Response);

      try {
        await bucketService.uploadFile(
          BUCKET_TEST_CONSTANTS.BUCKET_ID,
          BUCKET_TEST_CONSTANTS.FILE_PATH,
          new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
          { folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY },
        );

        expect(mockApiClient.get).toHaveBeenCalledWith(
          BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
          expect.objectContaining({
            headers: expect.objectContaining({ [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY }),
          }),
        );
        expect(mockApiClient.get).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should route folderPath from the positional options to X-UIPATH-FolderPath-Encoded', async () => {
      mockApiClient.get.mockResolvedValueOnce(createMockWriteUriApiResponse());
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 } as Response);

      try {
        await bucketService.uploadFile(
          BUCKET_TEST_CONSTANTS.BUCKET_ID,
          BUCKET_TEST_CONSTANTS.FILE_PATH,
          new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
          { folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH },
        );

        expect(mockApiClient.get).toHaveBeenCalledWith(
          BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
          expect.objectContaining({
            headers: expect.objectContaining({ [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_ENCODED }),
          }),
        );
        expect(mockApiClient.get).not.toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should throw ValidationError when positional bucket is missing', async () => {
      await expect(
        bucketService.uploadFile(
          null as any,
          BUCKET_TEST_CONSTANTS.FILE_PATH,
          new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        ),
      ).rejects.toThrow('bucket is required for Buckets.uploadFile');
    });

    it('should throw ValidationError when positional path is missing', async () => {
      await expect(
        bucketService.uploadFile(
          BUCKET_TEST_CONSTANTS.BUCKET_ID,
          null as any,
          new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        ),
      ).rejects.toThrow('path is required for uploadFile');
    });

    it('should throw ValidationError when positional content is missing', async () => {
      await expect(
        bucketService.uploadFile(
          BUCKET_TEST_CONSTANTS.BUCKET_ID,
          BUCKET_TEST_CONSTANTS.FILE_PATH,
          null as any,
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        ),
      ).rejects.toThrow('content is required for uploadFile');
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

    it('should throw ValidationError when bucket is missing', async () => {
      await expect(bucketService.getReadUri({
        bucketId: null as any,
        folderId: TEST_CONSTANTS.FOLDER_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH
      })).rejects.toThrow('bucket is required for Buckets.getReadUri');
    });

    it('should throw ValidationError when no folder context can be resolved', async () => {
      await expect(bucketService.getReadUri({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
      })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should route folderKey from the options object to X-UIPATH-FolderKey', async () => {
      mockApiClient.get.mockResolvedValue(createMockReadUriApiResponse());

      await bucketService.getReadUri({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY }),
        }),
      );
      expect(mockApiClient.get).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
      );
    });

    it('should route folderPath from the options object to X-UIPATH-FolderPath-Encoded', async () => {
      mockApiClient.get.mockResolvedValue(createMockReadUriApiResponse());

      await bucketService.getReadUri({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_ENCODED }),
        }),
      );
      expect(mockApiClient.get).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
      );
    });

    it('should fall back to the SDK init-time folderKey when no folder context is supplied', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
      const scopedService = new BucketService(instance);
      mockApiClient.get.mockResolvedValue(createMockReadUriApiResponse());

      await scopedService.getReadUri({
        bucketId: BUCKET_TEST_CONSTANTS.BUCKET_ID,
        path: BUCKET_TEST_CONSTANTS.FILE_PATH,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY }),
        }),
      );
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

    it('should rewrite renamed SDK field names in select before calling the API', async () => {
      mockApiClient.get.mockResolvedValue(createMockReadUriApiResponse());

      await bucketService.getReadUri(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID, select: 'uri,httpMethod' },
      );

      // httpMethod → verb (from BucketMap reversed).
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'uri,verb',
          }),
        }),
      );
    });
  });

  describe('getReadUri — positional form', () => {
    it('should get read URI using positional bucketId/path', async () => {
      mockApiClient.get.mockResolvedValue(createMockReadUriApiResponse());

      const result = await bucketService.getReadUri(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(result).toBeDefined();
      expect(result.uri).toBe(BUCKET_TEST_CONSTANTS.READ_URI);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({ path: BUCKET_TEST_CONSTANTS.FILE_PATH }),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
      );
    });

    it('should route folderKey from the positional options to X-UIPATH-FolderKey', async () => {
      mockApiClient.get.mockResolvedValue(createMockReadUriApiResponse());

      await bucketService.getReadUri(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY }),
        }),
      );
      expect(mockApiClient.get).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
      );
    });

    it('should route folderPath from the positional options to X-UIPATH-FolderPath-Encoded', async () => {
      mockApiClient.get.mockResolvedValue(createMockReadUriApiResponse());

      await bucketService.getReadUri(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderPath: BUCKET_TEST_CONSTANTS.FOLDER_PATH },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({ [FOLDER_PATH_ENCODED]: BUCKET_TEST_CONSTANTS.FOLDER_PATH_ENCODED }),
        }),
      );
      expect(mockApiClient.get).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ headers: expect.objectContaining({ [FOLDER_ID]: expect.anything() }) }),
      );
    });

    it('should throw ValidationError when positional bucket is missing', async () => {
      await expect(
        bucketService.getReadUri(
          null as any,
          BUCKET_TEST_CONSTANTS.FILE_PATH,
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        ),
      ).rejects.toThrow('bucket is required for Buckets.getReadUri');
    });

    it('should throw ValidationError when positional path is missing', async () => {
      await expect(
        bucketService.getReadUri(
          BUCKET_TEST_CONSTANTS.BUCKET_ID,
          null as any,
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        ),
      ).rejects.toThrow('path is required for getUri');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file from a bucket successfully', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.DELETE_FILE(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: { path: BUCKET_TEST_CONSTANTS.FILE_PATH },
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
      );
    });

    it('should resolve folderKey into the FolderKey header', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY },
      );

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.DELETE_FILE(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
          }),
        }),
      );
    });

    it('should throw ValidationError when bucket is missing', async () => {
      await expect(bucketService.deleteFile(
        null as any,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toThrow('bucket is required for Buckets.deleteFile');
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no folder context is provided', async () => {
      await expect(bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
      )).rejects.toThrow(ValidationError);
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when path is missing', async () => {
      await expect(bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        null as any,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toThrow('path is required for deleteFile');
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.delete.mockRejectedValue(error);

      await expect(bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getFiles', () => {
    it('should return files without pagination', async () => {
      const mockFiles: BucketFile[] = [
        { path: 'file1.txt', contentType: 'text/plain', size: 10, isDirectory: false, id: null },
        { path: 'folder1', contentType: '', size: 0, isDirectory: true, id: null },
      ];
      const mockResponse = { items: mockFiles, totalCount: undefined };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await bucketService.getFiles(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: () => string) =>
            fn() === BUCKET_ENDPOINTS.GET_FILES(BUCKET_TEST_CONSTANTS.BUCKET_ID),
          ),
          transformFn: expect.any(Function),
          pagination: expect.objectContaining({
            paginationType: PaginationType.OFFSET,
            itemsField: ODATA_PAGINATION.ITEMS_FIELD,
            totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
          }),
          excludeFromPrefix: ['directory', 'recursive', 'fileNameRegex'],
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
        expect.objectContaining({
          directory: '/',
          recursive: true,
        }),
      );

      expect(result).toEqual(mockResponse);
      expect(result.items).toHaveLength(2);
    });

    it('should pass fileNameRegex through to the request', async () => {
      const mockResponse = { items: [], totalCount: undefined };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: BucketGetFilesOptions = {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        fileNameRegex: '.*\\.pdf$',
      };

      await bucketService.getFiles(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        options,
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          excludeFromPrefix: ['directory', 'recursive', 'fileNameRegex'],
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
        expect.objectContaining({
          directory: '/',
          recursive: true,
          fileNameRegex: '.*\\.pdf$',
        }),
      );
    });

    it('should resolve folderKey into the FolderKey header', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: undefined });

      await bucketService.getFiles(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        { folderKey: BUCKET_TEST_CONSTANTS.FOLDER_KEY },
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_KEY]: BUCKET_TEST_CONSTANTS.FOLDER_KEY,
          }),
        }),
        expect.not.objectContaining({ folderKey: expect.anything() }),
      );
    });

    it('should return paginated files when pagination options provided', async () => {
      const mockFiles: BucketFile[] = [
        { path: 'a.txt', contentType: 'text/plain', size: 5, isDirectory: false, id: null },
      ];
      const mockResponse = {
        items: mockFiles,
        totalCount: undefined,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: undefined,
      };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await bucketService.getFiles(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID, pageSize: TEST_CONSTANTS.PAGE_SIZE },
      ) as PaginatedResponse<BucketFile>;

      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should transform PascalCase API response to camelCase with path rename', async () => {
      vi.mocked(PaginationHelpers.getAll).mockImplementation(async ({ transformFn }) => {
        const raw = {
          FullPath: 'docs/report.pdf',
          ContentType: 'application/pdf',
          Size: 12345,
          IsDirectory: false,
          Id: null,
        };
        const transformed = transformFn?.(raw);
        return { items: [transformed], totalCount: undefined };
      });

      const result = await bucketService.getFiles(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      const file = result.items[0];
      expect(file.path).toBe('docs/report.pdf');
      expect(file.contentType).toBe('application/pdf');
      expect(file.size).toBe(12345);
      expect(file.isDirectory).toBe(false);
      expect(file.id).toBeNull();
      // PascalCase originals must be absent
      expect((file as any).FullPath).toBeUndefined();
      expect((file as any).ContentType).toBeUndefined();
      expect((file as any).IsDirectory).toBeUndefined();
      // fullPath (intermediate camelCase) was renamed to path via BucketMap
      expect((file as any).fullPath).toBeUndefined();
    });

    it('should throw ValidationError when bucket is missing', async () => {
      await expect(bucketService.getFiles(null as any, { folderId: TEST_CONSTANTS.FOLDER_ID }))
        .rejects.toThrow('bucket is required for Buckets.getFiles');
      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no folder context is provided', async () => {
      await expect(bucketService.getFiles(BUCKET_TEST_CONSTANTS.BUCKET_ID))
        .rejects.toThrow(ValidationError);
      expect(PaginationHelpers.getAll).not.toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(bucketService.getFiles(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });

    it('should translate SDK field names to API names in filter before delegating', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [] } as any);

      await bucketService.getFiles(BUCKET_TEST_CONSTANTS.BUCKET_ID, {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        filter: "path eq '/folder/file.pdf' and httpMethod eq 'GET'",
      });

      // path → fullPath, httpMethod → verb (from BucketMap).
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: "fullPath eq '/folder/file.pdf' and verb eq 'GET'",
        }),
      );
    });
  });

  describe('bucket name resolution', () => {
    const nameLookupResponse = { value: [{ Id: BUCKET_TEST_CONSTANTS.BUCKET_ID }] };
    const emptyLookupResponse = { value: [] };

    it('deleteFile should resolve a bucket name to its Id before deleting', async () => {
      mockApiClient.get.mockResolvedValueOnce(nameLookupResponse);
      mockApiClient.delete.mockResolvedValue(undefined);

      await bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      // Resolver hit /odata/Buckets with $filter/$select/$top
      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$filter': `Name eq '${BUCKET_TEST_CONSTANTS.BUCKET_NAME}'`,
            '$select': 'Id',
            '$top': '1',
          }),
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
      );

      // Downstream DELETE used the resolved numeric Id
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.DELETE_FILE(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: { path: BUCKET_TEST_CONSTANTS.FILE_PATH },
        }),
      );
    });

    it('deleteFile should throw NotFoundError when the bucket name is missing', async () => {
      mockApiClient.get.mockResolvedValueOnce(emptyLookupResponse);

      await expect(bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.MISSING_BUCKET_NAME,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toBeInstanceOf(NotFoundError);
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('getFiles should resolve a bucket name to its Id before listing files', async () => {
      mockApiClient.get.mockResolvedValueOnce(nameLookupResponse);
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: [],
        totalCount: 0,
        hasNextPage: false,
      } as any);

      await bucketService.getFiles(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$filter': `Name eq '${BUCKET_TEST_CONSTANTS.BUCKET_NAME}'`,
            '$select': 'Id',
          }),
        }),
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalled();
      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect((config as any).getEndpoint()).toBe(
        BUCKET_ENDPOINTS.GET_FILES(BUCKET_TEST_CONSTANTS.BUCKET_ID),
      );
    });

    it('getFileMetaData should resolve a bucket name to its Id before listing metadata', async () => {
      mockApiClient.get.mockResolvedValueOnce(nameLookupResponse);
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({
        items: [],
        totalCount: 0,
        hasNextPage: false,
      } as any);

      await bucketService.getFileMetaData(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect((config as any).getEndpoint()).toBe(
        BUCKET_ENDPOINTS.GET_FILE_META_DATA(BUCKET_TEST_CONSTANTS.BUCKET_ID),
      );
    });

    it('getReadUri should resolve a bucket name to its Id before fetching URI', async () => {
      // First get is the name lookup, second is _getUri
      mockApiClient.get
        .mockResolvedValueOnce(nameLookupResponse)
        .mockResolvedValueOnce(createMockReadUriApiResponse());

      await bucketService.getReadUri(
        BUCKET_TEST_CONSTANTS.BUCKET_NAME,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        BUCKET_ENDPOINTS.GET_READ_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({ path: BUCKET_TEST_CONSTANTS.FILE_PATH }),
        }),
      );
    });

    it('uploadFile should resolve a bucket name to its Id before uploading', async () => {
      // First get is the name lookup, second is _getWriteUri
      mockApiClient.get
        .mockResolvedValueOnce(nameLookupResponse)
        .mockResolvedValueOnce(createMockWriteUriApiResponse());

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 200 } as Response);
      try {
        await bucketService.uploadFile(
          BUCKET_TEST_CONSTANTS.BUCKET_NAME,
          BUCKET_TEST_CONSTANTS.FILE_PATH,
          new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
          { folderId: TEST_CONSTANTS.FOLDER_ID },
        );
      } finally {
        globalThis.fetch = originalFetch;
      }

      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        BUCKET_ENDPOINTS.GET_WRITE_URI(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.objectContaining({
          params: expect.objectContaining({ path: BUCKET_TEST_CONSTANTS.FILE_PATH }),
        }),
      );
    });

    it('should skip the name-lookup GET when a numeric bucket id is passed', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await bucketService.deleteFile(
        BUCKET_TEST_CONSTANTS.BUCKET_ID,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      // No resolver call: numeric ids bypass the OData lookup.
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.delete).toHaveBeenCalledWith(
        BUCKET_ENDPOINTS.DELETE_FILE(BUCKET_TEST_CONSTANTS.BUCKET_ID),
        expect.any(Object),
      );
    });

    it('should reject non-positive numeric bucket ids with a specific message', async () => {
      await expect(bucketService.deleteFile(
        0,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toThrow('bucket must be a positive numeric Id for Buckets.deleteFile');

      await expect(bucketService.deleteFile(
        -5,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toThrow('bucket must be a positive numeric Id for Buckets.deleteFile');
    });

    it('should propagate the resolver NotFoundError from uploadFile', async () => {
      mockApiClient.get.mockResolvedValueOnce(emptyLookupResponse);

      await expect(bucketService.uploadFile(
        BUCKET_TEST_CONSTANTS.MISSING_BUCKET_NAME,
        BUCKET_TEST_CONSTANTS.FILE_PATH,
        new Blob([BUCKET_TEST_CONSTANTS.FILE_CONTENT]),
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      )).rejects.toBeInstanceOf(NotFoundError);
      // _getWriteUri was never reached
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });
  });
});

