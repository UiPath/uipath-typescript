/**
 * Notification Service Endpoints
 *
 * Inbox endpoints under the `notificationservice_/notificationserviceapi` prefix.
 *
 * URLs route at the **organization** level (no tenant segment); see {@link NOTIFICATION_BASE}.
 */

import { NOTIFICATION_BASE } from './base';

const NOTIFICATION_API_BASE = `${NOTIFICATION_BASE}/notificationserviceapi`;

/**
 * Notification inbox endpoints
 */
export const NOTIFICATION_ENDPOINTS = {
  GET_ALL: `${NOTIFICATION_API_BASE}/odata/v1/NotificationEntry`,
  UPDATE_READ: `${NOTIFICATION_API_BASE}/odata/v1/NotificationEntry/UiPath.NotificationService.Api.UpdateRead`,
  DELETE_BULK: `${NOTIFICATION_API_BASE}/odata/v1/NotificationEntry/UiPath.NotificationService.Api.DeleteBulk`,
} as const;
