/**
 * Notification mock factories.
 *
 * Shapes mirror the real API responses captured live during onboarding (NOT the
 * Swagger spec, which omits some nullable behaviour).
 */

import {
  NotificationCategory,
  NotificationPriority,
} from '../../../src/models/notification';
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
