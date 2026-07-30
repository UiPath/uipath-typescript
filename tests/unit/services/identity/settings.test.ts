// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IdentitySettingService } from '../../../../src/services/identity/settings';
import { ApiClient } from '../../../../src/core/http/api-client';
import { ValidationError } from '../../../../src/core/errors';
import {
  createBasicIdentitySetting,
  createBasicIdentitySettings,
  IDENTITY_SETTING_TEST_CONSTANTS,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { IDENTITY_SETTING_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import type { IdentitySetting } from '../../../../src/models/identity';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// ===== TEST SUITE =====
describe('IdentitySettingService Unit Tests', () => {
  let identitySettingService: IdentitySettingService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(function () { return mockApiClient as unknown as ApiClient; });

    identitySettingService = new IdentitySettingService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should GET Setting without params when no options supplied', async () => {
      const mockData = createBasicIdentitySettings();
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await identitySettingService.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {});
      expect(result).toEqual(mockData);
    });

    it('should GET Setting with partitionGlobalId param when supplied', async () => {
      const mockData = createBasicIdentitySettings();
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await identitySettingService.getAll({
        partitionGlobalId: IDENTITY_SETTING_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
        params: { partitionGlobalId: IDENTITY_SETTING_TEST_CONSTANTS.PARTITION_GLOBAL_ID },
      });
      expect(result).toEqual(mockData);
    });

    it('should target the organization-level Setting URL with no tenant segment', async () => {
      mockApiClient.get.mockResolvedValue(createBasicIdentitySettings());

      await identitySettingService.getAll();

      // `../` collapses the tenant segment ApiClient inserts — see IDENTITY_API_BASE
      expect(IDENTITY_SETTING_ENDPOINTS.SETTINGS).toBe('../identity_/api/Setting');
      expect(
        new URL(`myorg/mytenant/${IDENTITY_SETTING_ENDPOINTS.SETTINGS}`, 'https://alpha.uipath.com').toString()
      ).toBe('https://alpha.uipath.com/myorg/identity_/api/Setting');
    });

    it('should return settings whose value is null', async () => {
      mockApiClient.get.mockResolvedValue([createBasicIdentitySetting({ value: null })]);

      const result = await identitySettingService.getAll();

      expect(result[0].value).toBeNull();
      expect(result[0].key).toBe(IDENTITY_SETTING_TEST_CONSTANTS.SETTING_KEY);
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(
        createMockError(IDENTITY_SETTING_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(identitySettingService.getAll()).rejects.toThrow(
        IDENTITY_SETTING_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN
      );
    });
  });

  describe('updateSettings', () => {
    it('should PUT Setting with the settings array as the body', async () => {
      const settings: IdentitySetting[] = [createBasicIdentitySetting()];
      mockApiClient.put.mockResolvedValue(undefined);

      const result = await identitySettingService.updateSettings(settings);

      expect(mockApiClient.put).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, settings, {});
      expect(result).toEqual({ success: true, data: { settings } });
    });

    it('should PUT Setting with partitionGlobalId param when supplied', async () => {
      const settings: IdentitySetting[] = createBasicIdentitySettings();
      mockApiClient.put.mockResolvedValue(undefined);

      const result = await identitySettingService.updateSettings(settings, {
        partitionGlobalId: IDENTITY_SETTING_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(IDENTITY_SETTING_ENDPOINTS.SETTINGS, settings, {
        params: { partitionGlobalId: IDENTITY_SETTING_TEST_CONSTANTS.PARTITION_GLOBAL_ID },
      });
      expect(result.success).toBe(true);
      expect(result.data.settings).toHaveLength(2);
    });

    it('should send a null value through to clear a setting', async () => {
      const settings: IdentitySetting[] = [createBasicIdentitySetting({ value: null })];
      mockApiClient.put.mockResolvedValue(undefined);

      await identitySettingService.updateSettings(settings);

      expect(mockApiClient.put).toHaveBeenCalledWith(
        IDENTITY_SETTING_ENDPOINTS.SETTINGS,
        [{ key: IDENTITY_SETTING_TEST_CONSTANTS.SETTING_KEY, value: null }],
        {}
      );
    });

    it('should throw ValidationError when settings is empty and make no request', async () => {
      await expect(identitySettingService.updateSettings([])).rejects.toBeInstanceOf(ValidationError);
      expect(mockApiClient.put).not.toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockApiClient.put.mockRejectedValue(
        createMockError(IDENTITY_SETTING_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN)
      );

      await expect(
        identitySettingService.updateSettings([createBasicIdentitySetting()])
      ).rejects.toThrow(IDENTITY_SETTING_TEST_CONSTANTS.ERROR_SETTING_FORBIDDEN);
    });
  });
});
