import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createUserWithMethods,
  UserServiceModel,
} from '../../../../src/models/identity/users.models';
import { createBasicUser, USER_TEST_CONSTANTS } from '../../../utils/mocks';
import type { UserUpdateOptions } from '../../../../src/models/identity/users.types';

// ===== TEST SUITE =====
describe('User Models', () => {
  let mockService: UserServiceModel;

  beforeEach(() => {
    mockService = {
      getById: vi.fn(),
      updateById: vi.fn(),
      deleteById: vi.fn(),
      create: vi.fn(),
      invite: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserWithMethods', () => {
    it('should merge user data with bound methods', () => {
      const user = createUserWithMethods(createBasicUser(), mockService);

      expect(user.id).toBe(USER_TEST_CONSTANTS.USER_ID);
      expect(user.userName).toBe(USER_TEST_CONSTANTS.USER_NAME);
      expect(typeof user.update).toBe('function');
      expect(typeof user.delete).toBe('function');
    });
  });

  describe('user.update()', () => {
    it('should call service.updateById with the bound user ID', async () => {
      const user = createUserWithMethods(createBasicUser(), mockService);
      const options: UserUpdateOptions = { displayName: USER_TEST_CONSTANTS.DISPLAY_NAME };
      vi.mocked(mockService.updateById).mockResolvedValue({ succeeded: true, errors: [] });

      const result = await user.update(options);

      expect(mockService.updateById).toHaveBeenCalledWith(USER_TEST_CONSTANTS.USER_ID, options);
      expect(result).toEqual({ succeeded: true, errors: [] });
    });

    it('should throw when the user ID is undefined', async () => {
      const user = createUserWithMethods(createBasicUser({ id: undefined as any }), mockService);

      await expect(user.update({ isActive: false })).rejects.toThrow('User ID is undefined');
      expect(mockService.updateById).not.toHaveBeenCalled();
    });
  });

  describe('user.delete()', () => {
    it('should call service.deleteById with the bound user ID', async () => {
      const user = createUserWithMethods(createBasicUser(), mockService);
      vi.mocked(mockService.deleteById).mockResolvedValue(undefined);

      await expect(user.delete()).resolves.toBeUndefined();

      expect(mockService.deleteById).toHaveBeenCalledWith(USER_TEST_CONSTANTS.USER_ID);
    });

    it('should throw when the user ID is undefined', async () => {
      const user = createUserWithMethods(createBasicUser({ id: undefined as any }), mockService);

      await expect(user.delete()).rejects.toThrow('User ID is undefined');
      expect(mockService.deleteById).not.toHaveBeenCalled();
    });
  });
});
