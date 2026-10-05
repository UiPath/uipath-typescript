// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FolderService } from '@/services/orchestrator/folders/folders';
import { ApiClient } from '@/core/http/api-client';
import { FOLDER_ENDPOINTS } from '@/utils/constants/endpoints';
import { NotFoundError, ValidationError } from '@/core/errors';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { FOLDER_TEST_CONSTANTS } from '@tests/utils/constants/folders';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { FOLDER_PAGINATION, FOLDER_OFFSET_PARAMS } from '@/utils/constants/common';
import type { FolderGetAllResponse } from '@/models/orchestrator/folders.types';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');
vi.mock('@/utils/pagination/helpers');

// ===== TEST SUITE =====
describe('FolderService Unit Tests', () => {
  let folderService: FolderService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as ApiClient; });

    folderService = new FolderService(instance);
    vi.mocked(PaginationHelpers.getAll).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    const PAGE = {
      items: [FOLDER_TEST_CONSTANTS.RAW_LIST_FOLDER],
      totalCount: 1,
      hasNextPage: false,
    };

    it('should list folders using the folder-list endpoint and pagination shape', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(PAGE);

      const result = await folderService.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.any(Function),
          transformFn: expect.any(Function),
          pagination: expect.objectContaining({
            itemsField: FOLDER_PAGINATION.ITEMS_FIELD,
            totalCountField: FOLDER_PAGINATION.TOTAL_COUNT_FIELD,
            paginationParams: {
              pageSizeParam: FOLDER_OFFSET_PARAMS.PAGE_SIZE_PARAM,
              offsetParam: FOLDER_OFFSET_PARAMS.OFFSET_PARAM,
              countParam: FOLDER_OFFSET_PARAMS.COUNT_PARAM,
            },
          }),
        }),
        undefined,
      );

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config.getEndpoint()).toBe(FOLDER_ENDPOINTS.GET_ALL);
      expect(result).toEqual(PAGE);
    });

    it('should forward pagination options to the pagination helper', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(PAGE);

      await folderService.getAll({ pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        { pageSize: TEST_CONSTANTS.PAGE_SIZE },
      );
    });

    it('should map list fields to camelCase and drop the raw PascalCase fields', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(PAGE);

      await folderService.getAll();

      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      const folder = config.transformFn(
        FOLDER_TEST_CONSTANTS.RAW_LIST_FOLDER,
      ) as FolderGetAllResponse;

      expect(folder.id).toBe(123);
      expect(folder.key).toBe(FOLDER_TEST_CONSTANTS.FOLDER_KEY);
      expect(folder.displayName).toBe('Finance');
      expect(folder.fullyQualifiedName).toBe('Shared/Finance');
      expect(folder.description).toBe('AP invoices');
      expect(folder.folderType).toBe('Standard');
      expect(folder.parentId).toBe(10);
      expect(folder.parentKey).toBe(FOLDER_TEST_CONSTANTS.PARENT_KEY);
      expect((folder as any).DisplayName).toBeUndefined();
      expect((folder as any).FullyQualifiedName).toBeUndefined();
      expect((folder as any).FolderType).toBeUndefined();
      expect((folder as any).ParentKey).toBeUndefined();
    });

    it('should propagate an error raised while listing folders', async () => {
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(
        createMockError(TEST_CONSTANTS.ERROR_MESSAGE),
      );

      await expect(folderService.getAll()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getByKey', () => {
    it('should get a folder by key with fields mapped to camelCase', async () => {
      mockApiClient.get.mockResolvedValue(FOLDER_TEST_CONSTANTS.RAW_FOLDER);

      const result = await folderService.getByKey(FOLDER_TEST_CONSTANTS.FOLDER_KEY);

      expect(result.id).toBe(123);
      expect(result.key).toBe(FOLDER_TEST_CONSTANTS.FOLDER_KEY);
      expect(result.displayName).toBe('Finance');
      expect(result.fullyQualifiedName).toBe('Shared/Finance');
      expect(result.fullyQualifiedNameOrderable).toBe('Shared/Finance');
      expect(result.description).toBe('AP invoices');
      expect(result.folderType).toBe('Standard');
      expect(result.provisionType).toBe('Automatic');
      expect(result.permissionModel).toBe('FineGrained');
      expect(result.parentId).toBe(10);
      expect(result.parentKey).toBe(FOLDER_TEST_CONSTANTS.PARENT_KEY);
      expect(result.feedType).toBe('Processes');
      expect(result.isActive).toBe(true);
      expect((result as any).DisplayName).toBeUndefined();
      expect((result as any).FullyQualifiedName).toBeUndefined();
      expect((result as any).FolderType).toBeUndefined();
      expect((result as any).ParentId).toBeUndefined();
      expect((result as any).IsActive).toBeUndefined();
      expect(result).not.toHaveProperty('@odata.context');
    });

    it('should call GetByKey with select options and no folder headers', async () => {
      mockApiClient.get.mockResolvedValue(FOLDER_TEST_CONSTANTS.RAW_FOLDER);

      await folderService.getByKey(FOLDER_TEST_CONSTANTS.FOLDER_KEY, { select: 'fullyQualifiedName' });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        FOLDER_ENDPOINTS.GET_BY_KEY(FOLDER_TEST_CONSTANTS.FOLDER_KEY),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'fullyQualifiedName',
          }),
        }),
      );
      const [, requestOptions] = mockApiClient.get.mock.calls[0];
      expect(requestOptions.headers ?? {}).toEqual({});
      expect(requestOptions.params).not.toHaveProperty('$filter');
      expect(requestOptions.params).not.toHaveProperty('$top');
    });

    it('should reject a non-GUID key', async () => {
      await expect(folderService.getByKey('not-a-guid')).rejects.toThrow(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should reject an empty key', async () => {
      await expect(folderService.getByKey('')).rejects.toThrow(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should reject a whitespace-only key', async () => {
      await expect(folderService.getByKey('   ')).rejects.toThrow(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when the folder is missing', async () => {
      mockApiClient.get.mockRejectedValue(new NotFoundError({ message: 'not found' }));

      await expect(folderService.getByKey(FOLDER_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(NotFoundError);
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(folderService.getByKey(FOLDER_TEST_CONSTANTS.FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
