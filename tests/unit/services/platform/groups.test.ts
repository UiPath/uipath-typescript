// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Imported through the subpath barrel, the way consumers reach it — this also catches a
// barrel that stops re-exporting the class or the enums as runtime values.
import { Groups, PlatformGroupType } from '../../../../src/services/platform/groups';
import { PlatformUserType } from '../../../../src/services/platform/users';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicRawPlatformGroup,
  createBasicRawPlatformGroupMember,
  createRawPlatformGroupMembersResponse,
  createMockError,
  PLATFORM_TEST_CONSTANTS,
  PLATFORM_GROUP_TEST_CONSTANTS,
  PLATFORM_USER_TEST_CONSTANTS,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient, getPrivateSDK } from '../../../utils/setup';
import { IDENTITY_GROUP_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { IDENTITY_MAX_PAGE_SIZE } from '../../../../src/utils/constants/common';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// GUID shape for the client-generated group ID sent on create
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ===== TEST SUITE =====
describe('Platform Groups Service Unit Tests', () => {
  let groupsService: Groups;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  const organizationId = PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID;
  const groupId = PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies({ organizationId });
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    groupsService = new Groups(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('barrel exports', () => {
    it('should expose the service class and enum as runtime values through the subpath barrel', () => {
      // A barrel using `export type *` would drop these and break every documented example
      expect(typeof Groups).toBe('function');
      expect(PlatformGroupType.BuiltIn).toBe('builtIn');
      expect(PlatformGroupType.Custom).toBe('custom');
    });
  });

  describe('getAll', () => {
    it('should share one organization id resolver between services built on the same instance', async () => {
      const { instance } = createServiceTestDependencies({ organizationId });
      mockApiClient.get.mockResolvedValue([createBasicRawPlatformGroup()]);

      await new Groups(instance).getAll();
      const resolver = getPrivateSDK(instance).organizationIdResolver;
      await new Groups(instance).getAll();

      expect(resolver).toBeDefined();
      expect(getPrivateSDK(instance).organizationIdResolver).toBe(resolver);
      expect(mockApiClient.get.mock.calls[1][0]).toBe(IDENTITY_GROUP_ENDPOINTS.GET_ALL(organizationId));
    });

    it('should retrieve all groups from the organization group listing endpoint', async () => {
      mockApiClient.get.mockResolvedValue([createBasicRawPlatformGroup()]);

      const result = await groupsService.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_GROUP_ENDPOINTS.GET_ALL(organizationId), {});
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(groupId);
    });

    it('should apply the full transform pipeline to each group', async () => {
      mockApiClient.get.mockResolvedValue([createBasicRawPlatformGroup()]);

      const [group] = await groupsService.getAll();

      // Semantic renames carry their values (distinctive timestamps, not null defaults)
      expect(group.createdTime).toBe(PLATFORM_GROUP_TEST_CONSTANTS.CREATION_TIME);
      expect(group.lastModifiedTime).toBe(PLATFORM_GROUP_TEST_CONSTANTS.LAST_MODIFICATION_TIME);
      // Original wire fields are gone
      expect((group as any).creationTime).toBeUndefined();
      expect((group as any).lastModificationTime).toBeUndefined();
      // Internal fields are dropped
      expect((group as any).members).toBeUndefined();
      expect((group as any).mappedRole).toBeUndefined();
      expect((group as any).scope).toBeUndefined();
      // Numeric code is mapped to the enum
      expect(group.type).toBe(PlatformGroupType.BuiltIn);
    });

    it('should map the custom group type code', async () => {
      mockApiClient.get.mockResolvedValue([createBasicRawPlatformGroup({ type: 1 })]);

      const [group] = await groupsService.getAll();

      expect(group.type).toBe(PlatformGroupType.Custom);
    });

    it('should attach bound methods to each group', async () => {
      mockApiClient.get.mockResolvedValue([createBasicRawPlatformGroup()]);

      const [group] = await groupsService.getAll();

      expect(typeof group.update).toBe('function');
      expect(typeof group.delete).toBe('function');
      expect(typeof group.getMembers).toBe('function');
    });


    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUPS_FORBIDDEN));

      await expect(groupsService.getAll()).rejects.toThrow(
        PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUPS_FORBIDDEN
      );
    });
  });

  describe('getById', () => {
    it('should retrieve a group by ID with the transform pipeline applied', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformGroup());

      const group = await groupsService.getById(groupId);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        IDENTITY_GROUP_ENDPOINTS.GET_BY_ID(organizationId, groupId),
        {}
      );
      expect(group.id).toBe(groupId);
      expect(group.createdTime).toBe(PLATFORM_GROUP_TEST_CONSTANTS.CREATION_TIME);
      expect((group as any).creationTime).toBeUndefined();
    });

    it('should throw ValidationError when groupId is empty', async () => {
      await expect(groupsService.getById('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });


    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND));

      await expect(groupsService.getById(groupId)).rejects.toThrow(
        PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND
      );
    });
  });

  describe('create', () => {
    it('should POST the new group with a client-generated GUID and the resolved organization in the body', async () => {
      mockApiClient.post.mockResolvedValue(createBasicRawPlatformGroup({ type: 1 }));

      const group = await groupsService.create(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME_ALT);

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      const [endpoint, body] = mockApiClient.post.mock.calls[0];
      expect(endpoint).toBe(IDENTITY_GROUP_ENDPOINTS.CREATE);
      expect(body.partitionGlobalId).toBe(organizationId);
      expect(body.name).toBe(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME_ALT);
      expect(body.id).toMatch(GUID_REGEX);
      expect(group.type).toBe(PlatformGroupType.Custom);
      expect(typeof group.update).toBe('function');
    });

    it('should send initial members under the wire directoryUserMemberIDs name', async () => {
      mockApiClient.post.mockResolvedValue(createBasicRawPlatformGroup({ type: 1 }));

      await groupsService.create(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME_ALT, {
        memberUserIds: [PLATFORM_USER_TEST_CONSTANTS.USER_ID],
      });

      const [, body] = mockApiClient.post.mock.calls[0];
      expect(body.directoryUserMemberIDs).toEqual([PLATFORM_USER_TEST_CONSTANTS.USER_ID]);
      expect(body).not.toHaveProperty('memberUserIds');
    });

    it('should throw ValidationError when name is empty', async () => {
      await expect(groupsService.create('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });


    it('should propagate API errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUPS_FORBIDDEN));

      await expect(
        groupsService.create(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME_ALT)
      ).rejects.toThrow(PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUPS_FORBIDDEN);
    });
  });

  describe('updateById', () => {
    it('should PUT the new name and member changes under wire names with the resolved organization in the body', async () => {
      mockApiClient.put.mockResolvedValue(createBasicRawPlatformGroup({ type: 1 }));

      const group = await groupsService.updateById(groupId, {
        name: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME_ALT,
        memberUserIdsToAdd: [PLATFORM_USER_TEST_CONSTANTS.USER_ID],
        memberUserIdsToRemove: [PLATFORM_USER_TEST_CONSTANTS.USER_ID_ALT],
      });

      // The name was supplied, so no read is needed before the write
      expect(mockApiClient.get).not.toHaveBeenCalled();
      const [endpoint, body] = mockApiClient.put.mock.calls[0];
      expect(endpoint).toBe(IDENTITY_GROUP_ENDPOINTS.UPDATE(groupId));
      expect(body.partitionGlobalId).toBe(organizationId);
      expect(body.name).toBe(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME_ALT);
      expect(body.directoryUserIDsToAdd).toEqual([PLATFORM_USER_TEST_CONSTANTS.USER_ID]);
      expect(body.directoryUserIDsToRemove).toEqual([PLATFORM_USER_TEST_CONSTANTS.USER_ID_ALT]);
      expect(body).not.toHaveProperty('memberUserIdsToAdd');
      expect(body).not.toHaveProperty('memberUserIdsToRemove');
      expect(typeof group.update).toBe('function');
    });

    it('should read the current name when only membership changes are given — the API requires it on every update', async () => {
      mockApiClient.get.mockResolvedValue(createBasicRawPlatformGroup({ type: 1 }));
      mockApiClient.put.mockResolvedValue(createBasicRawPlatformGroup({ type: 1 }));

      await groupsService.updateById(groupId, { memberUserIdsToAdd: [PLATFORM_USER_TEST_CONSTANTS.USER_ID] });

      expect(mockApiClient.get.mock.calls[0][0]).toBe(IDENTITY_GROUP_ENDPOINTS.GET_BY_ID(organizationId, groupId));
      const [, body] = mockApiClient.put.mock.calls[0];
      // Merge preservation: the stored name travels with the membership edit
      expect(body.name).toBe(PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME);
      expect(body.directoryUserIDsToAdd).toEqual([PLATFORM_USER_TEST_CONSTANTS.USER_ID]);
    });

    it('should throw ValidationError when groupId is empty', async () => {
      await expect(groupsService.updateById('', { name: 'x' })).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when the update has no fields', async () => {
      await expect(groupsService.updateById(groupId, {})).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate API errors', async () => {
      mockApiClient.put.mockRejectedValue(createMockError(PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND));

      await expect(groupsService.updateById(groupId, { name: 'x' })).rejects.toThrow(
        PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND
      );
    });
  });

  describe('deleteById', () => {
    it('should DELETE the group URL', async () => {
      mockApiClient.delete.mockResolvedValue(undefined);

      await groupsService.deleteById(groupId);

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        IDENTITY_GROUP_ENDPOINTS.GET_BY_ID(organizationId, groupId),
        {}
      );
    });

    it('should throw ValidationError when groupId is empty', async () => {
      await expect(groupsService.deleteById('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.delete).not.toHaveBeenCalled();
    });


    it('should propagate API errors', async () => {
      mockApiClient.delete.mockRejectedValue(createMockError(PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND));

      await expect(groupsService.deleteById(groupId)).rejects.toThrow(
        PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND
      );
    });
  });

  describe('getMembers', () => {
    it('should fetch every page when no pagination options are given', async () => {
      const fullPage = Array.from({ length: IDENTITY_MAX_PAGE_SIZE }, (_, i) =>
        createBasicRawPlatformGroupMember({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${i}` })
      );
      mockApiClient.get
        .mockResolvedValueOnce(createRawPlatformGroupMembersResponse(fullPage, IDENTITY_MAX_PAGE_SIZE + 1))
        .mockResolvedValueOnce(createRawPlatformGroupMembersResponse([createBasicRawPlatformGroupMember()], IDENTITY_MAX_PAGE_SIZE + 1));

      const result = await groupsService.getMembers(groupId);

      expect(result.items).toHaveLength(IDENTITY_MAX_PAGE_SIZE + 1);
      expect(result.totalCount).toBe(IDENTITY_MAX_PAGE_SIZE + 1);
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
      const secondCall = mockApiClient.get.mock.calls[1][1] as { params: Record<string, unknown> };
      expect(secondCall.params.skip).toBe(IDENTITY_MAX_PAGE_SIZE);
    });

    it('should stop after a short page and not refetch', async () => {
      const shortPage = Array.from({ length: 3 }, (_, i) => createBasicRawPlatformGroupMember({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${i}` }));
      // totalCount overcounts (e.g. stale index) — a short page must still be terminal
      mockApiClient.get.mockResolvedValueOnce(createRawPlatformGroupMembersResponse(shortPage, 5));

      const result = await groupsService.getMembers(groupId);

      expect(result.items).toHaveLength(3);
      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    });

    it('should dedupe members that appear on two pages', async () => {
      const straddler = `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${IDENTITY_MAX_PAGE_SIZE - 1}`;
      const fullPage = Array.from({ length: IDENTITY_MAX_PAGE_SIZE }, (_, i) =>
        createBasicRawPlatformGroupMember({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-${i}` })
      );
      // The last record of page one is served again at the top of page two
      mockApiClient.get
        .mockResolvedValueOnce(createRawPlatformGroupMembersResponse(fullPage, IDENTITY_MAX_PAGE_SIZE + 1))
        .mockResolvedValueOnce(createRawPlatformGroupMembersResponse(
          [createBasicRawPlatformGroupMember({ id: straddler }), createBasicRawPlatformGroupMember({ id: `${PLATFORM_USER_TEST_CONSTANTS.USER_ID}-new` })],
          IDENTITY_MAX_PAGE_SIZE + 1
        ));

      const result = await groupsService.getMembers(groupId);

      expect(result.items).toHaveLength(IDENTITY_MAX_PAGE_SIZE + 1);
      expect(result.items.filter((m) => m.id === straddler)).toHaveLength(1);
    });

    it('should map the numeric member account type to the PlatformUserType enum', async () => {
      mockApiClient.get.mockResolvedValue(
        createRawPlatformGroupMembersResponse([createBasicRawPlatformGroupMember({ type: 4 })])
      );

      const result = await groupsService.getMembers(groupId);

      expect(result.items[0].type).toBe(PlatformUserType.RobotAccount);
      expect(result.items[0].id).toBe(PLATFORM_USER_TEST_CONSTANTS.USER_ID);
    });

    it('should send pagination params without an OData prefix when paginated', async () => {
      mockApiClient.get.mockResolvedValue(
        createRawPlatformGroupMembersResponse(
          [createBasicRawPlatformGroupMember()],
          PLATFORM_GROUP_TEST_CONSTANTS.MEMBERS_TOTAL_COUNT
        )
      );

      const page = await groupsService.getMembers(groupId, { pageSize: 1 });

      expect(page.totalCount).toBe(PLATFORM_GROUP_TEST_CONSTANTS.MEMBERS_TOTAL_COUNT);
      expect(page.hasNextPage).toBe(true);
      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.top).toBe(1);
      expect(spec.params).not.toHaveProperty('$top');
      expect(spec.params).not.toHaveProperty('$count');
    });

    it('should throw ValidationError when groupId is empty', async () => {
      await expect(groupsService.getMembers('')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });


    it('should propagate API errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND));

      await expect(groupsService.getMembers(groupId)).rejects.toThrow(
        PLATFORM_GROUP_TEST_CONSTANTS.ERROR_GROUP_NOT_FOUND
      );
    });
  });
});
