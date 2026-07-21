import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Users } from '../../../../src/services/identity';
import { UserCategory, UserType } from '../../../../src/models/identity';
import { generateRandomString } from '../../utils/helpers';

// New modular service — v1 init only.
const modes: InitMode[] = ['v1'];

describe.each(modes)('Identity Users - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let users!: Users;
  let organizationId!: string;
  /** GUID of a user created once in beforeAll and shared by the read/update tests. */
  let sharedUserId!: string;
  let sharedUserName!: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const service = getServices().users;
    if (!service) {
      throw new Error('Users service is not registered for this init mode');
    }
    users = service;

    const configuredOrganizationId = getTestConfig().organizationId;
    if (!configuredOrganizationId) {
      throw new Error(
        'UIPATH_ORGANIZATION_ID is not configured. Set it to the organization GUID ' +
          'so users can be created in the organization partition.',
      );
    }
    organizationId = configuredOrganizationId;

    // Shared fixture user for the read/update tests.
    sharedUserName = `sdkit${generateRandomString(10)}`;
    const response = await users.create([{ userName: sharedUserName }], organizationId);
    if (!response.result.succeeded || response.users.length === 0) {
      throw new Error(
        `Failed to create the shared fixture user: ${JSON.stringify(response.result.errors)}`,
      );
    }
    sharedUserId = response.users[0].id;
    createdUserIds.push(sharedUserId);
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await users.deleteById(userId);
    }
  });

  describe('create', () => {
    it('should create a user with profile fields and group membership', async () => {
      const userName = `sdkit${generateRandomString(10)}`;

      const response = await users.create(
        [{ userName, name: 'Sdk', surname: 'Integration' }],
        organizationId,
      );

      expect(response.result.succeeded).toBe(true);
      expect(response.result.errors).toEqual([]);
      expect(response.users.length).toBe(1);

      const user = response.users[0];
      createdUserIds.push(user.id);

      expect(user.userName).toBe(userName);
      expect(user.name).toBe('Sdk');
      expect(user.surname).toBe('Integration');
      expect(user.isActive).toBe(true);

      // Created users carry bound entity methods
      expect(typeof user.update).toBe('function');
      expect(typeof user.delete).toBe('function');
    });
  });

  describe('getById', () => {
    it('should retrieve the user by ID with bound methods', async () => {
      const user = await users.getById(sharedUserId);

      expect(user.id).toBe(sharedUserId);
      expect(user.userName).toBe(sharedUserName);
      expect(typeof user.update).toBe('function');
      expect(typeof user.delete).toBe('function');
    });

    it('should apply the SDK transform pipeline to the live response', async () => {
      const user = await users.getById(sharedUserId);

      // (a) Renamed/typed fields present with values.
      expect(typeof user.createdTime).toBe('string');
      expect(user.createdTime.length).toBeGreaterThan(0);
      expect(Array.isArray(user.groupIds)).toBe(true);
      expect(Object.values(UserType)).toContain(user.type);
      expect(Object.values(UserCategory)).toContain(user.category);

      // (b) Original API fields are absent.
      expect(user).not.toHaveProperty('creationTime');
      expect(user).not.toHaveProperty('lastModificationTime');
      expect(user).not.toHaveProperty('groupIDs');

      // (c) Internal fields are stripped.
      expect(user).not.toHaveProperty('legacyId');
    });
  });

  describe('updateById', () => {
    it('should update profile fields and report success', async () => {
      const displayName = `SDK IT ${generateRandomString(6)}`;

      const result = await users.updateById(sharedUserId, { displayName });

      expect(result.succeeded).toBe(true);
      expect(result.errors).toEqual([]);

      const user = await users.getById(sharedUserId);
      expect(user.displayName).toBe(displayName);
    });

    it('should update via the bound method on a retrieved user', async () => {
      const user = await users.getById(sharedUserId);
      const displayName = `SDK Bound ${generateRandomString(6)}`;

      const result = await user.update({ displayName });

      expect(result.succeeded).toBe(true);

      const refreshed = await users.getById(sharedUserId);
      expect(refreshed.displayName).toBe(displayName);
    });
  });

  describe('deleteById', () => {
    it('should delete a user and make subsequent retrieval fail', async () => {
      const userName = `sdkit${generateRandomString(10)}`;
      const response = await users.create([{ userName }], organizationId);
      const userId = response.users[0].id;
      createdUserIds.push(userId);

      await users.deleteById(userId);
      createdUserIds.splice(createdUserIds.indexOf(userId), 1);

      await expect(users.getById(userId)).rejects.toThrow();
    });
  });
});
