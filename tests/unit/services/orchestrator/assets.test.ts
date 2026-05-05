// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AssetService } from '../../../../src/services/orchestrator/assets';
import { ApiClient } from '../../../../src/core/http/api-client';
import { PaginationHelpers } from '../../../../src/utils/pagination/helpers';
import { 
  createMockRawAsset,
  createMockTransformedAssetCollection
} from '../../../utils/mocks/assets';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { createMockError } from '../../../utils/mocks/core';
import {
  AssetGetAllOptions,
  AssetGetByIdOptions,
  AssetValueType,
  AssetValueScope,
  AssetGetResponse
} from '../../../../src/models/orchestrator/assets.types';
import { PaginatedResponse } from '../../../../src/utils/pagination';
import { ASSET_TEST_CONSTANTS } from '../../../utils/constants/assets';
import { TEST_CONSTANTS } from '../../../utils/constants/common';
import { ASSET_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { FOLDER_ID, FOLDER_KEY, FOLDER_PATH_ENCODED } from '../../../../src/utils/constants/headers';
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
// NOTE: We do NOT mock transformData
vi.mock('../../../../src/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('AssetService Unit Tests', () => {
  let assetService: AssetService;
  let mockApiClient: any;

  beforeEach(() => {
    // Create mock instances using centralized setup
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    // Mock the ApiClient constructor
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    assetService = new AssetService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get asset by ID successfully with all fields mapped correctly', async () => {
      const mockAsset = createMockRawAsset();
      
      mockApiClient.get.mockResolvedValue(mockAsset);

      const result = await assetService.getById(
        ASSET_TEST_CONSTANTS.ASSET_ID, 
        TEST_CONSTANTS.FOLDER_ID
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(ASSET_TEST_CONSTANTS.ASSET_ID);
      expect(result.name).toBe(ASSET_TEST_CONSTANTS.ASSET_NAME);
      expect(result.key).toBe(ASSET_TEST_CONSTANTS.ASSET_KEY);
      expect(result.valueType).toBe(AssetValueType.DBConnectionString,);
      expect(result.valueScope).toBe(AssetValueScope.Global,);

      // Verify the API call has correct endpoint and headers
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString()
          })
        })
      );

      // Verify field transformations
      // CreationTime -> createdTime
      expect(result.createdTime).toBe(ASSET_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined(); // Original field should be removed
      
      // LastModificationTime -> lastModifiedTime
      expect(result.lastModifiedTime).toBe(ASSET_TEST_CONSTANTS.LAST_MODIFIED_TIME);
      expect((result as any).LastModificationTime).toBeUndefined(); // Original field should be removed
    });

    it('should get asset with options successfully', async () => {
      const mockAsset = createMockRawAsset();
      mockApiClient.get.mockResolvedValue(mockAsset);

      const options: AssetGetByIdOptions = {
        expand: ASSET_TEST_CONSTANTS.ODATA_EXPAND_KEY_VALUE_LIST,
        select: ASSET_TEST_CONSTANTS.ODATA_SELECT_FIELDS
      };

      const result = await assetService.getById(
        ASSET_TEST_CONSTANTS.ASSET_ID,
        TEST_CONSTANTS.FOLDER_ID,
        options
      );

      // Verify the result
      expect(result).toBeDefined();
      expect(result.id).toBe(ASSET_TEST_CONSTANTS.ASSET_ID);
      expect(result.name).toBe(ASSET_TEST_CONSTANTS.ASSET_NAME);
      expect(result.key).toBe(ASSET_TEST_CONSTANTS.ASSET_KEY);

      // Verify API call has options with OData prefix
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$expand': ASSET_TEST_CONSTANTS.ODATA_EXPAND_KEY_VALUE_LIST,
            '$select': ASSET_TEST_CONSTANTS.ODATA_SELECT_FIELDS
          })
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(ASSET_TEST_CONSTANTS.ERROR_ASSET_NOT_FOUND);
      mockApiClient.get.mockRejectedValue(error);

      await expect(assetService.getById(
        ASSET_TEST_CONSTANTS.ASSET_ID, 
        TEST_CONSTANTS.FOLDER_ID
      )).rejects.toThrow(ASSET_TEST_CONSTANTS.ERROR_ASSET_NOT_FOUND);
    });
  });

  describe('getAll', () => {
    it('should return all assets without pagination options', async () => {
      const mockResponse = createMockTransformedAssetCollection();
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await assetService.getAll();

      // Verify PaginationHelpers.getAll was called
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === ASSET_ENDPOINTS.GET_ALL),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return assets filtered by folder ID', async () => {
      const mockResponse = createMockTransformedAssetCollection();
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: AssetGetAllOptions = {
        folderId: TEST_CONSTANTS.FOLDER_ID
      };

      const result = await assetService.getAll(options);

      // Verify PaginationHelpers.getAll was called with folder options
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn(TEST_CONSTANTS.FOLDER_ID) === ASSET_ENDPOINTS.GET_BY_FOLDER),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        expect.objectContaining({
          folderId: TEST_CONSTANTS.FOLDER_ID
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated assets when pagination options provided', async () => {
      const mockResponse = createMockTransformedAssetCollection(100, {
        totalCount: 100,
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
        previousCursor: null,
        currentPage: 1,
        totalPages: 10
      });
      
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: AssetGetAllOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE
      };

      const result = await assetService.getAll(options) as PaginatedResponse<AssetGetResponse>;

      // Verify PaginationHelpers.getAll was called with pagination options
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(assetService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getByName', () => {
    it('should return a transformed asset when the OData response contains one item', async () => {
      const rawAsset = createMockRawAsset();
      mockApiClient.get.mockResolvedValue({ value: [rawAsset] });

      const result = await assetService.getByName(
        ASSET_TEST_CONSTANTS.ASSET_NAME,
        { folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH },
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(ASSET_TEST_CONSTANTS.ASSET_ID);
      expect(result.name).toBe(ASSET_TEST_CONSTANTS.ASSET_NAME);
      expect(result.key).toBe(ASSET_TEST_CONSTANTS.ASSET_KEY);
      expect(result.valueType).toBe(AssetValueType.DBConnectionString);

      // Transform validation — camelCase fields present, PascalCase originals absent
      expect(result.createdTime).toBe(ASSET_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();
      expect(result.lastModifiedTime).toBe(ASSET_TEST_CONSTANTS.LAST_MODIFIED_TIME);
      expect((result as any).LastModificationTime).toBeUndefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$filter': `Name eq '${ASSET_TEST_CONSTANTS.ASSET_NAME}'`,
            '$top': '1',
          }),
        }),
      );
    });

    it('should route a numeric folderId to X-UIPATH-OrganizationUnitId', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
      });
      expect(requestSpec.headers[FOLDER_KEY]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
    });

    it('should route folderKey to X-UIPATH-FolderKey', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, { folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY });

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_KEY]: ASSET_TEST_CONSTANTS.FOLDER_KEY,
      });
      expect(requestSpec.headers[FOLDER_ID]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
    });

    it('should route folderPath to X-UIPATH-FolderPath-Encoded (base64-of-UTF-16-LE)', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await assetService.getByName(
        ASSET_TEST_CONSTANTS.ASSET_NAME,
        { folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH_WITH_SPACE },
      );

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_PATH_ENCODED]: ASSET_TEST_CONSTANTS.FOLDER_PATH_WITH_SPACE_ENCODED,
      });
      expect(requestSpec.headers[FOLDER_ID]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_KEY]).toBeUndefined();
    });

    it('should pass OData query options through to the request', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await assetService.getByName(
        ASSET_TEST_CONSTANTS.ASSET_NAME,
        {
          folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH,
          expand: ASSET_TEST_CONSTANTS.ODATA_EXPAND_KEY_VALUE_LIST,
        },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$expand': ASSET_TEST_CONSTANTS.ODATA_EXPAND_KEY_VALUE_LIST,
          }),
        }),
      );
    });

    it('should OData-escape single quotes in the name', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await assetService.getByName(
        ASSET_TEST_CONSTANTS.ASSET_NAME_WITH_QUOTE,
        { folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$filter': `Name eq '${ASSET_TEST_CONSTANTS.ASSET_NAME_WITH_QUOTE_ESCAPED}'`,
          }),
        }),
      );
    });

    it('should throw NotFoundError when the OData value array is empty', async () => {
      mockApiClient.get.mockResolvedValue({ value: [] });

      await expect(
        assetService.getByName(ASSET_TEST_CONSTANTS.MISSING_ASSET_NAME, { folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError for an empty name', async () => {
      await expect(
        assetService.getByName('   ', { folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should fall back to SDK init-time folderKey when no folder is provided', async () => {
      // Simulates the coded-app meta-tag (`uipath:folder-key`) path.
      const { instance } = createServiceTestDependencies({ folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
      const scopedService = new AssetService(instance);

      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await scopedService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME);

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_KEY]: ASSET_TEST_CONSTANTS.FOLDER_KEY,
      });
      expect(requestSpec.headers[FOLDER_ID]).toBeUndefined();
      expect(requestSpec.headers[FOLDER_PATH_ENCODED]).toBeUndefined();
    });

    it('should suppress the init-time folderKey fallback when the caller provides explicit folder', async () => {
      const { instance } = createServiceTestDependencies({ folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY });
      vi.mocked(ApiClient).mockImplementation(() => mockApiClient);
      const scopedService = new AssetService(instance);

      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await scopedService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, { folderPath: ASSET_TEST_CONSTANTS.FOLDER_PATH });

      const [, requestSpec] = mockApiClient.get.mock.calls[0];
      expect(requestSpec.headers).toMatchObject({
        [FOLDER_PATH_ENCODED]: ASSET_TEST_CONSTANTS.FOLDER_PATH_ENCODED,
      });
      // folderKey from config must NOT leak when folder is explicitly supplied
      expect(requestSpec.headers[FOLDER_KEY]).toBeUndefined();
    });

    it('should throw ValidationError when no folder context is resolvable', async () => {
      // No folder arg AND no init-time folderKey on config — must reject.
      await expect(assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME))
        .rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });
});
