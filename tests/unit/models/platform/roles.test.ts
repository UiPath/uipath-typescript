// ===== IMPORTS =====
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPlatformRoleWithMethods } from '../../../../src/models/platform/roles.models';
import type { PlatformRoleServiceModel } from '../../../../src/models/platform/roles.models';
import type { RawPlatformRoleGetResponse } from '../../../../src/models/platform/roles.types';
import { PlatformRoleType, PlatformRoleScopeType } from '../../../../src/models/platform/roles.types';
import { PLATFORM_ROLE_TEST_CONSTANTS } from '../../../utils/mocks';

// ===== HELPERS =====
const createTransformedRole = (
  overrides?: Partial<RawPlatformRoleGetResponse>
): RawPlatformRoleGetResponse => ({
  id: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID,
  name: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME,
  description: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_DESCRIPTION,
  type: PlatformRoleType.Custom,
  scopeType: PlatformRoleScopeType.Organization,
  createdBy: PLATFORM_ROLE_TEST_CONSTANTS.CREATED_BY,
  createdTime: PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON,
  tenantId: PLATFORM_ROLE_TEST_CONSTANTS.EMPTY_GUID,
  ownerServiceId: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_ID,
  ownerServiceName: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME,
  actionDetails: [],
  ...overrides,
});

// ===== TEST SUITE =====
describe('Platform Role Model Tests', () => {
  let mockService: PlatformRoleServiceModel;

  beforeEach(() => {
    mockService = {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      updateById: vi.fn().mockResolvedValue(createTransformedRole()),
      deleteById: vi.fn().mockResolvedValue(undefined),
      getAssignments: vi.fn(),
      updateAssignments: vi.fn(),
      exportAssignments: vi.fn(),
      getEffectiveAccess: vi.fn(),
      getActions: vi.fn(),
    };
  });

  describe('createPlatformRoleWithMethods', () => {
    it('should merge the raw data with the bound methods', () => {
      const role = createPlatformRoleWithMethods(createTransformedRole(), mockService);

      expect(role.id).toBe(PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID);
      expect(role.name).toBe(PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME);
      expect(typeof role.update).toBe('function');
      expect(typeof role.delete).toBe('function');
    });
  });

  describe('update', () => {
    it('should delegate to service.updateById with the captured role ID', async () => {
      const role = createPlatformRoleWithMethods(createTransformedRole(), mockService);
      const update = { description: 'Updated' };

      await role.update(update);

      expect(mockService.updateById).toHaveBeenCalledWith(PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID, update);
    });

    it('should throw when the role ID is missing', async () => {
      const role = createPlatformRoleWithMethods(createTransformedRole({ id: '' }), mockService);

      await expect(role.update({ description: 'x' })).rejects.toThrow('Role ID is undefined');
      expect(mockService.updateById).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delegate to service.deleteById with the captured role ID', async () => {
      const role = createPlatformRoleWithMethods(createTransformedRole(), mockService);

      await role.delete();

      expect(mockService.deleteById).toHaveBeenCalledWith(PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID);
    });

    it('should throw when the role ID is missing', async () => {
      const role = createPlatformRoleWithMethods(createTransformedRole({ id: '' }), mockService);

      await expect(role.delete()).rejects.toThrow('Role ID is undefined');
      expect(mockService.deleteById).not.toHaveBeenCalled();
    });
  });
});
