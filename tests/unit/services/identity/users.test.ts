// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../../../../src/services/identity/users';
import { ApiClient } from '../../../../src/core/http/api-client';
import {
  createBasicRawUserEntry,
  USER_TEST_CONSTANTS,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { IDENTITY_USER_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { UserCategory, UserType } from '../../../../src/models/identity';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('UserService Unit Tests', () => {
  let userService: UserService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    userService = new UserService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get a user by ID', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawUserEntry());

      const result = await userService.getById(USER_TEST_CONSTANTS.USER_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        IDENTITY_USER_ENDPOINTS.BY_ID(USER_TEST_CONSTANTS.USER_ID),
        expect.anything()
      );
      expect(result.id).toBe(USER_TEST_CONSTANTS.USER_ID);
      expect(result.userName).toBe(USER_TEST_CONSTANTS.USER_NAME);
      expect(result.email).toBe(USER_TEST_CONSTANTS.EMAIL);
      expect(result.isActive).toBe(true);
    });

    it('should apply field renames, enum mappings and drop internal fields', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawUserEntry());

      const result = await userService.getById(USER_TEST_CONSTANTS.USER_ID);

      // Renamed fields carry the original values
      expect(result.createdTime).toBe(USER_TEST_CONSTANTS.CREATION_TIME);
      expect(result.lastModifiedTime).toBe(USER_TEST_CONSTANTS.LAST_MODIFICATION_TIME);
      expect(result.groupIds).toEqual([USER_TEST_CONSTANTS.GROUP_ID]);

      // Numeric codes are mapped to enums
      expect(result.type).toBe(UserType.User);
      expect(result.category).toBe(UserCategory.Local);

      // Original API fields are absent
      expect((result as any).creationTime).toBeUndefined();
      expect((result as any).lastModificationTime).toBeUndefined();
      expect((result as any).groupIDs).toBeUndefined();

      // Internal fields are dropped
      expect((result as any).legacyId).toBeUndefined();
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(userService.getById(USER_TEST_CONSTANTS.USER_ID)).rejects.toThrow(
        USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND
      );
    });
  });
});
