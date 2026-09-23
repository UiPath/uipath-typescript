// ===== IMPORTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlatformGroupWithMethods } from '../../../../src/models/platform/groups.models';
import type { PlatformGroupServiceModel } from '../../../../src/models/platform/groups.models';
import type { RawPlatformGroupGetResponse } from '../../../../src/models/platform/groups.types';
import { PlatformGroupType } from '../../../../src/models/platform/groups.types';
import { PLATFORM_GROUP_TEST_CONSTANTS, PLATFORM_USER_TEST_CONSTANTS } from '../../../utils/mocks';

// ===== HELPERS =====
const createTransformedGroup = (
  overrides?: Partial<RawPlatformGroupGetResponse>
): RawPlatformGroupGetResponse => ({
  id: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID,
  name: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME,
  displayName: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME,
  type: PlatformGroupType.Custom,
  createdTime: PLATFORM_GROUP_TEST_CONSTANTS.CREATION_TIME,
  lastModifiedTime: PLATFORM_GROUP_TEST_CONSTANTS.LAST_MODIFICATION_TIME,
  ...overrides,
});

// ===== TEST SUITE =====
describe('Platform Group Model Tests', () => {
  let mockService: PlatformGroupServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      updateById: vi.fn().mockResolvedValue(createTransformedGroup()),
      deleteById: vi.fn().mockResolvedValue(undefined),
      getMembers: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    };
  });

  describe('createPlatformGroupWithMethods', () => {
    it('should merge the raw data with the bound methods', () => {
      const group = createPlatformGroupWithMethods(createTransformedGroup(), mockService);

      expect(group.id).toBe(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID);
      expect(group.name).toBe(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME);
      expect(typeof group.update).toBe('function');
      expect(typeof group.delete).toBe('function');
      expect(typeof group.getMembers).toBe('function');
    });
  });

  describe('update', () => {
    it('should delegate to service.updateById with the captured group ID', async () => {
      const group = createPlatformGroupWithMethods(createTransformedGroup(), mockService);
      const update = { name: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME_ALT, memberUserIdsToAdd: [PLATFORM_USER_TEST_CONSTANTS.USER_ID] };

      await group.update(update);

      expect(mockService.updateById).toHaveBeenCalledWith(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID, update);
    });

    it('should throw when the group ID is missing', async () => {
      const group = createPlatformGroupWithMethods(createTransformedGroup({ id: '' }), mockService);

      await expect(group.update({ name: 'x' })).rejects.toThrow('Group ID is undefined');
      expect(mockService.updateById).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delegate to service.deleteById with the captured group ID', async () => {
      const group = createPlatformGroupWithMethods(createTransformedGroup(), mockService);

      await group.delete();

      expect(mockService.deleteById).toHaveBeenCalledWith(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID);
    });

    it('should throw when the group ID is missing', async () => {
      const group = createPlatformGroupWithMethods(createTransformedGroup({ id: '' }), mockService);

      await expect(group.delete()).rejects.toThrow('Group ID is undefined');
      expect(mockService.deleteById).not.toHaveBeenCalled();
    });

  });

  describe('getMembers', () => {
    it('should delegate to service.getMembers with the captured group ID and options', async () => {
      const group = createPlatformGroupWithMethods(createTransformedGroup(), mockService);
      const options = { pageSize: 10 };

      await group.getMembers(options);

      expect(mockService.getMembers).toHaveBeenCalledWith(
        PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID,
        options
      );
    });

    it('should throw when the group ID is missing', async () => {
      const group = createPlatformGroupWithMethods(createTransformedGroup({ id: '' }), mockService);

      await expect(group.getMembers()).rejects.toThrow('Group ID is undefined');
      expect(mockService.getMembers).not.toHaveBeenCalled();
    });

  });
});
