/**
 * NotificationService — manages the current user's notification inbox.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

import type {
  NotificationGetAllOptions,
  NotificationGetResponse,
} from '../../models/notification/notifications.types';
import type {
  NotificationDeleteAllResponse,
  NotificationDeleteResponse,
  NotificationMarkAllReadResponse,
  NotificationServiceModel,
  NotificationUpdateReadResponse,
} from '../../models/notification/notifications.models';
import {
  INTERNAL_NOTIFICATION_FIELDS,
  type RawNotificationEntry,
} from '../../models/notification/notifications.internal-types';

import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION } from '../../utils/constants/common';
import { NOTIFICATION_ENDPOINTS } from '../../utils/constants/endpoints';
import {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';

/**
 * Service for interacting with the UiPath Notification inbox.
 *
 * Provides list / mark-read / delete operations against the current user's
 * notifications (the `/odata/v1/NotificationEntry` API).
 */
export class NotificationService extends BaseService implements NotificationServiceModel {
  /**
   * Lists notifications from the current user's inbox.
   *
   * Returns the full list when no pagination params are provided, or a paginated cursor result
   * when any of `pageSize`/`cursor`/`jumpToPage` is supplied. Supports OData `filter` and
   * `orderby` query options.
   *
   * @param options - Optional OData query and pagination options
   * @returns Array of notifications, or a paginated result when pagination params are supplied
   * {@link NotificationGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * import { Notifications } from '@uipath/uipath-typescript/notifications';
   *
   * const notifications = new Notifications(sdk);
   * const all = await notifications.getAll();
   * ```
   *
   * @example Filter unread, most recent first
   * ```typescript
   * const unread = await notifications.getAll({
   *   filter: 'isRead eq false',
   *   orderby: 'publishedOn desc',
   * });
   * ```
   *
   * @example First page with pagination
   * ```typescript
   * const page1 = await notifications.getAll({ pageSize: 20 });
   * if (page1.hasNextPage) {
   *   const page2 = await notifications.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Notifications.GetAll')
  async getAll<T extends NotificationGetAllOptions = NotificationGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<NotificationGetResponse>
      : NonPaginatedResponse<NotificationGetResponse>
  > {
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => NOTIFICATION_ENDPOINTS.GET_ALL,
      transformFn: stripInternalNotificationFields,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
    }, options) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<NotificationGetResponse>
        : NonPaginatedResponse<NotificationGetResponse>
    >;
  }

  /**
   * Marks the given notifications as read.
   *
   * @param notificationIds - GUIDs of notifications to mark read
   * @returns Operation result echoing the affected IDs and new read state
   * {@link NotificationUpdateReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markRead(['<notificationId-1>', '<notificationId-2>']);
   * ```
   */
  @track('Notifications.MarkRead')
  async markRead(notificationIds: string[]): Promise<NotificationUpdateReadResponse> {
    return this.updateRead(notificationIds, true);
  }

  /**
   * Marks the given notifications as unread.
   *
   * @param notificationIds - GUIDs of notifications to mark unread
   * @returns Operation result echoing the affected IDs and new read state
   * {@link NotificationUpdateReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markUnread(['<notificationId>']);
   * ```
   */
  @track('Notifications.MarkUnread')
  async markUnread(notificationIds: string[]): Promise<NotificationUpdateReadResponse> {
    return this.updateRead(notificationIds, false);
  }

  /**
   * Marks all notifications in the current user's inbox as read.
   *
   * Uses the server-side `forceAllRead` flag — no per-notification IDs are sent.
   *
   * @returns Operation result confirming the bulk update
   * {@link NotificationMarkAllReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markAllRead();
   * ```
   */
  @track('Notifications.MarkAllRead')
  async markAllRead(): Promise<NotificationMarkAllReadResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.UPDATE_READ, {
      notifications: [],
      forceAllRead: true,
    });
    return { success: true, data: { all: true, read: true } };
  }

  /**
   * Deletes the given notifications.
   *
   * @param notificationIds - GUIDs of notifications to delete. Must be non-empty —
   *   the server rejects an empty array with HTTP 400.
   * @returns Operation result echoing the deleted IDs
   * {@link NotificationDeleteResponse}
   *
   * @example
   * ```typescript
   * await notifications.deleteNotifications(['<notificationId-1>', '<notificationId-2>']);
   * ```
   */
  @track('Notifications.DeleteNotifications')
  async deleteNotifications(notificationIds: string[]): Promise<NotificationDeleteResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.DELETE_BULK, {
      // API spec misspells the key as `notifcationIds` — preserve it.
      notifcationIds: notificationIds,
      deleteAll: false,
    });
    return { success: true, data: { notificationIds } };
  }

  /**
   * Deletes all notifications from the current user's inbox.
   *
   * Uses the server-side `deleteAll` flag — no per-notification IDs are sent.
   *
   * @returns Operation result confirming the bulk delete
   * {@link NotificationDeleteAllResponse}
   *
   * @example
   * ```typescript
   * await notifications.deleteAll();
   * ```
   */
  @track('Notifications.DeleteAll')
  async deleteAll(): Promise<NotificationDeleteAllResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.DELETE_BULK, {
      // API spec misspells the key as `notifcationIds` — preserve it.
      notifcationIds: [],
      deleteAll: true,
    });
    return { success: true, data: { all: true } };
  }

  private async updateRead(
    notificationIds: string[],
    read: boolean
  ): Promise<NotificationUpdateReadResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.UPDATE_READ, {
      notifications: notificationIds.map((notificationId) => ({ notificationId, read })),
      forceAllRead: false,
    });
    return { success: true, data: { notificationIds, read } };
  }
}

/**
 * Drops internal/transport-layer fields from a raw notification entry before
 * returning it to the SDK consumer. Exported as module-level for testability.
 *
 * @internal
 */
export function stripInternalNotificationFields(item: RawNotificationEntry): NotificationGetResponse {
  const result: RawNotificationEntry = { ...item };
  for (const field of INTERNAL_NOTIFICATION_FIELDS) {
    delete result[field];
  }
  return result;
}
