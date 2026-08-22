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
import { OVERRIDE_TEST_CONSTANTS } from '../../../utils/constants/overrides';
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
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

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
      expect(result.valueType).toBe(AssetValueType.Text,);
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

    it('should translate SDK field names to API names in filter/orderby before delegating', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(
        createMockTransformedAssetCollection(),
      );

      await assetService.getAll({
        filter: "createdTime gt 2026-01-01",
        orderby: 'lastModifiedTime desc',
      });

      // createdTime → creationTime, lastModifiedTime → lastModificationTime.
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: 'creationTime gt 2026-01-01',
          orderby: 'lastModificationTime desc',
        }),
      );
    });
  });

  describe('OData field rewrite in getById', () => {
    it('should rewrite renamed SDK field names in select before calling the API', async () => {
      mockApiClient.get.mockResolvedValue(createMockRawAsset());

      await assetService.getById(
        ASSET_TEST_CONSTANTS.ASSET_ID,
        TEST_CONSTANTS.FOLDER_ID,
        { select: 'name,createdTime,lastModifiedTime' },
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'name,creationTime,lastModificationTime',
          }),
        }),
      );
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
      expect(result.valueType).toBe(AssetValueType.Text);

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

    it('should rewrite renamed SDK field names in select before calling the API', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      await assetService.getByName(ASSET_TEST_CONSTANTS.ASSET_NAME, {
        folderId: TEST_CONSTANTS.FOLDER_ID,
        select: 'name,createdTime,lastModifiedTime',
      });

      // createdTime → creationTime, lastModifiedTime → lastModificationTime.
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_FOLDER,
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'name,creationTime,lastModificationTime',
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
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
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
      vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });
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

  describe('getByKey', () => {
    it('issues the folder-scoped OData Key filter and returns the resolved asset', async () => {
      mockApiClient.get.mockResolvedValue({ value: [createMockRawAsset()] });

      const result = await assetService.getByKey(ASSET_TEST_CONSTANTS.ASSET_KEY, { folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(result.id).toBe(ASSET_TEST_CONSTANTS.ASSET_ID);
      expect(result.name).toBe(ASSET_TEST_CONSTANTS.ASSET_NAME);

      // Transform validation — camelCase renames present, PascalCase originals absent.
      // Guards against a regression where pascalToCamelCaseKeys()/transformData() stops running.
      expect(result.createdTime).toBe(ASSET_TEST_CONSTANTS.CREATED_TIME);
      expect((result as any).CreationTime).toBeUndefined();
      expect(result.lastModifiedTime).toBe(ASSET_TEST_CONSTANTS.LAST_MODIFIED_TIME);
      expect((result as any).LastModificationTime).toBeUndefined();

      const [endpoint, opts] = mockApiClient.get.mock.calls[0];
      expect(endpoint).toBe(ASSET_ENDPOINTS.GET_BY_FOLDER);
      expect(opts?.params?.$filter).toBe(`Key eq ${ASSET_TEST_CONSTANTS.ASSET_KEY}`);
      expect(opts?.params?.$top).toBe('1');
      expect(opts?.headers?.[FOLDER_ID]).toBe(TEST_CONSTANTS.FOLDER_ID.toString());
    });

    it('throws NotFoundError when no asset matches the key', async () => {
      mockApiClient.get.mockResolvedValue({ value: [] });

      await expect(
        assetService.getByKey(ASSET_TEST_CONSTANTS.ASSET_KEY, { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('rejects a non-GUID key with ValidationError before hitting the API', async () => {
      await expect(
        assetService.getByKey('not-a-guid', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('rejects an empty key with ValidationError', async () => {
      await expect(
        assetService.getByKey('', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });
  });

  describe('updateValueById', () => {
    const mockExistingAsset = (overrides: Record<string, unknown> = {}) =>
      createMockRawAsset({
        ValueType: AssetValueType.Text,
        ValueScope: AssetValueScope.Global,
        Value: 'old-value',
        StringValue: 'old-value',
        ...overrides,
      });

    it('should fetch the asset, then PUT with preserved name/scope/type and the new StringValue', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset());
      mockApiClient.put.mockResolvedValue({});

      const result = await assetService.updateValueById(
        ASSET_TEST_CONSTANTS.ASSET_ID,
        'new-text-value',
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(result).toBeUndefined();

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({
          Id: ASSET_TEST_CONSTANTS.ASSET_ID,
          Name: ASSET_TEST_CONSTANTS.ASSET_NAME,
          ValueScope: AssetValueScope.Global,
          ValueType: AssetValueType.Text,
          Description: ASSET_TEST_CONSTANTS.ASSET_DESCRIPTION,
          StringValue: 'new-text-value',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            [FOLDER_ID]: TEST_CONSTANTS.FOLDER_ID.toString(),
          }),
        }),
      );
    });

    it('should send IntValue when the existing asset is Integer', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Integer }));
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 42, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, body] = mockApiClient.put.mock.calls[0];
      expect(body.ValueType).toBe(AssetValueType.Integer);
      expect(body.IntValue).toBe(42);
      expect(body.StringValue).toBeUndefined();
    });

    it('should send BoolValue when the existing asset is Bool (both true and false)', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Bool }));
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, true, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, trueBody] = mockApiClient.put.mock.calls[0];
      expect(trueBody.ValueType).toBe(AssetValueType.Bool);
      expect(trueBody.BoolValue).toBe(true);
      expect(trueBody.StringValue).toBeUndefined();

      // `false` is falsy — a naive truthy guard (e.g., `if (!newValue)`) would silently
      // reject it. Lock in that the falsy-but-valid case still produces a PUT.
      await assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, false, { folderId: TEST_CONSTANTS.FOLDER_ID });

      const [, falseBody] = mockApiClient.put.mock.calls[1];
      expect(falseBody.ValueType).toBe(AssetValueType.Bool);
      expect(falseBody.BoolValue).toBe(false);
      expect(falseBody.StringValue).toBeUndefined();
    });

    it('should throw ValidationError when id is missing', async () => {
      await expect(
        assetService.updateValueById(0, 'x', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no folder context is provided', async () => {
      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 'x'),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should accept folderKey as folder context', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset());
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValueById(
        ASSET_TEST_CONSTANTS.ASSET_ID,
        'new-text-value',
        { folderKey: ASSET_TEST_CONSTANTS.FOLDER_KEY },
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-UIPATH-FolderKey': ASSET_TEST_CONSTANTS.FOLDER_KEY,
          }),
        }),
      );
    });

    it('should throw ValidationError when newValue is null or undefined', async () => {
      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, null as unknown as string, { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, undefined as unknown as string, { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when newValue type does not match Text asset', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Text }));

      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 42 as unknown as string, { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when newValue type does not match Integer asset', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Integer }));

      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 'not-a-number' as unknown as number, { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      // Non-integer numbers should also fail
      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 1.5, { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when newValue type does not match Bool asset', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Bool }));

      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 'true' as unknown as boolean, { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when the existing asset valueType is unsupported', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Credential }));

      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 'x', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Secret }));

      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 'x', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate API errors from the PUT call', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset());
      mockApiClient.put.mockRejectedValue(createMockError(ASSET_TEST_CONSTANTS.ERROR_ASSET_NOT_FOUND));

      await expect(
        assetService.updateValueById(ASSET_TEST_CONSTANTS.ASSET_ID, 'x', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toThrow(ASSET_TEST_CONSTANTS.ERROR_ASSET_NOT_FOUND);
    });
  });

  describe('updateValue (ref-based)', () => {
    const mockExistingAsset = (overrides: Record<string, unknown> = {}) =>
      createMockRawAsset({
        ValueType: AssetValueType.Text,
        ValueScope: AssetValueScope.Global,
        Value: 'old-value',
        StringValue: 'old-value',
        ...overrides,
      });

    it('takes the id branch and updates without a name lookup when ref is {id}', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset());
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValue(
        { id: ASSET_TEST_CONSTANTS.ASSET_ID },
        'new-value',
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      // Only the byId GET + the PUT — no OData $filter lookup.
      expect(mockApiClient.get).toHaveBeenCalledExactlyOnceWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.anything(),
      );
      expect(mockApiClient.put).toHaveBeenCalledExactlyOnceWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({ StringValue: 'new-value' }),
        expect.anything(),
      );
    });

    it('resolves {name} to id via the folder-scoped OData collection then updates without a second fetch', async () => {
      // Name lookup: the base getByNameLookup issues a GET against GET_BY_FOLDER with $filter.
      // The lookup response already carries all fields the PUT needs, so no follow-up getById fires.
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawAsset()] });
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValue(
        { name: ASSET_TEST_CONSTANTS.ASSET_NAME },
        'new-value',
        { folderPath: 'Shared/Apps' },
      );

      // Exactly one GET — the OData $filter lookup. No follow-up getById.
      expect(mockApiClient.get).toHaveBeenCalledOnce();
      const [firstEndpoint, firstOpts] = mockApiClient.get.mock.calls[0];
      expect(firstEndpoint).toBe(ASSET_ENDPOINTS.GET_BY_FOLDER);
      expect(firstOpts?.params?.$filter).toBe(`Name eq '${ASSET_TEST_CONSTANTS.ASSET_NAME}'`);
      expect(firstOpts?.headers?.[FOLDER_PATH_ENCODED]).toBeDefined();

      expect(mockApiClient.put).toHaveBeenCalledExactlyOnceWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({ StringValue: 'new-value' }),
        expect.anything(),
      );
    });

    it('rejects an empty ref with ValidationError before hitting the API', async () => {
      await expect(
        assetService.updateValue({} as never, 'x', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('resolves {key} to id via the folder-scoped OData Key filter before updating', async () => {
      // Key lookup already carries all fields the PUT needs — no follow-up getById.
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawAsset()] });
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValue({ key: ASSET_TEST_CONSTANTS.ASSET_KEY }, 'new-value', { folderId: TEST_CONSTANTS.FOLDER_ID });

      expect(mockApiClient.get).toHaveBeenCalledOnce();
      const [firstEndpoint, firstOpts] = mockApiClient.get.mock.calls[0];
      expect(firstEndpoint).toBe(ASSET_ENDPOINTS.GET_BY_FOLDER);
      expect(firstOpts?.params?.$filter).toBe(`Key eq ${ASSET_TEST_CONSTANTS.ASSET_KEY}`);
      expect(firstOpts?.params?.$top).toBe('1');

      expect(mockApiClient.put).toHaveBeenCalledExactlyOnceWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({ StringValue: 'new-value' }),
        expect.anything(),
      );
    });

    it('rejects a {key} ref that is not a valid GUID', async () => {
      await expect(
        assetService.updateValue({ key: 'not-a-guid' }, 'x', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('rejects a missing newValue with ValidationError before resolving the ref', async () => {
      await expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exercising a missing arg
        assetService.updateValue({ id: ASSET_TEST_CONSTANTS.ASSET_ID }, undefined as any, {
          folderId: TEST_CONSTANTS.FOLDER_ID,
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('propagates the caller\'s folderId + folderKey onto the update call', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset());
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValue(
        { id: ASSET_TEST_CONSTANTS.ASSET_ID },
        'v',
        { folderId: TEST_CONSTANTS.FOLDER_ID, folderKey: 'k' },
      );

      const [, , putOpts] = mockApiClient.put.mock.calls[0];
      expect(putOpts?.headers?.[FOLDER_ID]).toBe(TEST_CONSTANTS.FOLDER_ID.toString());
      expect(putOpts?.headers?.[FOLDER_KEY]).toBe('k');
    });

    it('rejects Credential and Secret value types with ValidationError before the PUT', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Credential }));
      mockApiClient.put.mockResolvedValue({});

      await expect(
        assetService.updateValue({ id: ASSET_TEST_CONSTANTS.ASSET_ID }, 'x', {
          folderId: TEST_CONSTANTS.FOLDER_ID,
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      mockApiClient.get.mockResolvedValue(mockExistingAsset({ ValueType: AssetValueType.Secret }));

      await expect(
        assetService.updateValue({ id: ASSET_TEST_CONSTANTS.ASSET_ID }, 'x', {
          folderId: TEST_CONSTANTS.FOLDER_ID,
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('preserves name, scope, type, and description when updating via {id} ref', async () => {
      mockApiClient.get.mockResolvedValue(mockExistingAsset());
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValue(
        { id: ASSET_TEST_CONSTANTS.ASSET_ID },
        'new-value',
        { folderId: TEST_CONSTANTS.FOLDER_ID },
      );

      expect(mockApiClient.put).toHaveBeenCalledExactlyOnceWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({
          Id: ASSET_TEST_CONSTANTS.ASSET_ID,
          Name: ASSET_TEST_CONSTANTS.ASSET_NAME,
          ValueScope: AssetValueScope.Global,
          ValueType: AssetValueType.Text,
          Description: ASSET_TEST_CONSTANTS.ASSET_DESCRIPTION,
          StringValue: 'new-value',
        }),
        expect.anything(),
      );
    });

    it('throws ValidationError when no folder context is provided with {id} ref', async () => {
      await expect(
        assetService.updateValue({ id: ASSET_TEST_CONSTANTS.ASSET_ID }, 'x'),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('blames the caller (Assets.updateValue) in the missing-folder error, not the internal getByName lookup', async () => {
      // The base `getByNameLookup` defaults its ValidationError label to `${resourceType}.getByName`.
      // updateValue's byName branch passes `callerLabel: 'Assets.updateValue'` so the error surfaces
      // the actual public method the caller invoked.
      const error = await assetService
        .updateValue({ name: ASSET_TEST_CONSTANTS.ASSET_NAME }, 'x')
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toContain('Assets.updateValue');
      expect((error as ValidationError).message).not.toContain('Asset.getByName');
    });

    it('rejects {id: 0} with ValidationError before hitting the API', async () => {
      // `resolveRefToId` treats id=0 as a real value (generic over TId); assets guard against it.
      await expect(
        assetService.updateValue({ id: 0 }, 'x', { folderId: TEST_CONSTANTS.FOLDER_ID }),
      ).rejects.toBeInstanceOf(ValidationError);

      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('preserves name, scope, type, and description when updating via {name} ref (from the lookup response)', async () => {
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawAsset()] });
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValue(
        { name: ASSET_TEST_CONSTANTS.ASSET_NAME },
        'new-value',
        { folderPath: 'Shared/Apps' },
      );

      expect(mockApiClient.put).toHaveBeenCalledExactlyOnceWith(
        ASSET_ENDPOINTS.GET_BY_ID(ASSET_TEST_CONSTANTS.ASSET_ID),
        expect.objectContaining({
          Id: ASSET_TEST_CONSTANTS.ASSET_ID,
          Name: ASSET_TEST_CONSTANTS.ASSET_NAME,
          ValueScope: AssetValueScope.Global,
          ValueType: AssetValueType.Text,
          Description: ASSET_TEST_CONSTANTS.ASSET_DESCRIPTION,
          StringValue: 'new-value',
        }),
        expect.anything(),
      );
    });

    it('does not forward query options (e.g. $select, $expand) to the internal {name} lookup', async () => {
      // Regression guard: if the caller's options ever leak into the internal lookup, an OData
      // `$select` could trim the response and leave `preFetched.valueType` undefined — which then
      // falls through `resolveValueField` and throws "Asset x has valueType undefined; only Text,
      // Integer, and Bool are supported". `AssetUpdateValueOptions` is intentionally narrow (folder
      // scoping only) and the runtime passes only folder fields to the lookup as defence in depth.
      mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawAsset()] });
      mockApiClient.put.mockResolvedValue({});

      await assetService.updateValue(
        { name: ASSET_TEST_CONSTANTS.ASSET_NAME },
        'new-value',
        { folderPath: 'Shared/Apps' },
      );

      const [, getOpts] = mockApiClient.get.mock.calls[0];
      expect(getOpts?.params?.$select).toBeUndefined();
      expect(getOpts?.params?.$expand).toBeUndefined();
    });

    it('routes the PUT to the override\'s folder when a cross-folder override redirects the {name} lookup', async () => {
      // Publish a cross-folder override: caller asks for MyAsset in Shared/Apps → redirects to
      // Prod-MyAsset in Prod/Live. Both the lookup GET and the update PUT must scope to Prod/Live.
      const OVERRIDE_KEY = Symbol.for(OVERRIDE_TEST_CONSTANTS.CHANNEL_KEY);
      (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY] = () => ({
        [`asset.${ASSET_TEST_CONSTANTS.ASSET_NAME}.Shared/Apps`]: {
          name: OVERRIDE_TEST_CONSTANTS.TARGET_NAME,
          folderPath: OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH,
        },
      });

      try {
        mockApiClient.get.mockResolvedValueOnce({ value: [createMockRawAsset()] });
        mockApiClient.put.mockResolvedValue({});

        await assetService.updateValue(
          { name: ASSET_TEST_CONSTANTS.ASSET_NAME },
          'new-value',
          { folderPath: 'Shared/Apps' },
        );

        // Lookup GET is scoped to the redirected folder (Prod/Live), not the caller's Shared/Apps.
        const [, getOpts] = mockApiClient.get.mock.calls[0];
        expect(getOpts?.params?.$filter).toBe(`Name eq '${OVERRIDE_TEST_CONSTANTS.TARGET_NAME}'`);
        expect(getOpts?.headers?.[FOLDER_PATH_ENCODED]).toBe(OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH_ENCODED);

        // PUT is scoped to the same redirected folder — no cross-folder mismatch.
        const [, , putOpts] = mockApiClient.put.mock.calls[0];
        expect(putOpts?.headers?.[FOLDER_PATH_ENCODED]).toBe(OVERRIDE_TEST_CONSTANTS.TARGET_FOLDER_PATH_ENCODED);
      } finally {
        delete (globalThis as Record<symbol, unknown>)[OVERRIDE_KEY];
      }
    });
  });
});
