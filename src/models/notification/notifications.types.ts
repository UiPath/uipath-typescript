/**
 * Notification inbox types — raw API shapes and request/response options.
 */

import type { PaginationOptions } from '../../utils/pagination/types';
import type { OperationResponse } from '../common/types';

/**
 * Priority level assigned to a notification by the publisher.
 */
export enum NotificationPriority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

/**
 * Severity classification of a notification topic.
 */
export enum NotificationCategory {
  /** Informational — no action required. */
  Info = 'Info',
  /** Successful operation completed. */
  Success = 'Success',
  /** Warning — degraded behaviour or non-fatal issue. */
  Warn = 'Warn',
  /** Error — operation failed but the system continues. */
  Error = 'Error',
  /** Fatal — unrecoverable failure. */
  Fatal = 'Fatal',
}

/**
 * Notification entry as returned by `GET /odata/v1/NotificationEntry`.
 *
 * Field selection: many internal/transport-layer fields (`partitionKey`, `correlationId`,
 * `publicationId`, `messageVersion`, `messageTemplateKey`, `serviceRegistryName`,
 * `entityOrgName`, `entityTenantName`) are returned by the API but dropped from the SDK
 * because they have no use for an application developer.
 */
export interface NotificationGetResponse {
  /** Notification GUID. */
  id: string;
  /** Resolved notification message text. */
  message: string | null;
  /** Whether the user has read this notification. */
  hasRead: boolean;
  /** Name of the publisher (e.g. `Orchestrator`, `Actions`). */
  publisherName: string;
  /** Publisher GUID. */
  publisherId: string;
  /** Human-readable topic name. */
  topicName: string;
  /** Stable topic identifier (e.g. `Process.JobExecution.Faulted`). */
  topicKeyName: string;
  /** Topic GUID. */
  topicId: string;
  /** GUID of the user this notification belongs to (returned uppercase by the API). */
  userId: string;
  /** Email of the user. Often `null`. */
  userEmail: string | null;
  /** Tenant GUID this notification belongs to. Often `null` for org-scoped notifications. */
  tenantId: string | null;
  /** Notification priority. */
  priority: NotificationPriority;
  /** Notification severity category. */
  category: NotificationCategory;
  /** JSON string of template parameters — parse with `JSON.parse()`. May be `null`. */
  messageParam: string | null;
  /** URL to navigate to when the notification is clicked. */
  redirectionUrl: string | null;
  /** Unix epoch **seconds** when the notification was published. */
  publishedOn: number;
}

/**
 * Options for `Notifications.getAll()`.
 *
 * Supports OData query options (`filter`, `orderby`) and SDK cursor pagination.
 *
 * Notes:
 * - `$select` and `$expand` are not exposed because the API returns 500 on `$select`
 *   and there are no expandable relationships on this endpoint.
 */
export type NotificationGetAllOptions = PaginationOptions & {
  filter?: string;
  orderby?: string;
};

/**
 * Response from `markAsRead()` / `markAsUnread()`.
 *
 * `notificationIds` echoes the IDs that were marked; `read` reflects the new state.
 */
export type NotificationUpdateReadResponse = OperationResponse<{
  notificationIds: string[];
  read: boolean;
}>;

/**
 * Response from `markAllAsRead()`.
 */
export type NotificationMarkAllReadResponse = OperationResponse<{
  all: true;
  read: true;
}>;

/**
 * Response from `deleteByIds()`.
 *
 * `notificationIds` echoes the IDs that were deleted.
 */
export type NotificationDeleteResponse = OperationResponse<{
  notificationIds: string[];
}>;

/**
 * Response from `deleteAll()`.
 */
export type NotificationDeleteAllResponse = OperationResponse<{
  all: true;
}>;
