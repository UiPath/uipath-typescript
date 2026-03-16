// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserService } from '@/services/conversational-agent/user/user';
import { ApiClient } from '@/core/http/api-client';
import {
  createMockError,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
  TEST_CONSTANTS,
} from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import { USER_ENDPOINTS } from '@/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST CONSTANTS =====
const MOCK_USER_SETTINGS = {
  userId: 'user-uuid-123',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Developer',
  department: 'Engineering',
  company: 'UiPath',
  country: 'US',
  timezone: 'America/New_York',
  // Raw API field names
  createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
  updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
};

// ===== TEST SUITE =====
describe('UserService Unit Tests', () => {
  let userService: UserService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    userService = new UserService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should get user settings successfully', async () => {
      mockApiClient.get.mockResolvedValue(MOCK_USER_SETTINGS);

      const result = await userService.getSettings();

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-uuid-123');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.role).toBe('Developer');
      expect(result.department).toBe('Engineering');
      expect(result.company).toBe('UiPath');
      expect(result.country).toBe('US');
      expect(result.timezone).toBe('America/New_York');

      // Verify the correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        USER_ENDPOINTS.SETTINGS,
        expect.any(Object)
      );
    });

    it('should transform createdAt -> createdTime and updatedAt -> updatedTime', async () => {
      mockApiClient.get.mockResolvedValue(MOCK_USER_SETTINGS);

      const result = await userService.getSettings();

      // Field transformations via UserSettingsMap (CommonFieldMap)
      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);

      // Original API field names should be removed
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should handle null fields in response', async () => {
      const settingsWithNulls = {
        ...MOCK_USER_SETTINGS,
        name: null,
        email: null,
        role: null,
        department: null,
        company: null,
        country: null,
        timezone: null,
      };
      mockApiClient.get.mockResolvedValue(settingsWithNulls);

      const result = await userService.getSettings();

      expect(result.name).toBeNull();
      expect(result.email).toBeNull();
      expect(result.role).toBeNull();
      expect(result.department).toBeNull();
      expect(result.company).toBeNull();
      expect(result.country).toBeNull();
      expect(result.timezone).toBeNull();
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(userService.getSettings()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateSettings', () => {
    it('should update user settings successfully', async () => {
      const updatedSettings = {
        ...MOCK_USER_SETTINGS,
        name: 'Jane Doe',
        timezone: 'Europe/London',
      };
      mockApiClient.patch.mockResolvedValue(updatedSettings);

      const result = await userService.updateSettings({
        name: 'Jane Doe',
        timezone: 'Europe/London',
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('Jane Doe');
      expect(result.timezone).toBe('Europe/London');

      // Verify the correct endpoint and payload
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        USER_ENDPOINTS.SETTINGS,
        { name: 'Jane Doe', timezone: 'Europe/London' },
        expect.any(Object)
      );
    });

    it('should transform fields in update response', async () => {
      mockApiClient.patch.mockResolvedValue(MOCK_USER_SETTINGS);

      const result = await userService.updateSettings({ name: 'test' });

      expect(result.createdTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT);
      expect(result.updatedTime).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT);
      expect((result as any).createdAt).toBeUndefined();
      expect((result as any).updatedAt).toBeUndefined();
    });

    it('should support partial updates', async () => {
      mockApiClient.patch.mockResolvedValue({
        ...MOCK_USER_SETTINGS,
        email: 'newemail@example.com',
      });

      const result = await userService.updateSettings({ email: 'newemail@example.com' });

      expect(result.email).toBe('newemail@example.com');
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        USER_ENDPOINTS.SETTINGS,
        { email: 'newemail@example.com' },
        expect.any(Object)
      );
    });

    it('should support clearing fields by setting to null', async () => {
      mockApiClient.patch.mockResolvedValue({
        ...MOCK_USER_SETTINGS,
        role: null,
        department: null,
      });

      const result = await userService.updateSettings({
        role: null,
        department: null,
      });

      expect(result.role).toBeNull();
      expect(result.department).toBeNull();
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        USER_ENDPOINTS.SETTINGS,
        { role: null, department: null },
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.patch.mockRejectedValue(error);

      await expect(
        userService.updateSettings({ name: 'test' })
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
