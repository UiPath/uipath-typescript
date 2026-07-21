import { describe, it, expect, beforeAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Users } from '../../../../src/services/identity';
import { UserCategory, UserType } from '../../../../src/models/identity';

// New modular service — v1 init only.
const modes: InitMode[] = ['v1'];

describe.each(modes)('Identity Users - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let users!: Users;
  /** GUID of a pre-existing user in the test organization. */
  let testUserId!: string;

  beforeAll(() => {
    const service = getServices().users;
    if (!service) {
      throw new Error('Users service is not registered for this init mode');
    }
    users = service;

    const configuredUserId = getTestConfig().identityTestUserId;
    if (!configuredUserId) {
      throw new Error(
        'IDENTITY_TEST_USER_ID is not configured. Set it to the GUID of an existing ' +
          'user in the test organization so the user can be retrieved.',
      );
    }
    testUserId = configuredUserId;
  });

  describe('getById', () => {
    it('should retrieve the user by ID', async () => {
      const user = await users.getById(testUserId);

      expect(user.id).toBe(testUserId);
      expect(typeof user.userName).toBe('string');
      expect(user.userName.length).toBeGreaterThan(0);
      expect(typeof user.isActive).toBe('boolean');
      expect(typeof user.invitationAccepted).toBe('boolean');
    });

    it('should apply the SDK transform pipeline to the live response', async () => {
      const user = await users.getById(testUserId);

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
});
