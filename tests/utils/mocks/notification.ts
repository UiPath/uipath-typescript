/**
 * Notification & Subscription mock factories.
 *
 * Shapes mirror the real API responses captured live during onboarding (NOT the
 * Swagger spec, which omits some nullable behaviour).
 */

import {
  NotificationCategory,
  NotificationMode,
  NotificationPriority,
} from '../../../src/models/notification';
import type {
  SubscriptionMode,
  SubscriptionPublisher,
  SubscriptionTopic,
  SupportedChannel,
} from '../../../src/models/notification/subscriptions.types';
import type { RawNotificationEntry } from '../../../src/models/notification/notifications.internal-types';
import { NOTIFICATION_TEST_CONSTANTS } from '../constants/notification';

/**
 * Builds a raw notification entry mirroring a live API response.
 */
export const createBasicNotificationEntry = (
  overrides?: Partial<RawNotificationEntry>
): RawNotificationEntry => ({
  id: NOTIFICATION_TEST_CONSTANTS.NOTIFICATION_ID,
  message: NOTIFICATION_TEST_CONSTANTS.MESSAGE,
  isRead: false,
  publisherName: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME,
  publisherId: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
  topicName: NOTIFICATION_TEST_CONSTANTS.TOPIC_NAME,
  topicKeyName: NOTIFICATION_TEST_CONSTANTS.TOPIC_KEY_NAME,
  topicId: NOTIFICATION_TEST_CONSTANTS.TOPIC_ID,
  userId: NOTIFICATION_TEST_CONSTANTS.USER_ID,
  userEmail: null,
  tenantId: null,
  priority: NotificationPriority.High,
  category: NotificationCategory.Error,
  messageParam: NOTIFICATION_TEST_CONSTANTS.MESSAGE_PARAM,
  redirectionUrl: NOTIFICATION_TEST_CONSTANTS.REDIRECTION_URL,
  publishedOn: NOTIFICATION_TEST_CONSTANTS.PUBLISHED_ON,
  // Internal fields the API includes but the SDK drops:
  entityOrgName: null,
  entityTenantName: null,
  serviceRegistryName: null,
  messageTemplateKey: null,
  messageVersion: 1,
  publicationId: '00000000-0000-0000-0000-000000000000',
  correlationId: null,
  partitionKey: 'testorg|testtenant|partition-key-value',
  ...overrides,
});

const defaultSubscriptionMode = (name: NotificationMode, isSubscribed = true): SubscriptionMode => ({
  name,
  isSubscribed,
  isSubscribedByDefault: isSubscribed,
});

export const createBasicSubscriptionTopic = (
  overrides?: Partial<SubscriptionTopic>
): SubscriptionTopic => ({
  id: NOTIFICATION_TEST_CONSTANTS.TOPIC_ID,
  name: NOTIFICATION_TEST_CONSTANTS.TOPIC_NAME,
  displayName: NOTIFICATION_TEST_CONSTANTS.TOPIC_DISPLAY_NAME,
  description: 'Job execution faulted',
  group: 'Process Activities',
  parentGroup: null,
  category: NotificationCategory.Error,
  isSubscribed: true,
  isMandatory: false,
  isVisible: true,
  isDefault: true,
  isAllowedToBeDispatchedInBatch: false,
  isInfrequent: false,
  retentionDays: 30,
  orderingSequence: 1,
  modes: [
    defaultSubscriptionMode(NotificationMode.InApp, true),
    defaultSubscriptionMode(NotificationMode.Email, true),
  ],
  ...overrides,
});

export const createBasicSubscriptionPublisher = (
  overrides?: Partial<SubscriptionPublisher>
): SubscriptionPublisher => ({
  id: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_ID,
  name: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_NAME,
  displayName: NOTIFICATION_TEST_CONSTANTS.PUBLISHER_DISPLAY_NAME,
  redirectionUrl: 'https://alpha.uipath.com/',
  retentionDays: 30,
  addToSummary: false,
  isUserOptin: true,
  modes: [
    { name: NotificationMode.InApp, isActive: true },
    { name: NotificationMode.Email, isActive: true },
  ],
  topics: [createBasicSubscriptionTopic()],
  ...overrides,
});

export const createBasicSupportedChannels = (): SupportedChannel[] => [
  { name: NotificationMode.Email, isEnabled: true },
  { name: NotificationMode.Slack, isEnabled: false },
  { name: NotificationMode.Teams, isEnabled: false },
];
