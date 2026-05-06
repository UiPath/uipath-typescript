import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getServices, setupUnifiedTests, InitMode } from '../../config/unified-setup';
import { User } from '../../../../src/services/conversational-agent/user';
import type { UserSettingsGetResponse } from '../../../../src/models/conversational-agent';
import { generateRandomString } from '../../utils/helpers';

const modes: InitMode[] = ['v1'];

describe.each(modes)('User Settings - Integration Tests [%s]', (mode) => {
  setupUnifiedTests(mode);

  let user!: User;
  let originalSettings: UserSettingsGetResponse | null = null;

  beforeAll(async () => {
    user = getServices().user!;
    // Snapshot the test user's current settings so we can restore them after the
    // mutating tests run — this keeps the shared test account from drifting.
    originalSettings = await user.getSettings();
  });

  afterAll(async () => {
    if (!originalSettings) return;
    await user.updateSettings({
      name: originalSettings.name,
      email: originalSettings.email,
      role: originalSettings.role,
      department: originalSettings.department,
      company: originalSettings.company,
      country: originalSettings.country,
      timezone: originalSettings.timezone,
    });
  });

  describe('getSettings', () => {
    it('should retrieve current user settings with the expected shape', async () => {
      const settings = await user.getSettings();

      expect(settings).toBeDefined();
      expect(typeof settings.userId).toBe('string');
      expect(settings.userId.length).toBeGreaterThan(0);
      expect(settings.createdTime).toBeDefined();
      expect(settings.updatedTime).toBeDefined();
    });

    it('should return camelCase timestamps (not raw API field names)', async () => {
      const settings = await user.getSettings();

      // Transform pipeline validation: createdAt/updatedAt should not survive
      expect((settings as any).createdAt).toBeUndefined();
      expect((settings as any).updatedAt).toBeUndefined();
    });
  });

  describe('updateSettings', () => {
    it('should update a single field and leave others unchanged', async () => {
      const before = await user.getSettings();
      const testName = `IntegrationTest ${generateRandomString(6)}`;

      const updated = await user.updateSettings({ name: testName });

      expect(updated.name).toBe(testName);
      expect(updated.email).toBe(before.email);
      expect(updated.role).toBe(before.role);
      expect(updated.department).toBe(before.department);
    });

    it('should support partial updates with multiple fields', async () => {
      const testRole = `IntRole_${generateRandomString(4)}`;
      const testTimezone = 'America/New_York';

      const updated = await user.updateSettings({
        role: testRole,
        timezone: testTimezone,
      });

      expect(updated.role).toBe(testRole);
      expect(updated.timezone).toBe(testTimezone);
    });

    it('should clear a field when set to null', async () => {
      const updated = await user.updateSettings({ department: null });

      expect(updated.department).toBeNull();
    });
  });
});
