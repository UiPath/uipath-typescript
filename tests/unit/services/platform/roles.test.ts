// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Imported through the subpath barrel, the way consumers reach it — this also catches a
// barrel that stops re-exporting the class or the enums as runtime values.
import {
  Roles,
  PlatformRoleType,
  PlatformPrincipalType,
  PlatformRoleScopeType,
  PlatformRoleSortField,
} from '../../../../src/services/platform/roles';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicRawPlatformRole,
  createBasicRawPlatformRoleAction,
  createRawPlatformRoleListResponse,
  createBasicRawPlatformPrincipalRoleAssignments,
  createRawPlatformRoleAssignmentListResponse,
  createRawPlatformEffectiveAccessResponse,
  createMockError,
  PLATFORM_TEST_CONSTANTS,
  PLATFORM_USER_TEST_CONSTANTS,
  PLATFORM_ROLE_TEST_CONSTANTS,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient, getPrivateSDK } from '../../../utils/setup';
import { AUTHORIZATION_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import {
  AUTHORIZATION_ROLES_MAX_PAGE_SIZE,
  AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE,
} from '../../../../src/utils/constants/common';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('Platform Roles Service Unit Tests', () => {
  let rolesService: Roles;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  const roleId = PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies({ organizationId: PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID });
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    rolesService = new Roles(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('barrel exports', () => {
    it('should expose the service class and enums as runtime values through the subpath barrel', () => {
      // A barrel using `export type *` would drop these and break every documented example
      expect(typeof Roles).toBe('function');
      expect(PlatformRoleType.BuiltIn).toBe('BUILTIN');
      expect(PlatformPrincipalType.Group).toBe('Group');
    });
  });

  describe('getAll', () => {
    it('should fetch every page when no pagination options are given', async () => {
      const fullPage = Array.from({ length: AUTHORIZATION_ROLES_MAX_PAGE_SIZE }, (_, i) =>
        createBasicRawPlatformRole({ id: `${roleId}-${i}` })
      );
      mockApiClient.get
        .mockResolvedValueOnce(createRawPlatformRoleListResponse(fullPage, AUTHORIZATION_ROLES_MAX_PAGE_SIZE + 1))
        .mockResolvedValueOnce(createRawPlatformRoleListResponse([createBasicRawPlatformRole()], AUTHORIZATION_ROLES_MAX_PAGE_SIZE + 1));

      const result = await rolesService.getAll();

      expect(result.items).toHaveLength(AUTHORIZATION_ROLES_MAX_PAGE_SIZE + 1);
      expect(result.totalCount).toBe(AUTHORIZATION_ROLES_MAX_PAGE_SIZE + 1);
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      const secondCall = mockApiClient.get.mock.calls[1][1] as { params: Record<string, unknown> };
      expect(secondCall.params.skip).toBe(AUTHORIZATION_ROLES_MAX_PAGE_SIZE);
    });

    it('should stop after a short page and not refetch', async () => {
      const shortPage = Array.from({ length: 3 }, (_, i) => createBasicRawPlatformRole({ id: `${roleId}-${i}` }));
      // totalCount overcounts (e.g. stale index) — a short page must still be terminal
      mockApiClient.get.mockResolvedValueOnce(createRawPlatformRoleListResponse(shortPage, 5));

      const result = await rolesService.getAll();

      expect(result.items).toHaveLength(3);
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should dedupe roles that appear on two pages', async () => {
      const straddler = `${roleId}-${AUTHORIZATION_ROLES_MAX_PAGE_SIZE - 1}`;
      const fullPage = Array.from({ length: AUTHORIZATION_ROLES_MAX_PAGE_SIZE }, (_, i) =>
        createBasicRawPlatformRole({ id: `${roleId}-${i}` })
      );
      // The last record of page one is served again at the top of page two
      mockApiClient.get
        .mockResolvedValueOnce(createRawPlatformRoleListResponse(fullPage, AUTHORIZATION_ROLES_MAX_PAGE_SIZE + 1))
        .mockResolvedValueOnce(createRawPlatformRoleListResponse(
          [createBasicRawPlatformRole({ id: straddler }), createBasicRawPlatformRole({ id: `${roleId}-new` })],
          AUTHORIZATION_ROLES_MAX_PAGE_SIZE + 1
        ));

      const result = await rolesService.getAll();

      expect(result.items).toHaveLength(AUTHORIZATION_ROLES_MAX_PAGE_SIZE + 1);
      expect(result.items.filter((r) => r.id === straddler)).toHaveLength(1);
    });

    it('should apply the full transform pipeline to each role', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformRoleListResponse());

      const result = await rolesService.getAll();
      const role = result.items[0];

      // Semantic rename carries its value (distinctive timestamp, not a null default)
      expect(role.createdTime).toBe(PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON);
      expect((role as any).createdOn).toBeUndefined();
      // Wire type string is already the enum value
      expect(role.type).toBe(PlatformRoleType.BuiltIn);
      // Internal action field is dropped
      expect(role.actionDetails).toHaveLength(1);
      expect(role.actionDetails[0].name).toBe(PLATFORM_ROLE_TEST_CONSTANTS.ACTION_NAME);
      expect((role.actionDetails[0] as any).originalResourceAction).toBeUndefined();
      // Bound method attached
      expect(typeof role.delete).toBe('function');
    });

    it('should pass filters through on the fetch-all path too', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformRoleListResponse());

      await rolesService.getAll({ contains: 'Ticket', roleType: PlatformRoleType.Custom });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.contains).toBe('Ticket');
      expect(spec.params.roleType).toBe('CUSTOM');
      expect(spec.params.top).toBe(AUTHORIZATION_ROLES_MAX_PAGE_SIZE);
      // Fetch-all defaults to a stable sort so offsets stay consistent across pages
      expect(spec.params.sortBy).toBe(PlatformRoleSortField.Id);
    });

    it('should send filters without an OData prefix on the paginated path', async () => {
      mockApiClient.get.mockResolvedValue(
        createRawPlatformRoleListResponse([createBasicRawPlatformRole()], PLATFORM_ROLE_TEST_CONSTANTS.ROLES_TOTAL_COUNT)
      );

      const result = await rolesService.getAll({
        roleType: PlatformRoleType.Custom,
        contains: 'Ticket',
        pageSize: 5,
      });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.roleType).toBe('CUSTOM');
      expect(spec.params.contains).toBe('Ticket');
      expect(spec.params.top).toBe(5);
      expect(spec.params).not.toHaveProperty('$roleType');
      expect(spec.params).not.toHaveProperty('$count');
      // The paginated path has its own transform closure — verify it too
      const role = result.items[0];
      expect(role.createdTime).toBe(PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON);
      expect((role as any).createdOn).toBeUndefined();
      expect(role.type).toBe(PlatformRoleType.BuiltIn);
      expect((role.actionDetails[0] as any).originalResourceAction).toBeUndefined();
      expect(typeof role.delete).toBe('function');
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN));

      await expect(rolesService.getAll()).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN);
    });
  });

  describe('getById', () => {
    it('should retrieve a role by ID with the transform pipeline applied', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformRole());

      const role = await rolesService.getById(roleId);

      expect(mockApiClient.get).toHaveBeenCalledWith(AUTHORIZATION_ENDPOINTS.ROLE.GET_BY_ID(roleId), {});
      expect(role.id).toBe(roleId);
      expect(role.createdTime).toBe(PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON);
      expect((role as any).createdOn).toBeUndefined();
      expect(typeof role.delete).toBe('function');
    });

    it('should throw ValidationError when roleId is empty', async () => {
      await expect(rolesService.getById('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLE_NOT_FOUND));

      await expect(rolesService.getById(roleId)).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLE_NOT_FOUND);
    });
  });

  describe('create', () => {
    const request = {
      name: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME,
      scopeType: PlatformRoleScopeType.Organization,
      description: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_DESCRIPTION,
      actionsGrantedByRole: [PLATFORM_ROLE_TEST_CONSTANTS.ACTION_NAME],
    };

    it('should share one organization id resolver between services built on the same instance', async () => {
      const { instance } = createServiceTestDependencies({ organizationId: PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID });
      mockApiClient.put.mockResolvedValue({ createdRoleId: roleId });
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformRole({ type: 'CUSTOM' }));

      await new Roles(instance).create(request);
      const resolver = getPrivateSDK(instance).organizationIdResolver;
      await new Roles(instance).create(request);

      expect(resolver).toBeDefined();
      expect(getPrivateSDK(instance).organizationIdResolver).toBe(resolver);
      expect(mockApiClient.put.mock.calls[1][1].organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
    });

    it('should PUT the role under wire names, then fetch the stored role by the returned ID', async () => {
      mockApiClient.put.mockResolvedValue({ createdRoleId: roleId });
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformRole({ type: 'CUSTOM' }));

      const role = await rolesService.create({ ...request, ownerServiceName: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME });

      const [endpoint, body] = mockApiClient.put.mock.calls[0];
      expect(endpoint).toBe(AUTHORIZATION_ENDPOINTS.ROLE.GET_ALL);
      // SDK names are mapped to the API's role* names
      expect(body.roleName).toBe(PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME);
      expect(body.roleScopeType).toBe(PlatformRoleScopeType.Organization);
      expect(body.roleDescription).toBe(PLATFORM_ROLE_TEST_CONSTANTS.ROLE_DESCRIPTION);
      expect(body.roleService).toBe(PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME);
      expect(body).not.toHaveProperty('name');
      expect(body).not.toHaveProperty('scopeType');
      expect(body).not.toHaveProperty('description');
      expect(body).not.toHaveProperty('ownerServiceName');
      expect(body).not.toHaveProperty('id');
      // The organization is resolved by the SDK, not passed by the caller
      expect(body.organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(body.actionsGrantedByRole).toEqual([PLATFORM_ROLE_TEST_CONSTANTS.ACTION_NAME]);
      // The write returns only {createdRoleId} — the service follows up with a read
      expect(mockApiClient.get).toHaveBeenCalledWith(AUTHORIZATION_ENDPOINTS.ROLE.GET_BY_ID(roleId), {});
      expect(role.type).toBe(PlatformRoleType.Custom);
      expect(typeof role.update).toBe('function');
      expect(typeof role.delete).toBe('function');
    });

    it.each([
      ['name', { ...request, name: '' }],
      ['scopeType', { ...request, scopeType: '' as PlatformRoleScopeType }],
      ['description', { ...request, description: '' }],
      ['actionsGrantedByRole', { ...request, actionsGrantedByRole: [] }],
    ])('should throw ValidationError when %s is missing', async (_field, invalid) => {
      await expect(rolesService.create(invalid)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN));

      await expect(rolesService.create(request)).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN);
    });
  });

  describe('updateById', () => {
    it('should read the role, merge the changes, and PUT the full role with its id', async () => {
      const current = createBasicRawPlatformRole({ type: 'CUSTOM' });
      mockApiClient.get.mockResolvedValue(current);
      mockApiClient.put.mockResolvedValue({ createdRoleId: roleId });

      const role = await rolesService.updateById(roleId, { description: 'Updated' });

      expect(mockApiClient.get.mock.calls[0][0]).toBe(AUTHORIZATION_ENDPOINTS.ROLE.GET_BY_ID(roleId));
      const [endpoint, body] = mockApiClient.put.mock.calls[0];
      expect(endpoint).toBe(AUTHORIZATION_ENDPOINTS.ROLE.GET_ALL);
      expect(body.id).toBe(roleId);
      expect(body.roleDescription).toBe('Updated');
      // Omitted fields keep their current values — the API replaces the whole role on write
      expect(body.roleName).toBe(current.name);
      expect(body.roleScopeType).toBe(current.scopeType);
      expect(body.actionsGrantedByRole).toEqual(current.actionDetails.map((a) => a.name));
      // Owner service and tenant are only sent when the caller changes them
      expect(body).not.toHaveProperty('roleService');
      expect(body).not.toHaveProperty('tenantId');
      expect(body.organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(role.id).toBe(roleId);
    });

    it('should replace the granted actions when actionsGrantedByRole is given', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformRole({ type: 'CUSTOM' }));
      mockApiClient.put.mockResolvedValue({ createdRoleId: roleId });

      await rolesService.updateById(roleId, { actionsGrantedByRole: ['AUTHZ.ROLE.READ'] });

      const [, body] = mockApiClient.put.mock.calls[0];
      expect(body.actionsGrantedByRole).toEqual(['AUTHZ.ROLE.READ']);
    });

    it('should throw ValidationError when roleId is empty', async () => {
      await expect(rolesService.updateById('', { name: 'x' })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when the update has no fields', async () => {
      await expect(rolesService.updateById(roleId, {})).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLE_NOT_FOUND));

      await expect(rolesService.updateById(roleId, { name: 'x' })).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLE_NOT_FOUND);
    });
  });

  describe('deleteById', () => {
    it('should DELETE the role URL', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await rolesService.deleteById(roleId);

      expect(mockApiClient.delete).toHaveBeenCalledWith(AUTHORIZATION_ENDPOINTS.ROLE.GET_BY_ID(roleId), {});
    });

    it('should throw ValidationError when roleId is empty', async () => {
      await expect(rolesService.deleteById('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.delete.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLE_NOT_FOUND));

      await expect(rolesService.deleteById(roleId)).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLE_NOT_FOUND);
    });
  });

  describe('getAssignments', () => {
    it('should fetch every page and rename roleAssignmentDtos to roleAssignments', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformRoleAssignmentListResponse());

      const result = await rolesService.getAssignments('/');

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.scope).toBe('/');
      const principal = result.items[0];
      expect(principal.roleAssignments).toHaveLength(1);
      expect((principal as any).roleAssignmentDtos).toBeUndefined();
      // Nested assignment timestamps are renamed too
      expect(principal.roleAssignments[0].createdTime).toBe(PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON);
      expect((principal.roleAssignments[0] as any).createdOn).toBeUndefined();
    });

    it('should pass filters including the roleIds array through on the fetch-all path', async () => {
      mockApiClient.get.mockResolvedValue(createRawPlatformRoleAssignmentListResponse());

      await rolesService.getAssignments('/', {
        securityPrincipalId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
        roleIds: [roleId],
      });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.scope).toBe('/');
      expect(spec.params.securityPrincipalId).toBe(PLATFORM_USER_TEST_CONSTANTS.USER_ID);
      expect(spec.params.roleIds).toEqual([roleId]);
      // This endpoint caps top at 100
      expect(spec.params.top).toBe(AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE);
    });

    it('should fetch every page, stopping after a short page, and dedupe principals seen twice', async () => {
      const straddler = `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE - 1}`;
      const fullPage = Array.from({ length: AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE }, (_, i) =>
        createBasicRawPlatformPrincipalRoleAssignments({ securityPrincipalId: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${i}` })
      );
      mockApiClient.get
        .mockResolvedValueOnce(createRawPlatformRoleAssignmentListResponse(fullPage, AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE + 5))
        .mockResolvedValueOnce(createRawPlatformRoleAssignmentListResponse(
          [
            createBasicRawPlatformPrincipalRoleAssignments({ securityPrincipalId: straddler }),
            createBasicRawPlatformPrincipalRoleAssignments({ securityPrincipalId: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-new` }),
          ],
          AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE + 5
        ));

      const result = await rolesService.getAssignments('/');

      // Second page is short, so no third request even though totalCount says more
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      const secondCall = mockApiClient.get.mock.calls[1][1] as { params: Record<string, unknown> };
      expect(secondCall.params.skip).toBe(AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE);
      expect(result.items).toHaveLength(AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE + 1);
      expect(result.items.filter((p) => p.securityPrincipalId === straddler)).toHaveLength(1);
    });

    it('should keep the scope param on the paginated path too', async () => {
      mockApiClient.get.mockResolvedValue(
        createRawPlatformRoleAssignmentListResponse([createBasicRawPlatformPrincipalRoleAssignments()], 40)
      );

      const result = await rolesService.getAssignments('/', {
        securityPrincipalId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
        pageSize: 10,
      });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.scope).toBe('/');
      expect(spec.params.securityPrincipalId).toBe(PLATFORM_USER_TEST_CONSTANTS.USER_ID);
      expect(spec.params.top).toBe(10);
      expect(spec.params).not.toHaveProperty('$scope');
      // The paginated path has its own transform closure — verify it too
      const principal = result.items[0];
      expect((principal as any).roleAssignmentDtos).toBeUndefined();
      expect(principal.roleAssignments[0].createdTime).toBe(PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON);
      expect((principal.roleAssignments[0] as any).createdOn).toBeUndefined();
      expect(principal.roleAssignments[0].roleType).toBe(PlatformRoleType.BuiltIn);
      // The assignment's own type is normalized too (wire sends `Custom`)
      expect(principal.roleAssignments[0].type).toBe(PlatformRoleType.Custom);
    });

    it('should throw ValidationError when scope is empty', async () => {
      await expect(rolesService.getAssignments('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN));

      await expect(rolesService.getAssignments('/')).rejects.toThrow(
        PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN
      );
    });
  });

  describe('updateAssignments', () => {
    it('should PATCH additions and deletions under the wire names, defaulting the other side to empty', async () => {
      mockApiClient.patch.mockResolvedValue(undefined);

      await rolesService.updateAssignments({
        toAdd: [{
          roleId,
          securityPrincipalId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
          securityPrincipalType: PlatformPrincipalType.User,
          scope: '/',
        }],
      });

      const [endpoint, body] = mockApiClient.patch.mock.calls[0];
      expect(endpoint).toBe(AUTHORIZATION_ENDPOINTS.ROLE_ASSIGNMENT.GET_ALL);
      expect(body.roleAssignmentsToAdd).toHaveLength(1);
      expect(body.roleAssignmentsToAdd[0].roleId).toBe(roleId);
      expect(body.roleAssignmentsToDelete).toEqual([]);
      expect(body).not.toHaveProperty('toAdd');
      expect(body).not.toHaveProperty('toDelete');
    });

    it('should send deletions by assignment ID', async () => {
      mockApiClient.patch.mockResolvedValue(undefined);

      await rolesService.updateAssignments({ toDelete: [PLATFORM_ROLE_TEST_CONSTANTS.ASSIGNMENT_ID] });

      const [, body] = mockApiClient.patch.mock.calls[0];
      expect(body.roleAssignmentsToDelete).toEqual([PLATFORM_ROLE_TEST_CONSTANTS.ASSIGNMENT_ID]);
      expect(body.roleAssignmentsToAdd).toEqual([]);
    });

    it('should throw ValidationError when no changes are given', async () => {
      await expect(rolesService.updateAssignments({})).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.patch).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.patch.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN));

      await expect(
        rolesService.updateAssignments({ toDelete: [PLATFORM_ROLE_TEST_CONSTANTS.ASSIGNMENT_ID] })
      ).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN);
    });
  });

  describe('exportAssignments', () => {
    it('should request the CSV as a blob and return its text', async () => {
      const csv = `${PLATFORM_ROLE_TEST_CONSTANTS.CSV_EXPORT_HEADER}\n1,Admin,${roleId}`;
      mockApiClient.get.mockResolvedValue(new Blob([csv]));

      const result = await rolesService.exportAssignments();

      const [endpoint, spec] = mockApiClient.get.mock.calls[0];
      expect(endpoint).toBe(AUTHORIZATION_ENDPOINTS.ROLE_ASSIGNMENT.EXPORT);
      expect(spec.params.exportOutputType).toBe('Csv');
      expect(spec.responseType).toBe('blob');
      expect(result.startsWith(PLATFORM_ROLE_TEST_CONSTANTS.CSV_EXPORT_HEADER)).toBe(true);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN));

      await expect(rolesService.exportAssignments()).rejects.toThrow(
        PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN
      );
    });
  });

  describe('getEffectiveAccess', () => {
    it('should POST the tenant scope and reshape the envelope', async () => {
      mockApiClient.post.mockResolvedValue(createRawPlatformEffectiveAccessResponse());

      const access = await rolesService.getEffectiveAccess(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID, {
        userId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
      });

      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(AUTHORIZATION_ENDPOINTS.EFFECTIVE_ACCESS);
      expect(body.scopeIdentifier.scopeType).toBe('Tenant');
      expect(body.scopeIdentifier.value.id).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(body.userId).toBe(PLATFORM_USER_TEST_CONSTANTS.USER_ID);
      expect(body).not.toHaveProperty('groupId');

      expect(access.totalCount).toBe(1);
      expect(access.roles).toHaveLength(1);
      expect(access.roles[0].roleName).toBe(PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME);
      // Nested assignment list is renamed and timestamp-transformed
      expect(access.roles[0].assignments[0].createdTime).toBe(PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON);
      expect((access.roles[0].assignments[0] as any).createdOn).toBeUndefined();
      expect((access.roles[0] as any).roleAssignments).toBeUndefined();
      // Role types are normalized to the enum at both levels
      expect(access.roles[0].roleType).toBe(PlatformRoleType.BuiltIn);
      expect(access.roles[0].assignments[0].roleType).toBe(PlatformRoleType.BuiltIn);
      expect(access.grantedRoles).toHaveLength(1);
      expect(access.grantedServices).toEqual([]);
    });

    it('should check groups when groupId is given', async () => {
      mockApiClient.post.mockResolvedValue(createRawPlatformEffectiveAccessResponse());

      await rolesService.getEffectiveAccess(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID, {
        groupId: PLATFORM_USER_TEST_CONSTANTS.GROUP_ID,
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.groupId).toBe(PLATFORM_USER_TEST_CONSTANTS.GROUP_ID);
      expect(body).not.toHaveProperty('userId');
    });

    it('should throw ValidationError when tenantId is missing', async () => {
      await expect(
        rolesService.getEffectiveAccess('', { userId: PLATFORM_USER_TEST_CONSTANTS.USER_ID })
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when no principal is given', async () => {
      await expect(
        rolesService.getEffectiveAccess(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID, {})
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });


    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN));

      await expect(
        rolesService.getEffectiveAccess(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID, {
          userId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
        })
      ).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN);
    });
  });

  describe('getActions', () => {
    it('should retrieve the action catalog and drop internal fields', async () => {
      mockApiClient.get.mockResolvedValue([createBasicRawPlatformRoleAction()]);

      const actions = await rolesService.getActions();

      expect(mockApiClient.get.mock.calls[0][0]).toBe(AUTHORIZATION_ENDPOINTS.ACTIONS);
      expect(actions).toHaveLength(1);
      expect(actions[0].name).toBe(PLATFORM_ROLE_TEST_CONSTANTS.ACTION_NAME);
      expect((actions[0] as any).originalResourceAction).toBeUndefined();
    });

    it('should send filters as query params', async () => {
      mockApiClient.get.mockResolvedValue([]);

      await rolesService.getActions({ serviceName: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME });

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.serviceName).toBe(PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME);
    });

    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN));

      await expect(rolesService.getActions()).rejects.toThrow(PLATFORM_ROLE_TEST_CONSTANTS.ERROR_ROLES_FORBIDDEN);
    });
  });
});
