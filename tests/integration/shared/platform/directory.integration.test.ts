import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Directory, Groups } from '../../../../src/services/platform';
import { PlatformDirectoryEntityType, PlatformDirectorySource } from '../../../../src/models/platform';
import type { PlatformGroupGetResponse } from '../../../../src/models/platform';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Platform Directory - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let directory!: Directory;
  let groups!: Groups;
  let organizationId!: string;
  let readOnlyUserId!: string;
  let mutableUserId!: string;
  /** Throwaway group holding the mutable user; deleted in afterAll. */
  let probeGroup!: PlatformGroupGetResponse;

  beforeAll(async () => {
    const directoryService = getServices().platformDirectory;
    const groupsService = getServices().platformGroups;
    if (!directoryService || !groupsService) {
      throw new Error('Platform Directory/Groups services are not registered for this init mode');
    }
    directory = directoryService;
    groups = groupsService;

    const { organizationId: configuredOrganizationId, identityTestUserId, identityMutableTestUserId } = getTestConfig();
    if (!configuredOrganizationId || !identityTestUserId || !identityMutableTestUserId) {
      throw new Error(
        'UIPATH_ORGANIZATION_ID, IDENTITY_TEST_USER_ID, and IDENTITY_MUTABLE_TEST_USER_ID must be ' +
          'configured for the Directory suite.'
      );
    }
    organizationId = configuredOrganizationId;
    readOnlyUserId = identityTestUserId;
    mutableUserId = identityMutableTestUserId;

    // A group whose membership is known exactly: contains only the mutable user
    probeGroup = await groups.create(`sdk-it-${generateRandomString(8)}`, organizationId, {
      memberUserIds: [mutableUserId],
    });
  });

  afterAll(async () => {
    if (!groups || !probeGroup) return;
    await groups.deleteById(probeGroup.id, organizationId);
  });

  describe('search', () => {
    it('should find a known group by name prefix', async () => {
      const results = await directory.search(organizationId, {
        startsWith: 'Administrator',
        entityType: PlatformDirectoryEntityType.Group,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.map((r) => r.name)).toContain('Administrators');
      for (const entry of results) {
        expect(entry.type).toBe(PlatformDirectoryEntityType.Group);
      }
    });

    it('should apply the SDK transforms against the live response', async () => {
      const results = await directory.search(organizationId, { startsWith: 'Administrator' });
      const entry = results[0];

      // Renamed fields carry values
      expect(typeof entry.id).toBe('string');
      expect(typeof entry.name).toBe('string');
      // Wire names are gone
      expect((entry as any).identifier).toBeUndefined();
      expect((entry as any).identityName).toBeUndefined();
      expect((entry as any).objectType).toBeUndefined();
      // Numeric codes are mapped to enums
      expect(Object.values(PlatformDirectoryEntityType)).toContain(entry.type);
    });

    it('should narrow results with sourceFilter', async () => {
      const results = await directory.search(organizationId, {
        startsWith: 'sdk-it-',
        sources: [PlatformDirectorySource.LocalGroups],
      });

      expect(results.map((r) => r.id)).toContain(probeGroup.id);
      for (const entry of results) {
        expect(entry.type).toBe(PlatformDirectoryEntityType.Group);
      }
    });
  });

  describe('getGroupMembership', () => {
    it('should return the probe group for its member', async () => {
      const memberships = await directory.getGroupMembership(mutableUserId, [probeGroup.id], organizationId);

      expect(memberships).toHaveLength(1);
      expect(memberships[0].id).toBe(probeGroup.id);
      // Wire names are gone
      expect((memberships[0] as any).identifier).toBeUndefined();
      expect((memberships[0] as any).objectType).toBeUndefined();
    });

    it('should return an empty array for a non-member', async () => {
      // The read-only user was never added to the probe group
      const memberships = await directory.getGroupMembership(readOnlyUserId, [probeGroup.id], organizationId);

      expect(memberships).toEqual([]);
    });

    it('should return only the subset of groups the user belongs to', async () => {
      const allGroups = await groups.getAll(organizationId);
      const everyone = allGroups.find((g) => g.name === 'Everyone')!;

      const memberships = await directory.getGroupMembership(
        mutableUserId,
        [probeGroup.id, everyone.id],
        organizationId
      );

      const ids = memberships.map((m) => m.id);
      expect(ids).toContain(probeGroup.id);
      // The result is a strict subset of the checked IDs — nothing else may appear
      for (const id of ids) {
        expect([probeGroup.id, everyone.id]).toContain(id);
      }
    });
  });
});
