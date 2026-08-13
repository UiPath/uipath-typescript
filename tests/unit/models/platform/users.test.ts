// ===== IMPORTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlatformUserWithMethods } from '../../../../src/models/platform/users.models';
import type { PlatformUserServiceModel } from '../../../../src/models/platform/users.models';
import type { RawPlatformUserGetResponse } from '../../../../src/models/platform/users.types';
import { PlatformUserType, PlatformUserCategory } from '../../../../src/models/platform/users.types';
import { createRawPlatformUserUpdateResult, PLATFORM_USER_TEST_CONSTANTS } from '../../../utils/mocks';

// ===== HELPERS =====
const createTransformedUser = (
  overrides?: Partial<RawPlatformUserGetResponse>
): RawPlatformUserGetResponse => ({
  id: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
  userName: PLATFORM_USER_TEST_CONSTANTS.USER_NAME,
  email: PLATFORM_USER_TEST_CONSTANTS.EMAIL,
  emailConfirmed: true,
  name: PLATFORM_USER_TEST_CONSTANTS.FIRST_NAME,
  surname: PLATFORM_USER_TEST_CONSTANTS.SURNAME,
  displayName: PLATFORM_USER_TEST_CONSTANTS.DISPLAY_NAME,
  createdTime: PLATFORM_USER_TEST_CONSTANTS.CREATION_TIME,
  lastModifiedTime: PLATFORM_USER_TEST_CONSTANTS.LAST_MODIFICATION_TIME,
  lastLoginTime: PLATFORM_USER_TEST_CONSTANTS.LAST_LOGIN_TIME,
  groupIds: [PLATFORM_USER_TEST_CONSTANTS.GROUP_ID],
  isActive: true,
  type: PlatformUserType.User,
  category: PlatformUserCategory.Local,
  invitationAccepted: true,
  ...overrides,
});

// ===== TEST SUITE =====
describe('Platform User Model Tests', () => {
  let mockService: PlatformUserServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      updateById: vi.fn().mockResolvedValue({ success: true, errors: [] }),
    };
  });

  describe('createPlatformUserWithMethods', () => {
    it('should merge the raw data with the bound methods', () => {
      const user = createPlatformUserWithMethods(createTransformedUser(), mockService);

      expect(user.id).toBe(PLATFORM_USER_TEST_CONSTANTS.USER_ID);
      expect(user.email).toBe(PLATFORM_USER_TEST_CONSTANTS.EMAIL);
      expect(typeof user.update).toBe('function');
    });
  });

  describe('update', () => {
    it('should delegate to service.updateById with the captured user ID', async () => {
      const user = createPlatformUserWithMethods(createTransformedUser(), mockService);
      const update = { groupIdsToAdd: [PLATFORM_USER_TEST_CONSTANTS.GROUP_ID_ALT] };

      const result = await user.update(update);

      expect(mockService.updateById).toHaveBeenCalledWith(PLATFORM_USER_TEST_CONSTANTS.USER_ID, update);
      expect(result.success).toBe(true);
    });

    it('should surface API-reported failures from the delegated call', async () => {
      const failure = createRawPlatformUserUpdateResult({ succeeded: false });
      vi.mocked(mockService.updateById).mockResolvedValue({ success: failure.succeeded, errors: failure.errors });
      const user = createPlatformUserWithMethods(createTransformedUser(), mockService);

      const result = await user.update({ isActive: false });

      expect(result.success).toBe(false);
    });

    it('should throw when the user ID is missing', async () => {
      const user = createPlatformUserWithMethods(createTransformedUser({ id: '' }), mockService);

      await expect(user.update({ isActive: true })).rejects.toThrow('User ID is undefined');
      expect(mockService.updateById).not.toHaveBeenCalled();
    });
  });
});
