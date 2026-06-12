// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SubscriptionService } from '../../../../src/services/notification/subscriptions';
import { ApiClient } from '../../../../src/core/http/api-client';
import {
  createBasicSubscriptionPublisher,
  createBasicSupportedChannels,
  NOTIFICATION_TEST_CONSTANTS,
  TEST_CONSTANTS,
  createMockError,
} from '../../../utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '../../../utils/setup';
import { SUBSCRIPTION_ENDPOINTS } from '../../../../src/utils/constants/endpoints';
import { TENANT_ID } from '../../../../src/utils/constants/headers';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

// Shorthand for asserting the tenant header is forwarded on each call
const TENANT_HEADER = { [TENANT_ID]: NOTIFICATION_TEST_CONSTANTS.TENANT_ID };

// ===== TEST SUITE =====
describe('SubscriptionService Unit Tests', () => {
  let subscriptionService: SubscriptionService;
  let mockApiClient: ReturnType<typeof createMockApiClient>;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();
    vi.mocked(ApiClient).mockImplementation(() => mockApiClient as unknown as ApiClient);

    subscriptionService = new SubscriptionService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should GET UserSubscription with only tenant header when no publishers filter', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(SUBSCRIPTION_ENDPOINTS.GET_ALL, {
        headers: TENANT_HEADER,
      });
      expect(result).toEqual(mockData);
    });

    it('should GET UserSubscription with Publishers param + tenant header when filter supplied', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID, {
        publishers: [NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME, NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME_ALT],
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.GET_ALL,
        {
          headers: TENANT_HEADER,
          params: {
            Publishers: [
              NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME,
              NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME_ALT,
            ],
          },
        }
      );
      expect(result).toEqual(mockData);
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(NOTIFICATION_TEST_CONSTANTS.ERROR_PUBLISHER_NOT_FOUND));

      await expect(
        subscriptionService.getAll(NOTIFICATION_TEST_CONSTANTS.TENANT_ID)
      ).rejects.toThrow(NOTIFICATION_TEST_CONSTANTS.ERROR_PUBLISHER_NOT_FOUND);
    });
  });

  describe('getPublishers', () => {
    it('should GET GetPublishers with only tenant header when no name filter', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getPublishers(NOTIFICATION_TEST_CONSTANTS.TENANT_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(SUBSCRIPTION_ENDPOINTS.GET_PUBLISHERS, {
        headers: TENANT_HEADER,
      });
      expect(result).toEqual(mockData);
    });

    it('should GET GetPublishers with PublisherName param + tenant header when name supplied', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      await subscriptionService.getPublishers(NOTIFICATION_TEST_CONSTANTS.TENANT_ID, {
        name: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.GET_PUBLISHERS,
        { headers: TENANT_HEADER, params: { PublisherName: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME } }
      );
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        subscriptionService.getPublishers(NOTIFICATION_TEST_CONSTANTS.TENANT_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getSupportedChannels', () => {
    it('should GET GetSupportedChannelStatus with tenant header and return channels (InApp not included)', async () => {
      const mockData = { channels: createBasicSupportedChannels() };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getSupportedChannels(NOTIFICATION_TEST_CONSTANTS.TENANT_ID);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.GET_SUPPORTED_CHANNELS,
        { headers: TENANT_HEADER }
      );
      expect(result).toEqual(mockData);
      // Confirms InApp is intentionally omitted (it's always implicit)
      expect(result.channels.length).toBeGreaterThan(0);
      expect(result.channels.map(c => c.name)).not.toContain('InApp');
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        subscriptionService.getSupportedChannels(NOTIFICATION_TEST_CONSTANTS.TENANT_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
