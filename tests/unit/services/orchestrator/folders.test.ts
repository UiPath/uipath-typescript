// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FolderService } from '@/services/orchestrator/folders/folders';
import { ApiClient } from '@/core/http/api-client';
import { FOLDER_ENDPOINTS } from '@/utils/constants/endpoints';
import { NotFoundError, ValidationError } from '@/core/errors';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST CONSTANTS =====
const FOLDER_KEY = '3cb92d99-9d2f-4c8c-9b8a-9b8a9b8a9b8a';
const PARENT_KEY = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

const RAW_FOLDER = {
  Id: 123,
  Key: FOLDER_KEY,
  DisplayName: 'Finance',
  FullyQualifiedName: 'Shared/Finance',
  Description: 'AP invoices',
  FolderType: 'Standard',
  IsPersonal: false,
  ProvisionType: 'Automatic',
  PermissionModel: 'FineGrained',
  ParentId: 10,
  ParentKey: PARENT_KEY,
  FeedType: 'Processes',
};

// ===== TEST SUITE =====
describe('FolderService Unit Tests', () => {
  let folderService: FolderService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient; });

    folderService = new FolderService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getByKey', () => {
    it('should get a folder by key with fields mapped to camelCase', async () => {
      mockApiClient.get.mockResolvedValue(RAW_FOLDER);

      const result = await folderService.getByKey(FOLDER_KEY);

      expect(result.id).toBe(123);
      expect(result.key).toBe(FOLDER_KEY);
      expect(result.displayName).toBe('Finance');
      expect(result.fullyQualifiedName).toBe('Shared/Finance');
      expect(result.description).toBe('AP invoices');
      expect(result.folderType).toBe('Standard');
      expect(result.isPersonal).toBe(false);
      expect(result.provisionType).toBe('Automatic');
      expect(result.permissionModel).toBe('FineGrained');
      expect(result.parentId).toBe(10);
      expect(result.parentKey).toBe(PARENT_KEY);
      expect(result.feedType).toBe('Processes');
      expect((result as any).DisplayName).toBeUndefined();
      expect((result as any).FullyQualifiedName).toBeUndefined();
      expect((result as any).FolderType).toBeUndefined();
      expect((result as any).ParentId).toBeUndefined();
    });

    it('should call GetByKey with select options and no folder headers', async () => {
      mockApiClient.get.mockResolvedValue(RAW_FOLDER);

      await folderService.getByKey(FOLDER_KEY, { select: 'FullyQualifiedName' });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        FOLDER_ENDPOINTS.GET_BY_KEY(FOLDER_KEY),
        expect.objectContaining({
          params: expect.objectContaining({
            '$select': 'FullyQualifiedName',
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

    it('should throw NotFoundError when the folder is missing', async () => {
      mockApiClient.get.mockRejectedValue(new NotFoundError({ message: 'not found' }));

      await expect(folderService.getByKey(FOLDER_KEY)).rejects.toThrow(NotFoundError);
    });

    it('should propagate API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(folderService.getByKey(FOLDER_KEY)).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
