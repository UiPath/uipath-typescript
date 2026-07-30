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

  describe('getSettings', () => {
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
    it('should PUT Setting with the settings array as the body', async () => {
      const settings: IdentitySettingUpsert[] = [
        { key: IDENTITY_TEST_CONSTANTS.SETTING_KEY, value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE },
      ];
      mockApiClient.put.mockResolvedValue(undefined);

      const result = await identityService.updateSettings(settings);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        IDENTITY_SETTING_ENDPOINTS.SETTINGS,
        settings,
        { params: {} }
      );
      expect(result).toEqual({ success: true, data: { settings } });
    });

    it('should PUT Setting with partitionGlobalId and userId params when supplied', async () => {
      const settings: IdentitySettingUpsert[] = [
        { key: IDENTITY_TEST_CONSTANTS.SETTING_KEY, value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE },
        { key: IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT, value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE_ALT },
      ];
      mockApiClient.put.mockResolvedValue(undefined);

      const result = await identityService.updateSettings(settings, {
        partitionGlobalId: IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
        userId: IDENTITY_TEST_CONSTANTS.USER_ID,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        IDENTITY_SETTING_ENDPOINTS.SETTINGS,
        settings,
        {
          params: {
            partitionGlobalId: IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
            userId: IDENTITY_TEST_CONSTANTS.USER_ID,
          },
        }
      );
      expect(result.success).toBe(true);
      expect(result.data.settings).toHaveLength(2);
    });

    it('should send only the key and value for each setting, not the read-only row fields', async () => {
      const settings: IdentitySettingUpsert[] = [
        { key: IDENTITY_TEST_CONSTANTS.SETTING_KEY, value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE },
      ];
      mockApiClient.put.mockResolvedValue(undefined);

      await identityService.updateSettings(settings);

      const body = mockApiClient.put.mock.calls[0][1] as IdentitySettingUpsert[];
      expect(Object.keys(body[0])).toEqual(['key', 'value']);
    });

    it('should throw ValidationError when settings is empty and make no request', async () => {
      await expect(identityService.updateSettings([])).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.put.mockRejectedValue(
        createMockError(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        identityService.updateSettings([
          { key: IDENTITY_TEST_CONSTANTS.SETTING_KEY, value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE },
        ])
      ).rejects.toThrow(IDENTITY_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });
});
