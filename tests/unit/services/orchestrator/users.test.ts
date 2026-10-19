// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OrchestratorUserService } from '@/services/orchestrator/users/users';
import { ApiClient } from '@/core/http/api-client';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';
import { ORCHESTRATOR_USER_ENDPOINTS } from '@/utils/constants/endpoints';
import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION } from '@/utils/constants/common';
import { RuntimeType } from '@/models/orchestrator/processes.types';
import {
  OrchestratorUserProvisionType,
  OrchestratorUserRoleType,
  OrchestratorUserType,
} from '@/models/orchestrator/users.types';
import type { OrchestratorUserGetAllOptions, OrchestratorUserGetResponse } from '@/models/orchestrator/users.types';
import type { PaginatedResponse } from '@/utils/pagination';
import { createMockError, TEST_CONSTANTS } from '@tests/utils/mocks';
import { ORCHESTRATOR_USER_TEST_CONSTANTS } from '@tests/utils/constants/orchestrator-users';
import { PAGINATION_TEST_CONSTANTS } from '@tests/utils/constants/pagination';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

const mocks = vi.hoisted(() => import('@tests/utils/mocks/core'));

// NOTE: transformData / pascalToCamelCaseKeys are NOT mocked — the transform pipeline runs for real.
vi.mock('@/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('OrchestratorUserService Unit Tests', () => {
  let orchestratorUserService: OrchestratorUserService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });
    vi.mocked(PaginationHelpers.getAll).mockReset();

    orchestratorUserService = new OrchestratorUserService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should list users through PaginationHelpers against the tenant-level endpoint with no folder headers', async () => {
      const mockResponse = { items: [], totalCount: 0 };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await orchestratorUserService.getAll();

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) => fn() === ORCHESTRATOR_USER_ENDPOINTS.GET_ALL),
          transformFn: expect.any(Function),
          pagination: expect.objectContaining({
            paginationType: PaginationType.OFFSET,
            itemsField: ODATA_PAGINATION.ITEMS_FIELD,
            totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
            paginationParams: {
              pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
              offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
              countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM,
            },
          }),
        }),
        undefined,
      );

      // Tenant-level: no headers and no folder-switched endpoint are ever configured.
      const [config] = vi.mocked(PaginationHelpers.getAll).mock.calls[0];
      expect(config).not.toHaveProperty('headers');
      expect(config).not.toHaveProperty('getByFolderEndpoint');

      expect(result).toEqual(mockResponse);
    });

    it('should pass pageSize and cursor pagination options through unchanged', async () => {
      const mockResponse: PaginatedResponse<OrchestratorUserGetResponse> = {
        items: [],
        totalCount: ORCHESTRATOR_USER_TEST_CONSTANTS.TOTAL_COUNT,
        hasNextPage: true,
        nextCursor: { value: TEST_CONSTANTS.NEXT_CURSOR },
        currentPage: 1,
        totalPages: ORCHESTRATOR_USER_TEST_CONSTANTS.TOTAL_PAGES,
        supportsPageJump: true,
      };
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const options: OrchestratorUserGetAllOptions = {
        pageSize: TEST_CONSTANTS.PAGE_SIZE,
        cursor: { value: TEST_CONSTANTS.CURSOR_VALUE },
      };

      const result = await orchestratorUserService.getAll(options) as PaginatedResponse<OrchestratorUserGetResponse>;

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE,
          cursor: { value: TEST_CONSTANTS.CURSOR_VALUE },
        }),
      );
      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toEqual({ value: TEST_CONSTANTS.NEXT_CURSOR });
    });

    it('should pass jumpToPage through unchanged', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await orchestratorUserService.getAll({ jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2, pageSize: TEST_CONSTANTS.PAGE_SIZE });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ jumpToPage: PAGINATION_TEST_CONSTANTS.JUMP_TO_PAGE_2, pageSize: TEST_CONSTANTS.PAGE_SIZE }),
      );
    });

    it('should rewrite renamed SDK field names to API names in filter, orderby and select before delegating', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await orchestratorUserService.getAll({
        filter: ORCHESTRATOR_USER_TEST_CONSTANTS.FILTER_SDK,
        orderby: ORCHESTRATOR_USER_TEST_CONSTANTS.ORDERBY_SDK,
        select: ORCHESTRATOR_USER_TEST_CONSTANTS.SELECT_SDK,
      });

      // createdTime → creationTime, lastModifiedTime → lastModificationTime
      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: ORCHESTRATOR_USER_TEST_CONSTANTS.FILTER_API,
          orderby: ORCHESTRATOR_USER_TEST_CONSTANTS.ORDERBY_API,
          select: ORCHESTRATOR_USER_TEST_CONSTANTS.SELECT_API,
        }),
      );
    });

    it('should forward expand and identifiers that are not renamed untouched', async () => {
      vi.mocked(PaginationHelpers.getAll).mockResolvedValue({ items: [], totalCount: 0 });

      await orchestratorUserService.getAll({
        filter: ORCHESTRATOR_USER_TEST_CONSTANTS.FILTER_BY_TYPE,
        expand: ORCHESTRATOR_USER_TEST_CONSTANTS.EXPAND_USER_ROLES,
      });

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          filter: ORCHESTRATOR_USER_TEST_CONSTANTS.FILTER_BY_TYPE,
          expand: ORCHESTRATOR_USER_TEST_CONSTANTS.EXPAND_USER_ROLES,
        }),
      );
    });

    it('should transform each raw user: camelCase keys, renamed timestamps, dropped wire fields, nested userRoles', async () => {
      const raw = ORCHESTRATOR_USER_TEST_CONSTANTS.RAW_USER;
      const before = JSON.stringify(raw);

      // Run the transformFn the service hands to PaginationHelpers against the raw wire
      // fixture, so the pipeline is exercised through getAll() rather than a direct import.
      vi.mocked(PaginationHelpers.getAll).mockImplementation((config) => {
        const items = config.transformFn ? [config.transformFn(raw)] : [];
        return Promise.resolve({ items, totalCount: items.length });
      });

      const result = await orchestratorUserService.getAll();
      const user = result.items[0];

      // Original fixture untouched (shallow-copy semantics)
      expect(JSON.stringify(raw)).toBe(before);

      // camelCase fields carry the fixture values
      expect(user.id).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.USER_ID);
      expect(user.key).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.USER_KEY);
      expect(user.userName).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.USER_NAME);
      expect(user.emailAddress).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.USER_NAME);
      expect(user.fullName).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.FULL_NAME);
      expect(user.tenantId).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.TENANT_ID);
      expect(user.isActive).toBe(true);
      expect(user.rolesList).toEqual([ORCHESTRATOR_USER_TEST_CONSTANTS.ROLE_NAME]);
      expect(user.loginProviders).toEqual([]);
      expect(user.lastLoginTime).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.LAST_LOGIN_TIME);
      expect(user.type).toBe(OrchestratorUserType.DirectoryUser);
      expect(user.provisionType).toBe(OrchestratorUserProvisionType.Automatic);
      expect(user.licenseType).toBe(RuntimeType.Attended);
      expect(user.mayHaveUnattendedSession).toBe(false);
      expect(user.explicitRestrictToPersonalWorkspace).toBe(false);

      // Semantic renames carry their distinctive values; wire names are gone
      expect(user.createdTime).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.CREATED_TIME);
      expect(user.lastModifiedTime).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.LAST_MODIFIED_TIME);
      expect((user as any).creationTime).toBeUndefined();
      expect((user as any).lastModificationTime).toBeUndefined();

      // PascalCase originals are gone
      expect((user as any).Id).toBeUndefined();
      expect((user as any).Key).toBeUndefined();
      expect((user as any).UserName).toBeUndefined();
      expect((user as any).CreationTime).toBeUndefined();
      expect((user as any).LastModificationTime).toBeUndefined();
      expect((user as any).IsActive).toBeUndefined();
      expect((user as any).RolesList).toBeUndefined();

      // Every dropped wire field is absent in both wire and camelCase spelling
      for (const field of ORCHESTRATOR_USER_TEST_CONSTANTS.DROPPED_WIRE_FIELDS) {
        expect(user).not.toHaveProperty(field);
        expect(user).not.toHaveProperty(field.charAt(0).toLowerCase() + field.slice(1));
      }

      // Nested userRoles are camelCased too
      expect(user.userRoles).toHaveLength(1);
      const role = user.userRoles![0];
      expect(role.id).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.USER_ROLE_ID);
      expect(role.userId).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.USER_ID);
      expect(role.roleId).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.ROLE_ID);
      expect(role.userName).toBeNull();
      expect(role.roleName).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.ROLE_NAME);
      expect(role.roleType).toBe(OrchestratorUserRoleType.Tenant);
      expect((role as any).RoleName).toBeUndefined();
      expect((role as any).RoleType).toBeUndefined();
    });

    it('should keep the nullable account fields null for a group', async () => {
      const raw = ORCHESTRATOR_USER_TEST_CONSTANTS.RAW_GROUP;
      vi.mocked(PaginationHelpers.getAll).mockImplementation((config) => {
        const items = config.transformFn ? [config.transformFn(raw)] : [];
        return Promise.resolve({ items, totalCount: items.length });
      });

      const result = await orchestratorUserService.getAll();
      const group = result.items[0];

      expect(group.id).toBe(ORCHESTRATOR_USER_TEST_CONSTANTS.GROUP_ID);
      expect(group.type).toBe(OrchestratorUserType.DirectoryGroup);
      expect(group.userName).toBeNull();
      expect(group.name).toBeNull();
      expect(group.surname).toBeNull();
      expect(group.fullName).toBeNull();
      expect(group.emailAddress).toBeNull();
      expect(group.authenticationSource).toBeNull();
      expect(group.tenantId).toBeNull();
      expect(group.licenseType).toBeNull();
      const role = group.userRoles![0];
      expect(role.roleName).toBeNull();
      expect(role.roleType).toBeNull();
    });

    it('should propagate API errors', async () => {
      const error = createMockError(ORCHESTRATOR_USER_TEST_CONSTANTS.ERROR_USERS_FORBIDDEN);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(orchestratorUserService.getAll()).rejects.toThrow(ORCHESTRATOR_USER_TEST_CONSTANTS.ERROR_USERS_FORBIDDEN);
    });
  });
});
