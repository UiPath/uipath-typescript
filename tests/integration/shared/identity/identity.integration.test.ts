import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Identity } from '../../../../src/services/identity';
import { IdentitySettingKey, type IdentitySetting } from '../../../../src/models/identity';

const modes: InitMode[] = ['v1'];

const ALL_KEYS = Object.values(IdentitySettingKey);

describe.each(modes)('Identity - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let identity!: Identity;
  let userId!: string;
  // Snapshot of every stored setting, restored in afterAll so the suite leaves the
  // shared environment exactly as it found it.
  let originalSettings!: IdentitySetting[];
  // The single row the write tests round-trip.
  let originalSetting!: IdentitySetting;

  beforeAll(async () => {
    const service = getServices().identity;
    if (!service) {
      throw new Error('Identity service is not registered for this init mode');
    }
    identity = service;

    // Settings are scoped to (organization, user), so the user must belong to the
    // organization the test PAT authenticates against — there is no sensible default.
    const { identityTestUserId } = getTestConfig();
    if (!identityTestUserId) {
      throw new Error(
        'IDENTITY_TEST_USER_ID is not configured; every Identity operation is user-scoped ' +
          'and the SDK cannot derive the calling user from a PAT.'
      );
    }
    userId = identityTestUserId;

    // Any supported key with a stored value works — the write tests round-trip it and
    // restore the original, so nothing needs to be configured per environment.
    const settings = await identity.getSettings(ALL_KEYS, userId);
    if (settings.length === 0) {
      throw new Error(
        `No supported identity setting has a stored value for user ${userId}; the settings ` +
          'round-trip cannot be verified. Point IDENTITY_TEST_USER_ID at a user who has ' +
          'set at least one of them.'
      );
    }
    originalSettings = settings;
    originalSetting = settings[0];
  });

  afterAll(async () => {
    if (!identity || !originalSettings?.length || !userId) return;
    // Restore from the snapshot — never hardcoded assumed values.
    await identity.updateSettings(
      originalSettings.map((s) => ({ key: s.key, value: s.value })),
      userId,
      originalSettings[0].organizationId
    );
  });

  describe('getSettings', () => {
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
      const result = await identity.getSettings(ALL_KEYS, userId);

      expect(result.length).toBeLessThanOrEqual(ALL_KEYS.length);
      result.forEach((setting) => expect(ALL_KEYS).toContain(setting.key));
    });

    it('should retrieve a single key when only that key is requested', async () => {
      const result = await identity.getSettings([originalSetting.key], userId);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(originalSetting.key);
    });

    it('should retrieve settings when organizationId is passed explicitly', async () => {
      const result = await identity.getSettings([originalSetting.key], userId, {
        organizationId: originalSetting.organizationId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe(originalSetting.organizationId);
      expect(result[0].userId).toBe(originalSetting.userId);
    });
  });

  describe('updateSettings', () => {
    it('should overwrite a setting value and return the stored row', async () => {
      const newValue = `${originalSetting.value}-sdktest`;

      const updated = await identity.updateSettings(
        [{ key: originalSetting.key, value: newValue }],
        userId,
        originalSetting.organizationId
      );

      expect(Array.isArray(updated)).toBe(true);
      const updatedRow = updated.find((s) => s.key === originalSetting.key);
      expect(updatedRow?.value).toBe(newValue);
      expect(typeof updatedRow?.id).toBe('number');

      const afterWrite = await identity.getSettings([originalSetting.key], userId);
      expect(afterWrite.find((s) => s.key === originalSetting.key)?.value).toBe(newValue);

      // Restore immediately so a later failure cannot leave the modified value behind
      await identity.updateSettings(
        [{ key: originalSetting.key, value: originalSetting.value }],
        userId,
        originalSetting.organizationId
      );

      const afterRestore = await identity.getSettings([originalSetting.key], userId);
      expect(afterRestore.find((s) => s.key === originalSetting.key)?.value).toBe(
        originalSetting.value
      );
    });

    it('should upsert every submitted setting in one request', async () => {
      if (originalSettings.length < 2) {
        throw new Error(
          'Test user has fewer than 2 stored identity settings; the bulk write path cannot ' +
            'be verified without creating keys this suite has no way to remove.'
        );
      }

      // Writes each setting's existing value back, so the call is a no-op on the
      // environment while still exercising the multi-item path end to end.
      const batch = originalSettings.map((s) => ({ key: s.key, value: s.value }));

      const updated = await identity.updateSettings(batch, userId, originalSetting.organizationId);

      expect(updated.length).toBe(batch.length);
      batch.forEach(({ key, value }) => {
        expect(updated.find((s) => s.key === key)?.value).toBe(value);
      });
    });

    it('should write against the same user the read returned', async () => {
      const updated = await identity.updateSettings(
        [{ key: originalSetting.key, value: originalSetting.value }],
        userId,
        originalSetting.organizationId
      );

      expect(updated.find((s) => s.key === originalSetting.key)?.userId).toBe(userId);
    });
  });
});
