/**
 * Notification Service Endpoints
 *
 * Covers two backend sub-services under the same `notificationservice_` prefix:
 * - `notificationserviceapi` — notification inbox (OData)
 * - `usersubscriptionservice` — user subscription preferences
 *
 * URLs route at the **organization** level (no tenant segment); see {@link NOTIFICATION_BASE}.
 */

import { NOTIFICATION_BASE } from './base';

const NOTIFICATION_API_BASE = `${NOTIFICATION_BASE}/notificationserviceapi`;
const SUBSCRIPTION_API_BASE = `${NOTIFICATION_BASE}/usersubscriptionservice`;

/**
 * Notification inbox endpoints
 */
export const NOTIFICATION_ENDPOINTS = {
  GET_ALL: `${NOTIFICATION_API_BASE}/odata/v1/NotificationEntry`,
  UPDATE_READ: `${NOTIFICATION_API_BASE}/odata/v1/NotificationEntry/UiPath.NotificationService.Api.UpdateRead`,
  DELETE_BULK: `${NOTIFICATION_API_BASE}/odata/v1/NotificationEntry/UiPath.NotificationService.Api.DeleteBulk`,
} as const;

/**
 * User subscription endpoints
 */
export const SUBSCRIPTION_ENDPOINTS = {
  GET_ALL: `${SUBSCRIPTION_API_BASE}/api/v1/UserSubscription`,
  GET_PUBLISHERS: `${SUBSCRIPTION_API_BASE}/api/v1/UserSubscription/GetPublishers`,
  GET_SUPPORTED_CHANNELS: `${SUBSCRIPTION_API_BASE}/api/v1/UserSubscription/GetSupportedChannelStatus`,
  // Intentional duplicate URL of GET_ALL: same path, POST vs GET differentiates the operation.
  UPDATE_TOPIC: `${SUBSCRIPTION_API_BASE}/api/v1/UserSubscription`,
  UPDATE_CATEGORY: `${SUBSCRIPTION_API_BASE}/api/v1/UserSubscription/CategorySubscription`,
  UPDATE_PUBLISHER: `${SUBSCRIPTION_API_BASE}/api/v1/UserSubscription/PublisherSubscription`,
  UPDATE_TOPIC_GROUP: `${SUBSCRIPTION_API_BASE}/api/v1/UserSubscription/TopicGroupSubscription`,
} as const;
