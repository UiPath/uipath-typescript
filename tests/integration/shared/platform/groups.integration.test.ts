import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Groups, Users } from '../../../../src/services/platform';
import { PlatformGroupType, PlatformUserType } from '../../../../src/models/platform';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Platform Groups - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let groups!: Groups;
  let users!: Users;
  let organizationId!: string;
  /** Account the suite may add to / remove from throwaway groups. */
  let mutableUserId!: string;
  /** IDs of groups created by this suite; deleted in afterAll. */
  const createdGroupIds: string[] = [];

  beforeAll(async () => {
    const groupsService = getServices().platformGroups;
    const usersService = getServices().platformUsers;
    if (!groupsService || !usersService) {
      throw new Error('Platform Groups/Users services are not registered for this init mode');
    }
    groups = groupsService;
    users = usersService;

    const { organizationId: configuredOrganizationId, identityMutableTestUserId } = getTestConfig();
    if (!configuredOrganizationId) {
      throw new Error('UIPATH_ORGANIZATION_ID must be configured for the Groups suite.');
    }
    if (!identityMutableTestUserId) {
      throw new Error(
        'IDENTITY_MUTABLE_TEST_USER_ID must be configured: membership tests add and remove ' +
          'this account from throwaway test groups.'
      );
    }
    organizationId = configuredOrganizationId;
    mutableUserId = identityMutableTestUserId;
  });

  afterAll(async () => {
    if (!groups) return;
    for (const id of createdGroupIds) {
      await groups.deleteById(id, organizationId);
    }
  });

  describe('getAll', () => {
    it('should list the organization groups including built-ins', async () => {
      const allGroups = await groups.getAll(organizationId);

      expect(allGroups.length).toBeGreaterThan(0);
      const names = allGroups.map((g) => g.name);
      expect(names).toContain('Everyone');
      expect(names).toContain('Administrators');
      const everyone = allGroups.find((g) => g.name === 'Everyone')!;
      expect(everyone.type).toBe(PlatformGroupType.BuiltIn);
    });

    it('should apply the SDK transforms against the live response', async () => {
      const allGroups = await groups.getAll(organizationId);
      const group = allGroups[0];

      // Renamed fields carry values
      expect(typeof group.createdTime).toBe('string');
      // Wire names are gone
      expect((group as any).creationTime).toBeUndefined();
      // Internal fields are dropped
      expect((group as any).members).toBeUndefined();
      expect((group as any).mappedRole).toBeUndefined();
      expect((group as any).scope).toBeUndefined();
      // Numeric codes are mapped to enums
      expect(Object.values(PlatformGroupType)).toContain(group.type);
      // Organization scope is enriched
      expect(group.organizationId).toBe(organizationId);
      // Bound methods attached
      expect(typeof group.update).toBe('function');
      expect(typeof group.delete).toBe('function');
      expect(typeof group.getMembers).toBe('function');
    });
  });

  describe('create, getById, updateById, deleteById', () => {
    it('should round-trip a full group lifecycle', async () => {
      const name = `sdk-it-${generateRandomString(8)}`;

      // Create
      const created = await groups.create(name, organizationId);
      createdGroupIds.push(created.id);
      expect(created.name).toBe(name);
      expect(created.type).toBe(PlatformGroupType.Custom);
      expect(created.organizationId).toBe(organizationId);

      // Read back
      const fetched = await groups.getById(created.id, organizationId);
      expect(fetched.id).toBe(created.id);
      expect(fetched.name).toBe(name);

      // Rename
      const renamed = await groups.updateById(created.id, organizationId, `${name}-renamed`);
      expect(renamed.name).toBe(`${name}-renamed`);

      // Delete
      await groups.deleteById(created.id, organizationId);
      createdGroupIds.splice(createdGroupIds.indexOf(created.id), 1);

      const remaining = await groups.getAll(organizationId);
      expect(remaining.map((g) => g.id)).not.toContain(created.id);
    });

    it('should create a group with initial members and list them', async () => {
      const name = `sdk-it-${generateRandomString(8)}`;

      const created = await groups.create(name, organizationId, { memberUserIds: [mutableUserId] });
      createdGroupIds.push(created.id);

      const members = await groups.getMembers(created.id, organizationId);
      expect(members.totalCount).toBe(1);
      expect(members.items[0].id).toBe(mutableUserId);
      expect(Object.values(PlatformUserType)).toContain(members.items[0].type);
    });
  });

  describe('membership editing (group side and user side)', () => {
    it('should add and remove a member through updateById and bound methods', async () => {
      const created = await groups.create(`sdk-it-${generateRandomString(8)}`, organizationId);
      createdGroupIds.push(created.id);

      // Add from the group side — the current name must travel with membership edits
      await groups.updateById(created.id, organizationId, created.name, {
        memberUserIdsToAdd: [mutableUserId],
      });
      let members = await created.getMembers();
      expect(members.items.map((m) => m.id)).toContain(mutableUserId);

      // Membership is visible from the user side too
      const user = await users.getById(mutableUserId);
      expect(user.groupIds).toContain(created.id);

      // Remove from the group side
      await created.update({ memberUserIdsToRemove: [mutableUserId] });
      members = await groups.getMembers(created.id, organizationId);
      expect(members.items.map((m) => m.id)).not.toContain(mutableUserId);
    });

    it('should add and remove a member from the user side via users.updateById', async () => {
      const created = await groups.create(`sdk-it-${generateRandomString(8)}`, organizationId);
      createdGroupIds.push(created.id);

      // Grant from the user side — the RBAC "make this user an admin" call
      const addResult = await users.updateById(mutableUserId, { groupIdsToAdd: [created.id] });
      expect(addResult.success).toBe(true);

      const members = await groups.getMembers(created.id, organizationId);
      expect(members.items.map((m) => m.id)).toContain(mutableUserId);

      // Revoke from the user side
      const removeResult = await users.updateById(mutableUserId, { groupIdsToRemove: [created.id] });
      expect(removeResult.success).toBe(true);

      const after = await users.getById(mutableUserId);
      expect(after.groupIds).not.toContain(created.id);
    });
  });

  describe('getMembers pagination', () => {
    it('should paginate members with pageSize', async () => {
      // The built-in Administrators group has materialized members in this org
      const allGroups = await groups.getAll(organizationId);
      const admins = allGroups.find((g) => g.name === 'Administrators')!;

      const all = await groups.getMembers(admins.id, organizationId);
      if (all.totalCount < 2) {
        throw new Error('Administrators group needs at least 2 members for the pagination test');
      }

      const page1 = await groups.getMembers(admins.id, organizationId, { pageSize: 1 });
      expect(page1.items).toHaveLength(1);
      expect(page1.totalCount).toBe(all.totalCount);
      expect(page1.hasNextPage).toBe(true);

      const page2 = await groups.getMembers(admins.id, organizationId, { cursor: page1.nextCursor! });
      expect(page2.items.length).toBeGreaterThan(0);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });
  });

  describe('deleteById via bound method', () => {
    it('should delete a group through the bound delete()', async () => {
      const created = await groups.create(`sdk-it-${generateRandomString(8)}`, organizationId);
      createdGroupIds.push(created.id);

      await created.delete();
      createdGroupIds.splice(createdGroupIds.indexOf(created.id), 1);

      const remaining = await groups.getAll(organizationId);
      expect(remaining.map((g) => g.id)).not.toContain(created.id);
    });
  });
});
