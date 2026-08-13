import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Users } from '../../../../src/services/platform';
import {
  PlatformUserSortField,
  PlatformUserSortOrder,
  PlatformUserType,
  PlatformUserCategory,
} from '../../../../src/models/platform';
import type { PlatformUserGetResponse } from '../../../../src/models/platform';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Platform Users - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let users!: Users;
  let organizationId!: string;
  /** Read-only account — never mutated. */
  let readOnlyUserId!: string;
  /** Account the suite may mutate; profile round-tripped via snapshot + restore. */
  let mutableUserId!: string;
  /** Full profile snapshot of the mutable user, restored in afterAll. */
  let mutableUserSnapshot!: PlatformUserGetResponse;

  beforeAll(async () => {
    const service = getServices().platformUsers;
    if (!service) {
      throw new Error('Platform Users service is not registered for this init mode');
    }
    users = service;

    const { organizationId: configuredOrganizationId, identityTestUserId, identityMutableTestUserId } = getTestConfig();
    if (!configuredOrganizationId || !identityTestUserId) {
      throw new Error('UIPATH_ORGANIZATION_ID and IDENTITY_TEST_USER_ID must be configured for the Users suite.');
    }
    if (!identityMutableTestUserId) {
      throw new Error(
        'IDENTITY_MUTABLE_TEST_USER_ID must be configured: updateById tests round-trip profile ' +
          'fields and must not run against the read-only IDENTITY_TEST_USER_ID account.'
      );
    }
    organizationId = configuredOrganizationId;
    readOnlyUserId = identityTestUserId;
    mutableUserId = identityMutableTestUserId;

    mutableUserSnapshot = await users.getById(mutableUserId);
  });

  afterAll(async () => {
    if (!users || !mutableUserSnapshot) return;
    // Restore from the snapshot. The API cannot write null (null/omitted means
    // "no change"), so a snapshotted null restores to the closest representable
    // value: an empty string.
    await users.updateById(mutableUserId, {
      displayName: mutableUserSnapshot.displayName ?? '',
    });
  });

  describe('getAll', () => {
    it('should list the organization users including the configured test users', async () => {
      const result = await users.getAll(organizationId);

      expect(result.items.length).toBeGreaterThan(0);
      const ids = result.items.map((u) => u.id);
      expect(ids).toContain(readOnlyUserId);
      expect(ids).toContain(mutableUserId);
    });

    it('should apply the SDK transforms against the live response', async () => {
      const result = await users.getAll(organizationId);
      const user = result.items.find((u) => u.id === readOnlyUserId)!;

      // Renamed fields carry values
      expect(typeof user.createdTime).toBe('string');
      expect(Array.isArray(user.groupIds)).toBe(true);
      // Wire names are gone
      expect((user as any).creationTime).toBeUndefined();
      expect((user as any).groupIDs).toBeUndefined();
      // Internal fields are dropped
      expect((user as any).legacyId).toBeUndefined();
      expect((user as any).bypassBasicAuthRestriction).toBeUndefined();
      // Numeric codes are mapped to enums
      expect(Object.values(PlatformUserType)).toContain(user.type);
      expect(Object.values(PlatformUserCategory)).toContain(user.category);
      // Bound method attached
      expect(typeof user.update).toBe('function');
    });

    it('should filter by searchTerm', async () => {
      const target = await users.getById(readOnlyUserId);

      const result = await users.getAll(organizationId, { searchTerm: target.email });

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.items.map((u) => u.id)).toContain(readOnlyUserId);
    });

    it('should sort by email when requested', async () => {
      const result = await users.getAll(organizationId, {
        sortBy: PlatformUserSortField.Email,
        sortOrder: PlatformUserSortOrder.Ascending,
      });

      const emails = result.items.map((u) => u.email.toLowerCase());
      expect(emails).toEqual([...emails].sort());
    });

    it('should paginate with pageSize and cursor', async () => {
      const page1 = await users.getAll(organizationId, { pageSize: 2 });

      expect(page1.items).toHaveLength(2);
      expect(page1.totalCount).toBeGreaterThan(2);
      expect(page1.hasNextPage).toBe(true);

      const page2 = await users.getAll(organizationId, { cursor: page1.nextCursor });
      expect(page2.items.length).toBeGreaterThan(0);
      expect(page2.items[0].id).not.toBe(page1.items[0].id);
    });
  });

  describe('getById', () => {
    it('should retrieve a user with profile and membership fields', async () => {
      const user = await users.getById(readOnlyUserId);

      expect(user.id).toBe(readOnlyUserId);
      expect(typeof user.userName).toBe('string');
      expect(typeof user.email).toBe('string');
      expect(typeof user.isActive).toBe('boolean');
      expect(Array.isArray(user.groupIds)).toBe(true);
      expect(user.groupIds.length).toBeGreaterThan(0);
    });

    it('should apply the SDK transforms against the live response', async () => {
      const user = await users.getById(readOnlyUserId);

      expect(typeof user.createdTime).toBe('string');
      expect((user as any).creationTime).toBeUndefined();
      expect((user as any).legacyId).toBeUndefined();
      expect(Object.values(PlatformUserType)).toContain(user.type);
      expect(typeof user.update).toBe('function');
    });
  });

  describe('updateById', () => {
    it('should update the display name and leave other profile fields untouched', async () => {
      const newDisplayName = `sdk-it-${generateRandomString(8)}`;

      const result = await users.updateById(mutableUserId, { displayName: newDisplayName });

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);

      const after = await users.getById(mutableUserId);
      expect(after.displayName).toBe(newDisplayName);
      // Omitted fields must keep their values — guards against replace semantics
      expect(after.email).toBe(mutableUserSnapshot.email);
      expect(after.name).toBe(mutableUserSnapshot.name);
      expect(after.surname).toBe(mutableUserSnapshot.surname);
      expect(after.isActive).toBe(mutableUserSnapshot.isActive);
      expect(after.groupIds).toEqual(mutableUserSnapshot.groupIds);
    });

    it('should update through the bound method on a retrieved user', async () => {
      const user = await users.getById(mutableUserId);
      const newDisplayName = `sdk-it-${generateRandomString(8)}`;

      const result = await user.update({ displayName: newDisplayName });

      expect(result.success).toBe(true);

      const after = await users.getById(mutableUserId);
      expect(after.displayName).toBe(newDisplayName);
    });
  });
});
