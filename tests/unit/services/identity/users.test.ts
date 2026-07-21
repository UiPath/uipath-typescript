// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '../../../../src/services/identity/users';
import { ApiClient } from '../../../../src/core/http/api-client';
import {
  createBasicRawUserEntry,
  createBasicRawUserInviteResult,
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

    it('should attach bound methods to the returned user', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawUserEntry());

      const result = await userService.getById(USER_TEST_CONSTANTS.USER_ID);

      expect(typeof result.update).toBe('function');
      expect(typeof result.delete).toBe('function');
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(userService.getById(USER_TEST_CONSTANTS.USER_ID)).rejects.toThrow(
        USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND
      );
    });
  });

  describe('updateById', () => {
    it('should PUT the update payload with group id fields renamed to API names', async () => {
      mockApiClient.put.mockResolvedValue({ succeeded: true, errors: [] });

      const result = await userService.updateById(USER_TEST_CONSTANTS.USER_ID, {
        displayName: USER_TEST_CONSTANTS.DISPLAY_NAME,
        groupIdsToAdd: [USER_TEST_CONSTANTS.GROUP_ID],
        groupIdsToRemove: [USER_TEST_CONSTANTS.GROUP_ID_2],
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        IDENTITY_USER_ENDPOINTS.BY_ID(USER_TEST_CONSTANTS.USER_ID),
        {
          displayName: USER_TEST_CONSTANTS.DISPLAY_NAME,
          groupIDsToAdd: [USER_TEST_CONSTANTS.GROUP_ID],
          groupIDsToRemove: [USER_TEST_CONSTANTS.GROUP_ID_2],
        },
        expect.anything()
      );
      expect(result).toEqual({ succeeded: true, errors: [] });
    });

    it('should propagate errors', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(
        userService.updateById(USER_TEST_CONSTANTS.USER_ID, { isActive: false })
      ).rejects.toThrow(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND);
    });
  });

  describe('deleteById', () => {
    it('should DELETE the user', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await expect(userService.deleteById(USER_TEST_CONSTANTS.USER_ID)).resolves.toBeUndefined();

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        IDENTITY_USER_ENDPOINTS.BY_ID(USER_TEST_CONSTANTS.USER_ID),
        expect.anything()
      );
    });

    it('should propagate errors', async () => {
      mockApiClient.delete.mockRejectedValue(createMockError(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(userService.deleteById(USER_TEST_CONSTANTS.USER_ID)).rejects.toThrow(
        USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND
      );
    });
  });

  describe('create', () => {
    it('should POST users with the organization id as partitionGlobalId and groupIds renamed', async () => {
      mockApiClient.post.mockResolvedValue({
        result: { succeeded: true, errors: [] },
        users: [createBasicRawUserEntry()],
      });

      const result = await userService.create(
        [{ userName: USER_TEST_CONSTANTS.USER_NAME, email: USER_TEST_CONSTANTS.EMAIL }],
        USER_TEST_CONSTANTS.ORGANIZATION_ID,
        { groupIds: [USER_TEST_CONSTANTS.GROUP_ID] }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        IDENTITY_USER_ENDPOINTS.BULK_CREATE,
        {
          users: [{ userName: USER_TEST_CONSTANTS.USER_NAME, email: USER_TEST_CONSTANTS.EMAIL }],
          partitionGlobalId: USER_TEST_CONSTANTS.ORGANIZATION_ID,
          groupIDs: [USER_TEST_CONSTANTS.GROUP_ID],
        },
        expect.anything()
      );
      expect(result.result.succeeded).toBe(true);
      expect(result.users.length).toBe(1);
    });

    it('should transform created users and attach bound methods', async () => {
      mockApiClient.post.mockResolvedValue({
        result: { succeeded: true, errors: [] },
        users: [createBasicRawUserEntry()],
      });

      const result = await userService.create(
        [{ userName: USER_TEST_CONSTANTS.USER_NAME }],
        USER_TEST_CONSTANTS.ORGANIZATION_ID
      );

      const user = result.users[0];
      expect(user.createdTime).toBe(USER_TEST_CONSTANTS.CREATION_TIME);
      expect(user.groupIds).toEqual([USER_TEST_CONSTANTS.GROUP_ID]);
      expect(user.type).toBe(UserType.User);
      expect((user as any).creationTime).toBeUndefined();
      expect((user as any).groupIDs).toBeUndefined();
      expect((user as any).legacyId).toBeUndefined();
      expect(typeof user.update).toBe('function');
      expect(typeof user.delete).toBe('function');
    });

    it('should omit groupIDs from the payload when no options are provided', async () => {
      mockApiClient.post.mockResolvedValue({
        result: { succeeded: true, errors: [] },
        users: [createBasicRawUserEntry()],
      });

      await userService.create(
        [{ userName: USER_TEST_CONSTANTS.USER_NAME }],
        USER_TEST_CONSTANTS.ORGANIZATION_ID
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        IDENTITY_USER_ENDPOINTS.BULK_CREATE,
        {
          users: [{ userName: USER_TEST_CONSTANTS.USER_NAME }],
          partitionGlobalId: USER_TEST_CONSTANTS.ORGANIZATION_ID,
          groupIDs: undefined,
        },
        expect.anything()
      );
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(
        userService.create(
          [{ userName: USER_TEST_CONSTANTS.USER_NAME }],
          USER_TEST_CONSTANTS.ORGANIZATION_ID
        )
      ).rejects.toThrow(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND);
    });
  });

  describe('invite', () => {
    it('should POST invited users with groupIds renamed to API names', async () => {
      mockApiClient.post.mockResolvedValue({
        result: { succeeded: true, errors: [] },
        users: [createBasicRawUserInviteResult()],
      });

      const result = await userService.invite([
        {
          email: USER_TEST_CONSTANTS.EMAIL,
          redirectUrl: USER_TEST_CONSTANTS.REDIRECT_URL,
          groupIds: [USER_TEST_CONSTANTS.GROUP_ID],
        },
      ]);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        IDENTITY_USER_ENDPOINTS.INVITE,
        [
          {
            email: USER_TEST_CONSTANTS.EMAIL,
            redirectUrl: USER_TEST_CONSTANTS.REDIRECT_URL,
            groupIDs: [USER_TEST_CONSTANTS.GROUP_ID],
          },
        ],
        expect.anything()
      );
      expect(result.result.succeeded).toBe(true);
      expect(result.users[0].success).toBe(true);
      expect(result.users[0].id).toBe(USER_TEST_CONSTANTS.USER_ID);
    });

    it('should rename errorMsg to errorMessage on per-user results', async () => {
      mockApiClient.post.mockResolvedValue({
        result: { succeeded: true, errors: [] },
        users: [
          createBasicRawUserInviteResult({
            id: USER_TEST_CONSTANTS.EMPTY_GUID,
            errorMsg: USER_TEST_CONSTANTS.INVITE_ERROR_MESSAGE,
            success: false,
          }),
        ],
      });

      const result = await userService.invite([
        { email: USER_TEST_CONSTANTS.EMAIL, redirectUrl: USER_TEST_CONSTANTS.REDIRECT_URL },
      ]);

      // Per-user failure surfaces via the renamed field
      expect(result.users[0].success).toBe(false);
      expect(result.users[0].errorMessage).toBe(USER_TEST_CONSTANTS.INVITE_ERROR_MESSAGE);
      expect((result.users[0] as any).errorMsg).toBeUndefined();
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(
        userService.invite([
          { email: USER_TEST_CONSTANTS.EMAIL, redirectUrl: USER_TEST_CONSTANTS.REDIRECT_URL },
        ])
      ).rejects.toThrow(USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND);
    });
  });
});
