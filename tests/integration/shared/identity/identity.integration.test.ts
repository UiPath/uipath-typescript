import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Identity } from '../../../../src/services/identity';
import { IdentitySettingKey, type IdentitySetting } from '../../../../src/models/identity';

const modes: InitMode[] = ['v1'];

const ALL_KEYS = Object.values(IdentitySettingKey);

describe.each(modes)('Identity - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let identity!: Identity;
  // Snapshot of the key under test, restored in afterAll so the suite leaves the
  // shared environment exactly as it found it.
  let originalSetting!: IdentitySetting;

  beforeAll(async () => {
    const service = getServices().identity;
    if (!service) {
      throw new Error('Identity service is not registered for this init mode');
    }
    identity = service;

    // Any supported key with a stored value works — the write tests round-trip it and
    // restore the original, so nothing needs to be configured per environment.
    const settings = await identity.getSettings(ALL_KEYS);
    if (settings.length === 0) {
      throw new Error(
        `None of the supported identity settings (${ALL_KEYS.join(', ')}) have a stored ` +
          'value for the test user; the settings round-trip cannot be verified.'
      );
    }
    originalSetting = settings[0];
  });

  afterAll(async () => {
    if (!identity || !originalSetting) return;
    // Restore from the snapshot — never a hardcoded assumed value.
    await identity.updateSettings(
      [{ key: originalSetting.key, value: originalSetting.value }],
      originalSetting.partitionGlobalId
    );
  });

  describe('getSettings', () => {
    it('should retrieve a setting with its value and scope fields', () => {
      expect(ALL_KEYS).toContain(originalSetting.key);
      expect(typeof originalSetting.id).toBe('number');
      expect(typeof originalSetting.value).toBe('string');
      expect(typeof originalSetting.partitionGlobalId).toBe('string');
      expect(typeof originalSetting.userId).toBe('string');
    });

    it('should return no more rows than the number of keys requested', async () => {
      // Keys with nothing stored are omitted rather than returned with an empty value
      const result = await identity.getSettings(ALL_KEYS);

      expect(result.length).toBeLessThanOrEqual(ALL_KEYS.length);
      result.forEach((setting) => expect(ALL_KEYS).toContain(setting.key));
    });

    it('should retrieve a single key when only that key is requested', async () => {
      const result = await identity.getSettings([originalSetting.key]);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(originalSetting.key);
    });

    it('should retrieve settings when partitionGlobalId and userId are passed explicitly', async () => {
      const result = await identity.getSettings([originalSetting.key], {
        partitionGlobalId: originalSetting.partitionGlobalId,
        userId: originalSetting.userId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].partitionGlobalId).toBe(originalSetting.partitionGlobalId);
      expect(result[0].userId).toBe(originalSetting.userId);
    });
  });

  describe('updateSettings', () => {
    it('should overwrite a setting value and return the stored row', async () => {
      const newValue = `${originalSetting.value}-sdktest`;

      const updated = await identity.updateSettings(
        [{ key: originalSetting.key, value: newValue }],
        originalSetting.partitionGlobalId
      );

      expect(Array.isArray(updated)).toBe(true);
      const updatedRow = updated.find((s) => s.key === originalSetting.key);
      expect(updatedRow?.value).toBe(newValue);
      expect(typeof updatedRow?.id).toBe('number');

      const afterWrite = await identity.getSettings([originalSetting.key]);
      expect(afterWrite.find((s) => s.key === originalSetting.key)?.value).toBe(newValue);

      // Restore immediately so a later failure cannot leave the modified value behind
      await identity.updateSettings(
        [{ key: originalSetting.key, value: originalSetting.value }],
        originalSetting.partitionGlobalId
      );

      const afterRestore = await identity.getSettings([originalSetting.key]);
      expect(afterRestore.find((s) => s.key === originalSetting.key)?.value).toBe(
        originalSetting.value
      );
    });

    it('should accept explicit userId scoping on a write', async () => {
      const updated = await identity.updateSettings(
        [{ key: originalSetting.key, value: originalSetting.value }],
        originalSetting.partitionGlobalId,
        { userId: originalSetting.userId }
      );

      expect(updated.find((s) => s.key === originalSetting.key)?.userId).toBe(
        originalSetting.userId
      );
    });
  });
});
