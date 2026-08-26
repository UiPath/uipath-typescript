// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Imported through the subpath barrel, the way consumers reach it — this also catches a
// barrel that stops re-exporting the class or the enum as runtime values.
import { Platform, PlatformSettingKey } from '../../../../src/services/platform';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicPlatformSetting,
  createBasicPlatformSettings,
  PLATFORM_TEST_CONSTANTS,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { PLATFORM_SETTING_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import type { PlatformSettingUpsert } from '../../../../src/models/platform';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('Platform Service Unit Tests', () => {
  let platformService: Platform;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    platformService = new Platform(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('PlatformSettingKey', () => {
    it('should expose exactly the supported keys with their wire values', () => {
      // Pinned deliberately: only these keys are supported, so adding or renaming a
      // member is a public API change that must be made intentionally.
      expect({ ...PlatformSettingKey }).toEqual({
        UserLanguage: 'UserLanguage.Language',
        UserLanguageDate: 'UserLanguage.Date',
        UserTheme: 'UserTheme.Theme',
        UserAccessibility: 'UserAccessibility.Accessibility',
        UserAlert: 'UserAlert.AlertDuration',
        UserCaseAppOrder: 'UserCase.AppOrderByTenant',
        UserCasePinnedInstancesByTenant: 'UserCase.PinnedInstancesByTenant',
        UserCaseInstancesTableFiltersByTenant: 'UserCase.InstancesTableFiltersByTenant',
      });
    });

    it('should be reachable as a runtime value through the subpath barrel', () => {
      // A barrel using `export type *` would drop the enum and break every documented example
      expect(typeof PlatformSettingKey).toBe('object');
      expect(PlatformSettingKey.UserTheme).toBe('UserTheme.Theme');
      expect(typeof Platform).toBe('function');
    });
  });

  describe('getUserSettings', () => {
    it('should accept every supported key in a single request', async () => {
      const allKeys = Object.values(PlatformSettingKey);
      mockApiClient.get.mockResolvedValue([createBasicPlatformSetting()]);

      await platformService.getUserSettings(allKeys, PLATFORM_TEST_CONSTANTS.USER_ID);

      const spec = mockApiClient.get.mock.calls[0][1] as { params: { key: string[] } };
      expect(spec.params.key).toEqual(allKeys);
      expect(spec.params.key).toHaveLength(8);
    });

    it('should return an empty array when no requested key has a stored value', async () => {
      mockApiClient.get.mockResolvedValue([]);

      const result = await platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY], PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(result).toEqual([]);
    });

    it('should send the enum wire value, not the member name, as the key param', async () => {
      mockApiClient.get.mockResolvedValue([createBasicPlatformSetting()]);

      await platformService.getUserSettings([PlatformSettingKey.UserCaseAppOrder], PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(PLATFORM_SETTING_ENDPOINTS.SETTINGS, {
        params: { key: ['UserCase.AppOrderByTenant'], userId: PLATFORM_TEST_CONSTANTS.USER_ID },
      });
    });

    it('should GET Setting with each key as a repeated key param', async () => {
      mockApiClient.get.mockResolvedValue(createBasicPlatformSettings());

      const result = await platformService.getUserSettings(
        [PLATFORM_TEST_CONSTANTS.SETTING_KEY, PLATFORM_TEST_CONSTANTS.SETTING_KEY_ALT],
        PLATFORM_TEST_CONSTANTS.USER_ID
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(PLATFORM_SETTING_ENDPOINTS.SETTINGS, {
        params: {
          key: [PLATFORM_TEST_CONSTANTS.SETTING_KEY, PLATFORM_TEST_CONSTANTS.SETTING_KEY_ALT],
          userId: PLATFORM_TEST_CONSTANTS.USER_ID,
        },
      });
      expect(result.map((s) => s.key)).toEqual([
        PLATFORM_TEST_CONSTANTS.SETTING_KEY,
        PLATFORM_TEST_CONSTANTS.SETTING_KEY_ALT,
      ]);
    });

    it('should send no organization scope in the query string — the org rides the URL path', async () => {
      mockApiClient.get.mockResolvedValue(createBasicPlatformSettings());

      await platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY], PLATFORM_TEST_CONSTANTS.USER_ID);

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params).not.toHaveProperty('partitionGlobalId');
      expect(spec.params).not.toHaveProperty('organizationId');
    });

    it('should always send userId, so reads are never organization-wide', async () => {
      mockApiClient.get.mockResolvedValue(createBasicPlatformSettings());

      await platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY], PLATFORM_TEST_CONSTANTS.USER_ID);

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.userId).toBe(PLATFORM_TEST_CONSTANTS.USER_ID);
    });

    it('should target the organization-level Setting URL with no tenant segment', async () => {
      mockApiClient.get.mockResolvedValue(createBasicPlatformSettings());

      await platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY], PLATFORM_TEST_CONSTANTS.USER_ID);

      // `../` collapses the tenant segment ApiClient inserts — see IDENTITY_API_BASE
      expect(PLATFORM_SETTING_ENDPOINTS.SETTINGS).toBe('../identity_/api/Setting');
      expect(
        new URL(`popoc/mytenant/${PLATFORM_SETTING_ENDPOINTS.SETTINGS}`, 'https://alpha.uipath.com').toString()
      ).toBe('https://alpha.uipath.com/popoc/identity_/api/Setting');
    });

    it('should return the full setting row including scope fields', async () => {
      mockApiClient.get.mockResolvedValue([createBasicPlatformSetting()]);

      const result = await platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY], PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(result[0].id).toBe(PLATFORM_TEST_CONSTANTS.SETTING_ID);
      expect(result[0].key).toBe(PLATFORM_TEST_CONSTANTS.SETTING_KEY);
      expect(result[0].value).toBe(PLATFORM_TEST_CONSTANTS.SETTING_VALUE);
      expect(result[0].organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(result[0].userId).toBe(PLATFORM_TEST_CONSTANTS.USER_ID);
    });

    it('should rename partitionGlobalId to organizationId and drop the wire field', async () => {
      mockApiClient.get.mockResolvedValue([createBasicPlatformSetting()]);

      const result = await platformService.getUserSettings(
        [PLATFORM_TEST_CONSTANTS.SETTING_KEY],
        PLATFORM_TEST_CONSTANTS.USER_ID
      );

      expect(result[0].organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(result[0]).not.toHaveProperty('partitionGlobalId');
    });

    it('should return a JSON-valued setting as an unparsed string', async () => {
      mockApiClient.get.mockResolvedValue([
        createBasicPlatformSetting({
          key: PLATFORM_TEST_CONSTANTS.SETTING_KEY_JSON,
          value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE_JSON,
        }),
      ]);

      const result = await platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY_JSON], PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(typeof result[0].value).toBe('string');
      expect(JSON.parse(result[0].value)).toHaveProperty('DefaultTenant');
    });

    it('should omit keys that have no stored value, returning fewer rows than requested', async () => {
      // The API leaves unset keys out of the response rather than returning an empty value
      mockApiClient.get.mockResolvedValue([createBasicPlatformSetting()]);

      const result = await platformService.getUserSettings(
        [PLATFORM_TEST_CONSTANTS.SETTING_KEY, PLATFORM_TEST_CONSTANTS.SETTING_KEY_UNSET],
        PLATFORM_TEST_CONSTANTS.USER_ID
      );

      expect(result).toHaveLength(1);
      expect(result.map((s) => s.key)).not.toContain(PLATFORM_TEST_CONSTANTS.SETTING_KEY_UNSET);
    });

    it('should throw ValidationError when keys is empty and make no request', async () => {
      await expect(platformService.getUserSettings([], PLATFORM_TEST_CONSTANTS.USER_ID)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    // Untyped JS consumers can reach this; the guard turns a TypeError into a ValidationError
    it.each([
      ['undefined', undefined as unknown as PlatformSettingKey[]],
      ['null', null as unknown as PlatformSettingKey[]],
    ])('should throw ValidationError when keys is %s and make no request', async (_label, keys) => {
      await expect(
        platformService.getUserSettings(keys, PLATFORM_TEST_CONSTANTS.USER_ID)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is empty and make no request', async () => {
      await expect(
        platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY], '')
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(PLATFORM_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        platformService.getUserSettings([PLATFORM_TEST_CONSTANTS.SETTING_KEY], PLATFORM_TEST_CONSTANTS.USER_ID)
      ).rejects.toThrow(PLATFORM_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });

  describe('updateUserSettings', () => {
    const settings: PlatformSettingUpsert[] = [
      { key: PLATFORM_TEST_CONSTANTS.SETTING_KEY, value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE },
    ];

    it('should PUT Setting with settings and userId in the body', async () => {
      mockApiClient.put.mockResolvedValue([createBasicPlatformSetting()]);

      const result = await platformService.updateUserSettings(settings, PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        PLATFORM_SETTING_ENDPOINTS.SETTINGS,
        { settings, userId: PLATFORM_TEST_CONSTANTS.USER_ID },
        {}
      );
      expect(result[0].key).toBe(PLATFORM_TEST_CONSTANTS.SETTING_KEY);
      expect(result[0].organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
    });

    it('should always send userId in the body, so writes are never organization-wide', async () => {
      mockApiClient.put.mockResolvedValue([createBasicPlatformSetting()]);

      await platformService.updateUserSettings(settings, PLATFORM_TEST_CONSTANTS.USER_ID);

      const body = mockApiClient.put.mock.calls[0][1] as Record<string, unknown>;
      expect(body.userId).toBe(PLATFORM_TEST_CONSTANTS.USER_ID);
      // No organization scope in the body either — the org rides the URL path
      expect(Object.keys(body)).toEqual(['settings', 'userId']);
    });

    it('should send no scope in the query string on a write', async () => {
      mockApiClient.put.mockResolvedValue([createBasicPlatformSetting()]);

      await platformService.updateUserSettings(settings, PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(mockApiClient.put.mock.calls[0][2]).toEqual({});
    });

    it('should return the stored rows from the response, not the submitted payload', async () => {
      // The API echoes back full rows including the generated id
      mockApiClient.put.mockResolvedValue([
        createBasicPlatformSetting({ value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE_ALT }),
      ]);

      const result = await platformService.updateUserSettings(settings, PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(result[0].id).toBe(PLATFORM_TEST_CONSTANTS.SETTING_ID);
      expect(result[0].value).toBe(PLATFORM_TEST_CONSTANTS.SETTING_VALUE_ALT);
      expect(result[0].userId).toBe(PLATFORM_TEST_CONSTANTS.USER_ID);
      // The write response goes through the same rename as a read
      expect(result[0].organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(result[0]).not.toHaveProperty('partitionGlobalId');
    });

    it('should send only the key and value for each submitted setting', async () => {
      mockApiClient.put.mockResolvedValue([createBasicPlatformSetting()]);

      await platformService.updateUserSettings(settings, PLATFORM_TEST_CONSTANTS.USER_ID);

      const body = mockApiClient.put.mock.calls[0][1] as { settings: PlatformSettingUpsert[] };
      expect(Object.keys(body.settings[0])).toEqual(['key', 'value']);
    });

    it('should PUT every submitted setting in one request and return each stored row', async () => {
      const batch: PlatformSettingUpsert[] = [
        { key: PLATFORM_TEST_CONSTANTS.SETTING_KEY, value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE },
        { key: PLATFORM_TEST_CONSTANTS.SETTING_KEY_ALT, value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE_ALT },
        { key: PLATFORM_TEST_CONSTANTS.SETTING_KEY_JSON, value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE_JSON },
      ];
      // One stored row per submitted setting, as the API returns
      mockApiClient.put.mockResolvedValue(
        batch.map(({ key, value }, index) =>
          createBasicPlatformSetting({ id: PLATFORM_TEST_CONSTANTS.SETTING_ID + index, key, value })
        )
      );

      const result = await platformService.updateUserSettings(batch, PLATFORM_TEST_CONSTANTS.USER_ID);

      const body = mockApiClient.put.mock.calls[0][1] as { settings: PlatformSettingUpsert[] };
      expect(body.settings).toEqual(batch);
      expect(result).toHaveLength(batch.length);
      batch.forEach(({ key, value }) => {
        expect(result.find((row) => row.key === key)?.value).toBe(value);
      });
      result.forEach((row) => expect(row.organizationId).toBe(PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID));
    });

    it('should return an empty array when the write response carries no rows', async () => {
      mockApiClient.put.mockResolvedValue([]);

      const result = await platformService.updateUserSettings(settings, PLATFORM_TEST_CONSTANTS.USER_ID);

      expect(result).toEqual([]);
    });

    it('should throw ValidationError when settings is empty and make no request', async () => {
      await expect(
        platformService.updateUserSettings([], PLATFORM_TEST_CONSTANTS.USER_ID)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    // Untyped JS consumers can reach this; the guard turns a TypeError into a ValidationError
    it.each([
      ['undefined', undefined as unknown as PlatformSettingUpsert[]],
      ['null', null as unknown as PlatformSettingUpsert[]],
    ])('should throw ValidationError when settings is %s and make no request', async (_label, submitted) => {
      await expect(
        platformService.updateUserSettings(submitted, PLATFORM_TEST_CONSTANTS.USER_ID)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is empty and make no request', async () => {
      await expect(
        platformService.updateUserSettings(settings, '')
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.put.mockRejectedValue(
        createMockError(PLATFORM_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        platformService.updateUserSettings(settings, PLATFORM_TEST_CONSTANTS.USER_ID)
      ).rejects.toThrow(PLATFORM_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });
});
