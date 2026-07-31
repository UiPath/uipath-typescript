// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdentityService } from '../../../../src/services/identity/identity';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicIdentitySetting,
  createBasicIdentitySettings,
  IDENTITY_TEST_CONSTANTS,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { IDENTITY_SETTING_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import type { IdentitySettingUpsert } from '../../../../src/models/identity';
import { IdentitySettingKey } from '../../../../src/models/identity';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('IdentityService Unit Tests', () => {
  let identityService: IdentityService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    identityService = new IdentityService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('IdentitySettingKey', () => {
    it('should expose exactly the supported keys with their wire values', () => {
      // Pinned deliberately: only these keys are supported, so adding or renaming a
      // member is a public API change that must be made intentionally.
      expect({ ...IdentitySettingKey }).toEqual({
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
  });

  describe('getSettings', () => {
    it('should send the enum wire value, not the member name, as the key param', async () => {
      mockApiClient.get.mockResolvedValue([createBasicIdentitySetting()]);

      await identityService.getSettings([IdentitySettingKey.UserCaseAppOrder]);

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: { key: ['UserCase.AppOrderByTenant'] },
      });
    });

    it('should GET Setting with each key as a repeated key param', async () => {
      const mockData = createBasicIdentitySettings();
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await identityService.getSettings([
        IDENTITY_TEST_CONSTANTS.SETTING_KEY,
        IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT,
      ]);

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: {
          key: [IDENTITY_TEST_CONSTANTS.SETTING_KEY, IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT],
        },
      });
      expect(result).toEqual(mockData);
    });

    it('should GET Setting with partitionGlobalId and userId params when supplied', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], {
        partitionGlobalId: IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
        userId: IDENTITY_TEST_CONSTANTS.USER_ID,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: {
          key: [IDENTITY_TEST_CONSTANTS.SETTING_KEY],
          partitionGlobalId: IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
          userId: IDENTITY_TEST_CONSTANTS.USER_ID,
        },
      });
    });

    it('should send only the scope params that were supplied', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], {
        userId: IDENTITY_TEST_CONSTANTS.USER_ID,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: {
          key: [IDENTITY_TEST_CONSTANTS.SETTING_KEY],
          userId: IDENTITY_TEST_CONSTANTS.USER_ID,
        },
      });
    });

    it('should target the organization-level Setting URL with no tenant segment', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY]);

      // `../` collapses the tenant segment ApiClient inserts — see IDENTITY_API_BASE
      expect(IDENTITY_SETTING_ENDPOINTS.SETTINGS).toBe('../identity_/api/Setting');
      expect(
        new URL(`popoc/mytenant/${IDENTITY_SETTING_ENDPOINTS.SETTINGS}`, 'https://alpha.uipath.com').toString()
      ).toBe('https://alpha.uipath.com/popoc/identity_/api/Setting');
    });

    it('should return the full setting row including scope fields', async () => {
      mockApiClient.get.mockResolvedValue([createBasicIdentitySetting()]);

      const result = await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY]);

      expect(result[0].id).toBe(IDENTITY_TEST_CONSTANTS.SETTING_ID);
      expect(result[0].key).toBe(IDENTITY_TEST_CONSTANTS.SETTING_KEY);
      expect(result[0].value).toBe(IDENTITY_TEST_CONSTANTS.SETTING_VALUE);
      expect(result[0].partitionGlobalId).toBe(IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID);
      expect(result[0].userId).toBe(IDENTITY_TEST_CONSTANTS.USER_ID);
    });

    it('should return a JSON-valued setting as an unparsed string', async () => {
      mockApiClient.get.mockResolvedValue([
        createBasicIdentitySetting({
          key: IDENTITY_TEST_CONSTANTS.SETTING_KEY_JSON,
          value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE_JSON,
        }),
      ]);

      const result = await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY_JSON]);

      expect(typeof result[0].value).toBe('string');
      expect(JSON.parse(result[0].value)).toHaveProperty('DefaultTenant');
    });

    it('should omit keys that have no stored value, returning fewer rows than requested', async () => {
      // The API leaves unset keys out of the response rather than returning an empty value
      mockApiClient.get.mockResolvedValue([createBasicIdentitySetting()]);

      const result = await identityService.getSettings([
        IDENTITY_TEST_CONSTANTS.SETTING_KEY,
        IDENTITY_TEST_CONSTANTS.SETTING_KEY_UNSET,
      ]);

      expect(result).toHaveLength(1);
      expect(result.map((s) => s.key)).not.toContain(IDENTITY_TEST_CONSTANTS.SETTING_KEY_UNSET);
    });

    it('should throw ValidationError when keys is empty and make no request', async () => {
      await expect(identityService.getSettings([])).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY])
      ).rejects.toThrow(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });

  describe('updateSettings', () => {
    const settings: IdentitySettingUpsert[] = [
      { key: IDENTITY_TEST_CONSTANTS.SETTING_KEY, value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE },
    ];

    it('should PUT Setting with settings and partitionGlobalId in the body, not the query string', async () => {
      const updated = [createBasicIdentitySetting()];
      mockApiClient.put.mockResolvedValue(updated);

      const result = await identityService.updateSettings(
        settings,
        IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID
      );

      expect(mockApiClient.put).toHaveBeenCalledWith(
        IDENTITY_SETTING_ENDPOINTS.SETTINGS,
        { settings, partitionGlobalId: IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID },
        {}
      );
      expect(result).toEqual(updated);
    });

    it('should include userId in the body when supplied', async () => {
      mockApiClient.put.mockResolvedValue([createBasicIdentitySetting()]);

      await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID, {
        userId: IDENTITY_TEST_CONSTANTS.USER_ID,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        IDENTITY_SETTING_ENDPOINTS.SETTINGS,
        {
          settings,
          partitionGlobalId: IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
          userId: IDENTITY_TEST_CONSTANTS.USER_ID,
        },
        {}
      );
    });

    it('should omit userId from the body when not supplied', async () => {
      mockApiClient.put.mockResolvedValue([createBasicIdentitySetting()]);

      await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID);

      const body = mockApiClient.put.mock.calls[0][1] as Record<string, unknown>;
      expect(Object.keys(body)).toEqual(['settings', 'partitionGlobalId']);
    });

    it('should return the stored rows from the response, not the submitted payload', async () => {
      // The API echoes back full rows including the generated id
      mockApiClient.put.mockResolvedValue([
        createBasicIdentitySetting({ value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE_ALT }),
      ]);

      const result = await identityService.updateSettings(
        settings,
        IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID
      );

      expect(result[0].id).toBe(IDENTITY_TEST_CONSTANTS.SETTING_ID);
      expect(result[0].value).toBe(IDENTITY_TEST_CONSTANTS.SETTING_VALUE_ALT);
      expect(result[0].userId).toBe(IDENTITY_TEST_CONSTANTS.USER_ID);
    });

    it('should send only the key and value for each submitted setting', async () => {
      mockApiClient.put.mockResolvedValue([createBasicIdentitySetting()]);

      await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID);

      const body = mockApiClient.put.mock.calls[0][1] as { settings: IdentitySettingUpsert[] };
      expect(Object.keys(body.settings[0])).toEqual(['key', 'value']);
    });

    it('should throw ValidationError when settings is empty and make no request', async () => {
      await expect(
        identityService.updateSettings([], IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when partitionGlobalId is empty and make no request', async () => {
      await expect(identityService.updateSettings(settings, '')).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.put.mockRejectedValue(
        createMockError(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID)
      ).rejects.toThrow(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });
});
