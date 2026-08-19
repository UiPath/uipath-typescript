import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Platform } from '../../../../src/services/platform';
import { PlatformSettingKey, type PlatformSetting } from '../../../../src/models/platform';

const modes: InitMode[] = ['v1'];

const ALL_KEYS = Object.values(PlatformSettingKey);

describe.each(modes)('Platform - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let platform!: Platform;
  let userId!: string;
  let organizationId!: string;
  // Snapshot of every stored setting, restored in afterAll so the suite leaves the
  // shared environment exactly as it found it.
  let originalSettings!: PlatformSetting[];
  // The single row the write tests round-trip.
  let originalSetting!: PlatformSetting;

  beforeAll(async () => {
    const service = getServices().platform;
    if (!service) {
      throw new Error('Platform service is not registered for this init mode');
    }
    platform = service;

    // Settings are scoped to (organization, user). Both have to be supplied: the SDK
    // cannot derive the calling user from a PAT, and omitting the organization makes the
    // API fall back to the host partition rather than this one.
    // `identityTestUserId` keeps its name from the already-provisioned
    // `UIPATH_IDENTITY_TEST_USER_ID` repository secret; it is test plumbing, not public API.
    const { identityTestUserId, organizationId: configuredOrganizationId } = getTestConfig();
    if (!identityTestUserId || !configuredOrganizationId) {
      throw new Error(
        'IDENTITY_TEST_USER_ID and UIPATH_ORGANIZATION_ID must both be configured; platform ' +
          'settings are scoped to (organization, user).'
      );
    }
    userId = identityTestUserId;
    organizationId = configuredOrganizationId;

    // Any supported key with a stored value works — the write tests round-trip it and
    // restore the original, so nothing needs to be configured per environment.
    const settings = await platform.getUserSettings(ALL_KEYS, userId, { organizationId });
    if (settings.length === 0) {
      throw new Error(
        `No supported platform setting has a stored value for user ${userId}; the settings ` +
          'round-trip cannot be verified. Point IDENTITY_TEST_USER_ID at a user who has ' +
          'set at least one of them.'
      );
    }
    originalSettings = settings;
    originalSetting = settings[0];
  });

  afterAll(async () => {
    if (!platform || !originalSettings?.length || !userId) return;
    // Restore from the snapshot — never hardcoded assumed values.
    await platform.updateUserSettings(
      originalSettings.map((s) => ({ key: s.key, value: s.value })),
      userId,
      originalSettings[0].organizationId
    );
  });

  describe('getUserSettings', () => {
    it('should retrieve a setting with its value and scope fields', () => {
      expect(ALL_KEYS).toContain(originalSetting.key);
      expect(typeof originalSetting.id).toBe('number');
      expect(typeof originalSetting.value).toBe('string');
      expect(typeof originalSetting.organizationId).toBe('string');
      expect(typeof originalSetting.userId).toBe('string');
    });

    it('should expose the organization as organizationId, not the wire partitionGlobalId', () => {
      expect(originalSetting.organizationId).toBeTruthy();
      expect(originalSetting).not.toHaveProperty('partitionGlobalId');
    });

    it('should return no more rows than the number of keys requested', async () => {
      // Keys with nothing stored are omitted rather than returned with an empty value
      const result = await platform.getUserSettings(ALL_KEYS, userId, { organizationId });

      expect(result.length).toBeLessThanOrEqual(ALL_KEYS.length);
      result.forEach((setting) => expect(ALL_KEYS).toContain(setting.key));
    });

    it('should retrieve a single key when only that key is requested', async () => {
      const result = await platform.getUserSettings([originalSetting.key], userId, { organizationId });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(originalSetting.key);
    });

    it('should retrieve settings when organizationId is passed explicitly', async () => {
      const result = await platform.getUserSettings([originalSetting.key], userId, {
        organizationId: originalSetting.organizationId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(originalSetting.organizationId);
      expect(result[0].userId).toBe(originalSetting.userId);
    });
  });

  describe('updateUserSettings', () => {
    it('should overwrite a setting value and return the stored row', async () => {
      const newValue = `${originalSetting.value}-sdktest`;

      const updated = await platform.updateUserSettings(
        [{ key: originalSetting.key, value: newValue }],
        userId,
        originalSetting.organizationId
      );

      expect(Array.isArray(updated)).toBe(true);
      const updatedRow = updated.find((s) => s.key === originalSetting.key);
      expect(updatedRow?.value).toBe(newValue);
      expect(typeof updatedRow?.id).toBe('number');

      const afterWrite = await platform.getUserSettings([originalSetting.key], userId, { organizationId });
      expect(afterWrite.find((s) => s.key === originalSetting.key)?.value).toBe(newValue);

      // Restore immediately so a later failure cannot leave the modified value behind
      await platform.updateUserSettings(
        [{ key: originalSetting.key, value: originalSetting.value }],
        userId,
        originalSetting.organizationId
      );

      const afterRestore = await platform.getUserSettings([originalSetting.key], userId, { organizationId });
      expect(afterRestore.find((s) => s.key === originalSetting.key)?.value).toBe(
        originalSetting.value
      );
    });

    it('should upsert every submitted setting in one request', async () => {
      if (originalSettings.length < 2) {
        throw new Error(
          'Test user has fewer than 2 stored platform settings; the bulk write path cannot ' +
            'be verified without creating keys this suite has no way to remove.'
        );
      }

      // Writes each setting's existing value back, so the call is a no-op on the
      // environment while still exercising the multi-item path end to end.
      const batch = originalSettings.map((s) => ({ key: s.key, value: s.value }));

      const updated = await platform.updateUserSettings(batch, userId, originalSetting.organizationId);

      expect(updated.length).toBe(batch.length);
      batch.forEach(({ key, value }) => {
        expect(updated.find((s) => s.key === key)?.value).toBe(value);
      });
    });

    it('should write against the same user the read returned', async () => {
      const updated = await platform.updateUserSettings(
        [{ key: originalSetting.key, value: originalSetting.value }],
        userId,
        originalSetting.organizationId
      );

      expect(updated.find((s) => s.key === originalSetting.key)?.userId).toBe(userId);
    });
  });
});
