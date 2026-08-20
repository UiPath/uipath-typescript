// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Imported through the subpath barrel, the way consumers reach it — this also catches a
// barrel that stops re-exporting the class or the enums as runtime values.
import { Users, PlatformUserType, PlatformUserCategory, PlatformUserSortField, PlatformUserSortOrder } from '../../../../src/services/platform';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicRawPlatformUser,
  createRawPlatformUserListResponse,
  createRawPlatformUserUpdateResult,
  createMockError,
  PLATFORM_TEST_CONSTANTS,
  PLATFORM_USER_TEST_CONSTANTS,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { IDENTITY_USER_ENDPOINTS } from '../../../../src/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('Platform Users Service Unit Tests', () => {
  let usersService: Users;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  const organizationId = PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID;
  const userId = PLATFORM_USER_TEST_CONSTANTS.USER_ID;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    usersService = new Users(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('barrel exports', () => {
    it('should expose the service class and enums as runtime values through the subpath barrel', () => {
      // A barrel using `export type *` would drop these and break every documented example
      expect(typeof Users).toBe('function');
      expect(PlatformUserType.User).toBe('user');
      expect(PlatformUserCategory.Local).toBe('local');
      expect(PlatformUserSortField.Email).toBe('Email');
      expect(PlatformUserSortOrder.Descending).toBe('desc');
    });
  });

  describe('getAll', () => {
    it('should retrieve users from the organization user listing endpoint', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformUserListResponse());

      const result = await usersService.getAll(organizationId);

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(mockApiClient.get.mock.calls[0][0]).toBe(IDENTITY_USER_ENDPOINTS.GET_ALL(organizationId));
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(userId);
    });

    it('should apply the full transform pipeline to each listed user', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformUserListResponse());

      const result = await usersService.getAll(organizationId);
      const user = result.items[0];

      // Semantic renames carry their values (distinctive timestamps, not null defaults)
      expect(user.createdTime).toBe(PLATFORM_USER_TEST_CONSTANTS.CREATION_TIME);
      expect(user.lastModifiedTime).toBe(PLATFORM_USER_TEST_CONSTANTS.LAST_MODIFICATION_TIME);
      expect(user.groupIds).toEqual([
        PLATFORM_USER_TEST_CONSTANTS.GROUP_ID,
        PLATFORM_USER_TEST_CONSTANTS.GROUP_ID_ALT,
      ]);
      // Original wire fields are gone
      expect((user as any).creationTime).toBeUndefined();
      expect((user as any).lastModificationTime).toBeUndefined();
      expect((user as any).groupIDs).toBeUndefined();
      // Internal fields are dropped
      expect((user as any).legacyId).toBeUndefined();
      expect((user as any).bypassBasicAuthRestriction).toBeUndefined();
      // Numeric codes are mapped to enums
      expect(user.type).toBe(PlatformUserType.User);
      expect(user.category).toBe(PlatformUserCategory.Local);
    });

    it('should map every documented numeric type and category code to its enum', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformUserListResponse([
        createBasicRawPlatformUser({ type: 4, category: 2 }),
      ]));

      const result = await usersService.getAll(organizationId);

      expect(result.items[0].type).toBe(PlatformUserType.RobotAccount);
      expect(result.items[0].category).toBe(PlatformUserCategory.Directory);
    });

    it('should attach the update method to each listed user', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformUserListResponse());

      const result = await usersService.getAll(organizationId);

      expect(typeof result.items[0].update).toBe('function');
    });

    it('should send search and sort options without an OData prefix', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformUserListResponse());

      await usersService.getAll(organizationId, {
        searchTerm: PLATFORM_USER_TEST_CONSTANTS.SEARCH_TERM,
        sortBy: PlatformUserSortField.Email,
        sortOrder: PlatformUserSortOrder.Descending,
      });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.searchTerm).toBe(PLATFORM_USER_TEST_CONSTANTS.SEARCH_TERM);
      expect(spec.params.sortBy).toBe('Email');
      expect(spec.params.sortOrder).toBe('desc');
      expect(spec.params).not.toHaveProperty('$searchTerm');
      expect(spec.params).not.toHaveProperty('$sortBy');
      expect(spec.params).not.toHaveProperty('$sortOrder');
    });

    it('should fetch every page when no pagination options are given', async () => {
      const fullPageUsers = Array.from({ length: 1000 }, (_, i) =>
        createBasicRawPlatformUser({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${i}` })
      );
      mockApiClient.get
        .mockResolvedValueOnce(createRawPlatformUserListResponse(fullPageUsers, 1002))
        .mockResolvedValueOnce(createRawPlatformUserListResponse([
          createBasicRawPlatformUser({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-1000` }),
          createBasicRawPlatformUser({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-1001` }),
        ], 1002));

      const result = await usersService.getAll(organizationId);

      expect(result.items).toHaveLength(1002);
      expect(result.totalCount).toBe(1002);
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      const firstCall = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      const secondCall = mockApiClient.get.mock.calls[1][1] as { params: Record<string, unknown> };
      expect(firstCall.params.top).toBe(1000);
      expect(firstCall.params.skip).toBe(0);
      // Offsets are page-aligned: advance by the requested page size, not the returned count
      expect(secondCall.params.skip).toBe(1000);
      // A stable default sort keeps record offsets consistent across pages
      expect(firstCall.params.sortBy).toBe('Id');
    });

    it('should stop after a short page and not refetch', async () => {
      const shortPage = Array.from({ length: 3 }, (_, i) =>
        createBasicRawPlatformUser({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${i}` })
      );
      // totalCount overcounts (e.g. stale index) — a short page must still be terminal
      mockApiClient.get.mockResolvedValueOnce(createRawPlatformUserListResponse(shortPage, 5));

      const result = await usersService.getAll(organizationId);

      expect(result.items).toHaveLength(3);
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should dedupe users that appear on two pages', async () => {
      const straddler = `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-999`;
      const fullPageUsers = Array.from({ length: 1000 }, (_, i) =>
        createBasicRawPlatformUser({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${i}` })
      );
      mockApiClient.get
        .mockResolvedValueOnce(createRawPlatformUserListResponse(fullPageUsers, 1001))
        // The last user of page 1 straddles the boundary and appears again on page 2
        .mockResolvedValueOnce(createRawPlatformUserListResponse([
          createBasicRawPlatformUser({ id: straddler }),
          createBasicRawPlatformUser({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-1000` }),
        ], 1001));

      const result = await usersService.getAll(organizationId);

      expect(result.items).toHaveLength(1001);
      expect(result.items.filter(u => u.id === straddler)).toHaveLength(1);
    });

    it('should send search and sort options without an OData prefix on the paginated path too', async () => {
      mockApiClient.get.mockResolvedValue(
        createRawPlatformUserListResponse([createBasicRawPlatformUser()], PLATFORM_USER_TEST_CONSTANTS.TOTAL_COUNT)
      );

      await usersService.getAll(organizationId, {
        searchTerm: PLATFORM_USER_TEST_CONSTANTS.SEARCH_TERM,
        sortBy: PlatformUserSortField.Email,
        sortOrder: PlatformUserSortOrder.Descending,
        pageSize: 5,
      });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.searchTerm).toBe(PLATFORM_USER_TEST_CONSTANTS.SEARCH_TERM);
      expect(spec.params.sortBy).toBe('Email');
      expect(spec.params.sortOrder).toBe('desc');
      expect(spec.params).not.toHaveProperty('$searchTerm');
      expect(spec.params).not.toHaveProperty('$sortBy');
      expect(spec.params).not.toHaveProperty('$sortOrder');
      expect(spec.params.top).toBe(5);
    });

    it('should return a paginated response with totalCount when pagination options are used', async () => {
      mockApiClient.get.mockResolvedValue(
        createRawPlatformUserListResponse([createBasicRawPlatformUser()], PLATFORM_USER_TEST_CONSTANTS.TOTAL_COUNT)
      );

      const page = await usersService.getAll(organizationId, { pageSize: 1 });

      expect(page.items).toHaveLength(1);
      expect(page.totalCount).toBe(PLATFORM_USER_TEST_CONSTANTS.TOTAL_COUNT);
      expect(page.hasNextPage).toBe(true);

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.top).toBe(1);
      // First page: no offset is sent
      expect(spec.params.skip ?? 0).toBe(0);
      // Non-OData endpoint: no $count param may be injected
      expect(spec.params).not.toHaveProperty('$count');
      expect(spec.params).not.toHaveProperty('count');
    });

    it('should throw ValidationError when organizationId is empty', async () => {
      await expect(usersService.getAll('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_USER_TEST_CONSTANTS.ERROR_USERS_FORBIDDEN));

      await expect(usersService.getAll(organizationId)).rejects.toThrow(
        PLATFORM_USER_TEST_CONSTANTS.ERROR_USERS_FORBIDDEN
      );
    });
  });

  describe('getById', () => {
    it('should retrieve a user by ID with the transform pipeline applied', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformUser());

      const user = await usersService.getById(userId);

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_USER_ENDPOINTS.GET_BY_ID(userId), {});
      expect(user.id).toBe(userId);
      expect(user.email).toBe(PLATFORM_USER_TEST_CONSTANTS.EMAIL);
      expect(user.createdTime).toBe(PLATFORM_USER_TEST_CONSTANTS.CREATION_TIME);
      expect((user as any).creationTime).toBeUndefined();
      expect(user.type).toBe(PlatformUserType.User);
    });

    it('should attach the update method to the returned user', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformUser());

      const user = await usersService.getById(userId);

      expect(typeof user.update).toBe('function');
    });

    it('should throw ValidationError when userId is empty', async () => {
      await expect(usersService.getById('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(usersService.getById(userId)).rejects.toThrow(
        PLATFORM_USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND
      );
    });
  });

  describe('updateById', () => {
    it('should PUT the update to the user URL and rename succeeded to success', async () => {
      mockApiClient.put.mockResolvedValue(createRawPlatformUserUpdateResult());

      const result = await usersService.updateById(userId, { displayName: PLATFORM_USER_TEST_CONSTANTS.DISPLAY_NAME });

      expect(mockApiClient.put).toHaveBeenCalledTimes(1);
      const [endpoint, body] = mockApiClient.put.mock.calls[0];
      expect(endpoint).toBe(IDENTITY_USER_ENDPOINTS.GET_BY_ID(userId));
      expect(body.displayName).toBe(PLATFORM_USER_TEST_CONSTANTS.DISPLAY_NAME);
      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result).not.toHaveProperty('succeeded');
    });

    it('should send group changes under the wire groupIDs casing', async () => {
      mockApiClient.put.mockResolvedValue(createRawPlatformUserUpdateResult());

      await usersService.updateById(userId, {
        groupIdsToAdd: [PLATFORM_USER_TEST_CONSTANTS.GROUP_ID],
        groupIdsToRemove: [PLATFORM_USER_TEST_CONSTANTS.GROUP_ID_ALT],
      });

      const [, body] = mockApiClient.put.mock.calls[0];
      expect(body.groupIDsToAdd).toEqual([PLATFORM_USER_TEST_CONSTANTS.GROUP_ID]);
      expect(body.groupIDsToRemove).toEqual([PLATFORM_USER_TEST_CONSTANTS.GROUP_ID_ALT]);
      expect(body).not.toHaveProperty('groupIdsToAdd');
      expect(body).not.toHaveProperty('groupIdsToRemove');
    });

    it('should surface API-reported failures as success false with errors', async () => {
      mockApiClient.put.mockResolvedValue(createRawPlatformUserUpdateResult({
        succeeded: false,
        errors: [{ code: 'DuplicateEmail', description: 'Email is already taken.' }],
      }));

      const result = await usersService.updateById(userId, { email: PLATFORM_USER_TEST_CONSTANTS.EMAIL });

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([{ code: 'DuplicateEmail', description: 'Email is already taken.' }]);
    });

    it('should throw ValidationError when userId is empty', async () => {
      await expect(usersService.updateById('', { displayName: 'x' })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when the update has no fields', async () => {
      await expect(usersService.updateById(userId, {})).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(PLATFORM_USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND));

      await expect(usersService.updateById(userId, { isActive: true })).rejects.toThrow(
        PLATFORM_USER_TEST_CONSTANTS.ERROR_USER_NOT_FOUND
      );
    });
  });
});
