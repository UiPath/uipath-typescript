import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { Identity } from '../../../../src/services/identity';
import type { IdentitySetting } from '../../../../src/models/identity';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Identity - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let identity!: Identity;
  let settingKey!: string;
  // Snapshot of the key under test, restored in afterAll so the suite leaves the
  // shared environment exactly as it found it.
  let originalSetting!: IdentitySetting;

  beforeAll(async () => {
    const service = getServices().identity;
    if (!service) {
      throw new Error('Identity service is not registered for this init mode');
    }
    identity = service;

    const { identityTestSettingKey } = getTestConfig();
    if (!identityTestSettingKey) {
      throw new Error(
        'IDENTITY_TEST_SETTING_KEY is not configured; the settings round-trip cannot be verified.'
      );
    }
    settingKey = identityTestSettingKey;

    const settings = await identity.getSettings([settingKey]);
    const existing = settings.find((s) => s.key === settingKey);
    if (!existing) {
      throw new Error(
        `Setting "${settingKey}" has no stored value in the test organization; ` +
          'set IDENTITY_TEST_SETTING_KEY to a key that already exists.'
      );
    }
    originalSetting = existing;
  });

  afterAll(async () => {
    if (!identity || !originalSetting) return;
    // Restore from the snapshot — never a hardcoded assumed value.
    await identity.updateSettings([{ key: originalSetting.key, value: originalSetting.value }]);
  });

  describe('getSettings', () => {
    it('should retrieve a setting with its value and scope fields', () => {
      expect(originalSetting.key).toBe(settingKey);
      expect(typeof originalSetting.id).toBe('number');
      expect(typeof originalSetting.value).toBe('string');
      expect(typeof originalSetting.partitionGlobalId).toBe('string');
      expect(typeof originalSetting.userId).toBe('string');
    });

    it('should omit keys that have no stored value', async () => {
      const missingKey = 'UiPathTypeScriptSdk.IntegrationTest.NoSuchKey';

      const result = await identity.getSettings([settingKey, missingKey]);

      expect(result.map((s) => s.key)).toContain(settingKey);
      expect(result.map((s) => s.key)).not.toContain(missingKey);
    });

    it('should retrieve settings when partitionGlobalId and userId are passed explicitly', async () => {
      const result = await identity.getSettings([settingKey], {
        partitionGlobalId: originalSetting.partitionGlobalId,
        userId: originalSetting.userId,
      });

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe(settingKey);
      expect(result[0].partitionGlobalId).toBe(originalSetting.partitionGlobalId);
      expect(result[0].userId).toBe(originalSetting.userId);
    });
  });

  describe('updateSettings', () => {
    it('should overwrite a setting value and read the new value back', async () => {
      const newValue = `${originalSetting.value}-sdktest`;

      const result = await identity.updateSettings([{ key: settingKey, value: newValue }]);
      expect(result.success).toBe(true);
      expect(result.data.settings).toHaveLength(1);

      const afterWrite = await identity.getSettings([settingKey]);
      expect(afterWrite.find((s) => s.key === settingKey)?.value).toBe(newValue);

      // Restore immediately so a later failure cannot leave the modified value behind
      await identity.updateSettings([{ key: settingKey, value: originalSetting.value }]);

      const afterRestore = await identity.getSettings([settingKey]);
      expect(afterRestore.find((s) => s.key === settingKey)?.value).toBe(originalSetting.value);
    });

    it('should accept explicit partitionGlobalId and userId scoping on a write', async () => {
      const result = await identity.updateSettings(
        [{ key: settingKey, value: originalSetting.value }],
        {
          partitionGlobalId: originalSetting.partitionGlobalId,
          userId: originalSetting.userId,
        }
      );

      expect(result.success).toBe(true);

      const settings = await identity.getSettings([settingKey]);
      expect(settings.find((s) => s.key === settingKey)?.value).toBe(originalSetting.value);
    });
  });
});
