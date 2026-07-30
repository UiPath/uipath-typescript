import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, getTestConfig, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { IdentitySettings } from '../../../../src/services/identity';
import { generateRandomString } from '../../utils/helpers';
import type { IdentitySetting } from '../../../../src/models/identity';

const modes: InitMode[] = ['v1'];

describe.each(modes)('Identity Settings - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let identitySettings!: IdentitySettings;
  let existingSettings!: IdentitySetting[];

  // Writes target an SDK-specific key rather than a real identity setting, so a failed
  // run cannot leave the shared test organization misconfigured.
  const testSettingKey = `UiPathTypeScriptSdk.IntegrationTest.${generateRandomString()}`;
  const testSettingValue = generateRandomString();

  beforeAll(async () => {
    const service = getServices().identitySettings;
    if (!service) {
      throw new Error('Identity Settings service is not registered for this init mode');
    }
    identitySettings = service;

    existingSettings = await identitySettings.getAll();
  });

  afterAll(async () => {
    if (!identitySettings) return;
    // No external DELETE endpoint exists; clearing the value is the documented way to
    // retire a setting written by this suite.
    await identitySettings.updateSettings([{ key: testSettingKey, value: null }]);
  });

  describe('getAll', () => {
    it('should retrieve the organization settings as a flat key/value list', () => {
      expect(Array.isArray(existingSettings)).toBe(true);

      if (existingSettings.length === 0) {
        throw new Error(
          'Test organization has no identity settings; getAll response shape cannot be verified.'
        );
      }

      const setting = existingSettings[0];
      expect(typeof setting.key).toBe('string');
      expect(setting.key.length).toBeGreaterThan(0);
      // Values are transported as strings; null means "stored with no value".
      expect(setting.value === null || typeof setting.value === 'string').toBe(true);
    });

    it('should retrieve settings when partitionGlobalId is passed explicitly', async () => {
      const { identityTestPartitionGlobalId } = getTestConfig();
      if (!identityTestPartitionGlobalId) {
        throw new Error(
          'IDENTITY_TEST_PARTITION_GLOBAL_ID is not configured; explicit partition scoping cannot be verified.'
        );
      }

      const result = await identitySettings.getAll({
        partitionGlobalId: identityTestPartitionGlobalId,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('updateSettings', () => {
    it('should create a setting that did not previously exist', async () => {
      const result = await identitySettings.updateSettings([
        { key: testSettingKey, value: testSettingValue },
      ]);

      expect(result.success).toBe(true);
      expect(result.data.settings).toHaveLength(1);

      const settings = await identitySettings.getAll();
      const created = settings.find((s) => s.key === testSettingKey);
      expect(created).toBeDefined();
      expect(created?.value).toBe(testSettingValue);
    });

    it('should overwrite the value of an existing setting', async () => {
      const updatedValue = generateRandomString();

      await identitySettings.updateSettings([{ key: testSettingKey, value: updatedValue }]);

      const settings = await identitySettings.getAll();
      expect(settings.find((s) => s.key === testSettingKey)?.value).toBe(updatedValue);
    });

    it('should leave keys absent from the request untouched', async () => {
      const untouched = existingSettings[0];

      await identitySettings.updateSettings([{ key: testSettingKey, value: generateRandomString() }]);

      const settings = await identitySettings.getAll();
      expect(settings.find((s) => s.key === untouched.key)?.value).toBe(untouched.value);
    });

    it('should upsert multiple settings in a single request', async () => {
      const secondKey = `${testSettingKey}.Secondary`;
      const firstValue = generateRandomString();
      const secondValue = generateRandomString();

      const result = await identitySettings.updateSettings([
        { key: testSettingKey, value: firstValue },
        { key: secondKey, value: secondValue },
      ]);

      expect(result.data.settings).toHaveLength(2);

      const settings = await identitySettings.getAll();
      expect(settings.find((s) => s.key === testSettingKey)?.value).toBe(firstValue);
      expect(settings.find((s) => s.key === secondKey)?.value).toBe(secondValue);

      await identitySettings.updateSettings([{ key: secondKey, value: null }]);
    });
  });
});
