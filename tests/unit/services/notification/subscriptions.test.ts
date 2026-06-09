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
import {
  NotificationCategory,
  NotificationMode,
  type CategorySubscriptionUpdate,
  type PublisherSubscriptionUpdate,
  type TopicGroupSubscriptionUpdate,
  type TopicSubscriptionUpdate,
} from '../../../../src/models/notification';

// ===== MOCKING =====
vi.mock('../../../../src/core/http/api-client');

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
    it('should GET UserSubscription without params when no publishers filter', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith(SUBSCRIPTION_ENDPOINTS.GET_ALL, {});
      expect(result).toEqual(mockData);
    });

    it('should GET UserSubscription with Publishers param when filter supplied', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getAll({
        publishers: [NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME, NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME_ALT],
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.GET_ALL,
        {
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

      await expect(subscriptionService.getAll()).rejects.toThrow(
        NOTIFICATION_TEST_CONSTANTS.ERROR_PUBLISHER_NOT_FOUND
      );
    });
  });

  describe('getPublishers', () => {
    it('should GET GetPublishers without params when no name filter', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getPublishers();

      expect(mockApiClient.get).toHaveBeenCalledWith(SUBSCRIPTION_ENDPOINTS.GET_PUBLISHERS, {});
      expect(result).toEqual(mockData);
    });

    it('should GET GetPublishers with PublisherName param when name supplied', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.get.mockResolvedValue(mockData);

      await subscriptionService.getPublishers({ name: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.GET_PUBLISHERS,
        { params: { PublisherName: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME } }
      );
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(subscriptionService.getPublishers()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getSupportedChannels', () => {
    it('should GET GetSupportedChannelStatus and return channels (InApp not included)', async () => {
      const mockData = { channels: createBasicSupportedChannels() };
      mockApiClient.get.mockResolvedValue(mockData);

      const result = await subscriptionService.getSupportedChannels();

      expect(mockApiClient.get).toHaveBeenCalledWith(SUBSCRIPTION_ENDPOINTS.GET_SUPPORTED_CHANNELS, {});
      expect(result).toEqual(mockData);
      // Confirms InApp is intentionally omitted (it's always implicit)
      expect(result.channels.length).toBeGreaterThan(0);
      expect(result.channels.map(c => c.name)).not.toContain('InApp');
    });

    it('should propagate errors', async () => {
      mockApiClient.get.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(subscriptionService.getSupportedChannels()).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateTopic', () => {
    it('should POST userSubscriptions and echo input', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const subscriptions: TopicSubscriptionUpdate[] = [
        {
          topicId: NOTIFICATION_TEST_CONSTANTS.TOPIC_ID,
          isSubscribed: false,
          notificationMode: NotificationMode.Email,
        },
      ];

      const result = await subscriptionService.updateTopic(subscriptions);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.UPDATE_TOPIC,
        { userSubscriptions: subscriptions },
        expect.any(Object)
      );
      expect(result).toEqual({ success: true, data: { subscriptions } });
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(NOTIFICATION_TEST_CONSTANTS.ERROR_SUBSCRIPTION_INVALID));

      await expect(
        subscriptionService.updateTopic([
          {
            topicId: NOTIFICATION_TEST_CONSTANTS.TOPIC_ID,
            isSubscribed: true,
            notificationMode: NotificationMode.InApp,
          },
        ])
      ).rejects.toThrow(NOTIFICATION_TEST_CONSTANTS.ERROR_SUBSCRIPTION_INVALID);
    });
  });

  describe('updateCategory', () => {
    it('should POST categorySubscriptions and echo input', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const subscriptions: CategorySubscriptionUpdate[] = [
        {
          publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
          category: NotificationCategory.Error,
          isSubscribed: false,
          notificationMode: NotificationMode.Email,
        },
      ];

      const result = await subscriptionService.updateCategory(subscriptions);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.UPDATE_CATEGORY,
        { categorySubscriptions: subscriptions },
        expect.any(Object)
      );
      expect(result).toEqual({ success: true, data: { subscriptions } });
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        subscriptionService.updateCategory([
          {
            publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
            category: NotificationCategory.Info,
            isSubscribed: true,
            notificationMode: NotificationMode.InApp,
          },
        ])
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updatePublisher', () => {
    it('should POST publisherSubscriptions with API-spelling publisherID, echoing clean input', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const subscriptions: PublisherSubscriptionUpdate[] = [
        { publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID, isUserOptIn: false },
      ];

      const result = await subscriptionService.updatePublisher(subscriptions);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.UPDATE_PUBLISHER,
        {
          publisherSubscriptions: [
            {
              publisherID: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
              isUserOptIn: false,
              entities: undefined,
            },
          ],
        },
        expect.any(Object)
      );
      // Result echoes the SDK-shape input (publisherId, not publisherID)
      expect(result).toEqual({ success: true, data: { subscriptions } });
    });

    it('should preserve entities scoping in the request body', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const subscriptions: PublisherSubscriptionUpdate[] = [
        {
          publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
          isUserOptIn: true,
          entities: [{ id: 'folder-1', type: 'Folder', isSubscribed: true }],
        },
      ];

      await subscriptionService.updatePublisher(subscriptions);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.UPDATE_PUBLISHER,
        {
          publisherSubscriptions: [
            {
              publisherID: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
              isUserOptIn: true,
              entities: [{ id: 'folder-1', type: 'Folder', isSubscribed: true }],
            },
          ],
        },
        expect.any(Object)
      );
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        subscriptionService.updatePublisher([
          { publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID, isUserOptIn: true },
        ])
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateTopicGroup', () => {
    it('should POST topicGroupSubscriptions and echo input', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const subscriptions: TopicGroupSubscriptionUpdate[] = [
        {
          publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
          topicGroupName: 'JobNotifications',
        },
      ];

      const result = await subscriptionService.updateTopicGroup(subscriptions);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.UPDATE_TOPIC_GROUP,
        { topicGroupSubscriptions: subscriptions },
        expect.any(Object)
      );
      expect(result).toEqual({ success: true, data: { subscriptions } });
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        subscriptionService.updateTopicGroup([
          {
            publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
            topicGroupName: 'JobNotifications',
          },
        ])
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('updateMode', () => {
    it('should POST publisherId + publisherMode and echo input', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const mode = { name: NotificationMode.Email, isActive: true };

      const result = await subscriptionService.updateMode(
        NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
        mode
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.UPDATE_MODE,
        { publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID, publisherMode: mode },
        expect.any(Object)
      );
      expect(result).toEqual({
        success: true,
        data: { publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID, mode },
      });
    });

    it('should support deactivating a mode', async () => {
      mockApiClient.post.mockResolvedValue(undefined);
      const mode = { name: NotificationMode.Slack, isActive: false };

      await subscriptionService.updateMode(NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID, mode);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.UPDATE_MODE,
        { publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID, publisherMode: mode },
        expect.any(Object)
      );
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(TEST_CONSTANTS.ERROR_MESSAGE));

      await expect(
        subscriptionService.updateMode(NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID, {
          name: NotificationMode.InApp,
          isActive: true,
        })
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('reset', () => {
    it('should POST publisherId and return the publisher subscription state', async () => {
      const mockData = { publishers: [createBasicSubscriptionPublisher()] };
      mockApiClient.post.mockResolvedValue(mockData);

      const result = await subscriptionService.reset(NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        SUBSCRIPTION_ENDPOINTS.RESET,
        { publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID },
        expect.any(Object)
      );
      expect(result).toEqual(mockData);
    });

    it('should propagate errors', async () => {
      mockApiClient.post.mockRejectedValue(createMockError(NOTIFICATION_TEST_CONSTANTS.ERROR_PUBLISHER_NOT_FOUND));

      await expect(
        subscriptionService.reset(NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID)
      ).rejects.toThrow(NOTIFICATION_TEST_CONSTANTS.ERROR_PUBLISHER_NOT_FOUND);
    });
  });
});
