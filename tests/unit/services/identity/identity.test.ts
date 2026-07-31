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

      await identityService.getSettings([IdentitySettingKey.UserCaseAppOrder], IDENTITY_TEST_CONSTANTS.USER_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: { key: ['UserCase.AppOrderByTenant'], userId: IDENTITY_TEST_CONSTANTS.USER_ID },
      });
    });

    it('should GET Setting with each key as a repeated key param', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      const result = await identityService.getSettings(
        [IDENTITY_TEST_CONSTANTS.SETTING_KEY, IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT],
        IDENTITY_TEST_CONSTANTS.USER_ID
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: {
          key: [IDENTITY_TEST_CONSTANTS.SETTING_KEY, IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT],
          userId: IDENTITY_TEST_CONSTANTS.USER_ID,
        },
      });
      expect(result.map((s) => s.key)).toEqual([
        IDENTITY_TEST_CONSTANTS.SETTING_KEY,
        IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT,
      ]);
    });

    it('should send organizationId as the wire param partitionGlobalId', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], IDENTITY_TEST_CONSTANTS.USER_ID, {
        organizationId: IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: {
          key: [IDENTITY_TEST_CONSTANTS.SETTING_KEY],
          userId: IDENTITY_TEST_CONSTANTS.USER_ID,
          partitionGlobalId: IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID,
        },
      });
    });

    it('should always send userId, so reads are never organization-scoped', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], IDENTITY_TEST_CONSTANTS.USER_ID);

      const spec = mockApiClient.get.mock.calls[0][1] as { params: Record<string, unknown> };
      expect(spec.params.userId).toBe(IDENTITY_TEST_CONSTANTS.USER_ID);
      expect(spec.params).not.toHaveProperty('partitionGlobalId');
      expect(spec.params).not.toHaveProperty('organizationId');
    });

    it('should target the organization-level Setting URL with no tenant segment', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], IDENTITY_TEST_CONSTANTS.USER_ID);

      // `../` collapses the tenant segment ApiClient inserts — see IDENTITY_API_BASE
      expect(IDENTITY_SETTING_ENDPOINTS.SETTINGS).toBe('../identity_/api/Setting');
      expect(
        new URL(`popoc/mytenant/${IDENTITY_SETTING_ENDPOINTS.SETTINGS}`, 'https://alpha.uipath.com').toString()
      ).toBe('https://alpha.uipath.com/popoc/identity_/api/Setting');
    });

    it('should return the full setting row including scope fields', async () => {
      mockApiClient.get.mockResolvedValue([createBasicIdentitySetting()]);

      const result = await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], IDENTITY_TEST_CONSTANTS.USER_ID);

      expect(result[0].id).toBe(IDENTITY_TEST_CONSTANTS.SETTING_ID);
      expect(result[0].key).toBe(IDENTITY_TEST_CONSTANTS.SETTING_KEY);
      expect(result[0].value).toBe(IDENTITY_TEST_CONSTANTS.SETTING_VALUE);
      expect(result[0].organizationId).toBe(IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(result[0].userId).toBe(IDENTITY_TEST_CONSTANTS.USER_ID);
    });

    it('should rename partitionGlobalId to organizationId and drop the wire field', async () => {
      mockApiClient.get.mockResolvedValue([createBasicIdentitySetting()]);

      const result = await identityService.getSettings(
        [IDENTITY_TEST_CONSTANTS.SETTING_KEY],
        IDENTITY_TEST_CONSTANTS.USER_ID
      );

      expect(result[0].organizationId).toBe(IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(result[0]).not.toHaveProperty('partitionGlobalId');
    });

    it('should return a JSON-valued setting as an unparsed string', async () => {
      mockApiClient.get.mockResolvedValue([
        createBasicIdentitySetting({
          key: IDENTITY_TEST_CONSTANTS.SETTING_KEY_JSON,
          value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE_JSON,
        }),
      ]);

      const result = await identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY_JSON], IDENTITY_TEST_CONSTANTS.USER_ID);

      expect(typeof result[0].value).toBe('string');
      expect(JSON.parse(result[0].value)).toHaveProperty('DefaultTenant');
    });

    it('should omit keys that have no stored value, returning fewer rows than requested', async () => {
      // The API leaves unset keys out of the response rather than returning an empty value
      mockApiClient.get.mockResolvedValue([createBasicIdentitySetting()]);

      const result = await identityService.getSettings(
        [IDENTITY_TEST_CONSTANTS.SETTING_KEY, IDENTITY_TEST_CONSTANTS.SETTING_KEY_UNSET],
        IDENTITY_TEST_CONSTANTS.USER_ID
      );

      expect(result).toHaveLength(1);
      expect(result.map((s) => s.key)).not.toContain(IDENTITY_TEST_CONSTANTS.SETTING_KEY_UNSET);
    });

    it('should throw ValidationError when keys is empty and make no request', async () => {
      await expect(identityService.getSettings([], IDENTITY_TEST_CONSTANTS.USER_ID)).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is empty and make no request', async () => {
      await expect(
        identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], '')
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        identityService.getSettings([IDENTITY_TEST_CONSTANTS.SETTING_KEY], IDENTITY_TEST_CONSTANTS.USER_ID)
      ).rejects.toThrow(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });

  describe('updateSettings', () => {
    const settings: IdentitySettingUpsert[] = [
      { key: IDENTITY_TEST_CONSTANTS.SETTING_KEY, value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE },
    ];

    it('should PUT Setting with settings, the organization as partitionGlobalId, and userId in the body', async () => {
      mockApiClient.put.mockResolvedValue([createBasicIdentitySetting()]);

      const result = await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.USER_ID, IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        IDENTITY_SETTING_ENDPOINTS.SETTINGS,
        { settings, partitionGlobalId: IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID, userId: IDENTITY_TEST_CONSTANTS.USER_ID },
        {}
      );
      expect(result[0].key).toBe(IDENTITY_TEST_CONSTANTS.SETTING_KEY);
      expect(result[0].organizationId).toBe(IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);
    });

    it('should always send userId in the body, so writes are never organization-scoped', async () => {
      mockApiClient.put.mockResolvedValue([createBasicIdentitySetting()]);

      await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.USER_ID, IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);

      const body = mockApiClient.put.mock.calls[0][1] as Record<string, unknown>;
      expect(body.userId).toBe(IDENTITY_TEST_CONSTANTS.USER_ID);
      expect(Object.keys(body)).toEqual(['settings', 'partitionGlobalId', 'userId']);
    });

    it('should send no scope in the query string on a write', async () => {
      mockApiClient.put.mockResolvedValue([createBasicIdentitySetting()]);

      await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.USER_ID, IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);

      expect(mockApiClient.put.mock.calls[0][2]).toEqual({});
    });

    it('should return the stored rows from the response, not the submitted payload', async () => {
      // The API echoes back full rows including the generated id
      mockApiClient.put.mockResolvedValue([
        createBasicIdentitySetting({ value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE_ALT }),
      ]);

      const result = await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.USER_ID, IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);

      expect(result[0].id).toBe(IDENTITY_TEST_CONSTANTS.SETTING_ID);
      expect(result[0].value).toBe(IDENTITY_TEST_CONSTANTS.SETTING_VALUE_ALT);
      expect(result[0].userId).toBe(IDENTITY_TEST_CONSTANTS.USER_ID);
      // The write response goes through the same rename as a read
      expect(result[0].organizationId).toBe(IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);
      expect(result[0]).not.toHaveProperty('partitionGlobalId');
    });

    it('should send only the key and value for each submitted setting', async () => {
      mockApiClient.put.mockResolvedValue([createBasicIdentitySetting()]);

      await identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.USER_ID, IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID);

      const body = mockApiClient.put.mock.calls[0][1] as { settings: IdentitySettingUpsert[] };
      expect(Object.keys(body.settings[0])).toEqual(['key', 'value']);
    });

    it('should throw ValidationError when settings is empty and make no request', async () => {
      await expect(
        identityService.updateSettings([], IDENTITY_TEST_CONSTANTS.USER_ID, IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when userId is empty and make no request', async () => {
      await expect(
        identityService.updateSettings(settings, '', IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID)
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should throw ValidationError when partitionGlobalId is empty and make no request', async () => {
      await expect(
        identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.USER_ID, '')
      ).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.put.mockRejectedValue(
        createMockError(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        identityService.updateSettings(settings, IDENTITY_TEST_CONSTANTS.USER_ID, IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID)
      ).rejects.toThrow(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });
});
