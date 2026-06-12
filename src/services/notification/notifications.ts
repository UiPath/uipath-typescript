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
import { TENANT_ID } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
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
 * Provides list operations against the current user's notifications (the
 * `/odata/v1/NotificationEntry` API). Further inbox operations (mark-read,
 * delete) land in follow-up PRs.
 *
 * Every public method takes the acting tenant GUID as the first argument — the
 * notification API identifies the tenant via the `X-UIPATH-Internal-TenantId`
 * header and the SDK forwards `tenantId` into that header on each call.
 */
export class NotificationService extends BaseService implements NotificationServiceModel {
  /**
   * Lists notifications from the current user's inbox.
   *
   * Returns the full list when no pagination params are provided, or a paginated cursor result
   * when any of `pageSize`/`cursor`/`jumpToPage` is supplied. Supports OData `filter` and
   * `orderby` query options.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param options - Optional OData query and pagination options
   * @returns Array of notifications, or a paginated result when pagination params are supplied
   * {@link NotificationGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * import { Notifications } from '@uipath/uipath-typescript/notifications';
   *
   * const notifications = new Notifications(sdk);
   * const all = await notifications.getAll('<tenantId>');
   * ```
   *
   * @example Filter unread, most recent first
   * ```typescript
   * const unread = await notifications.getAll('<tenantId>', {
   *   filter: 'isRead eq false',
   *   orderby: 'publishedOn desc',
   * });
   * ```
   *
   * @example First page with pagination
   * ```typescript
   * const page1 = await notifications.getAll('<tenantId>', { pageSize: 20 });
   * if (page1.hasNextPage) {
   *   const page2 = await notifications.getAll('<tenantId>', { cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Notifications.GetAll')
  async getAll<T extends NotificationGetAllOptions = NotificationGetAllOptions>(
    tenantId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<NotificationGetResponse>
      : NonPaginatedResponse<NotificationGetResponse>
  > {
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => NOTIFICATION_ENDPOINTS.GET_ALL,
      headers: createHeaders({ [TENANT_ID]: tenantId }),
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
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param notificationIds - GUIDs of notifications to mark read
   * @returns Operation result echoing the affected IDs and new read state
   * {@link NotificationUpdateReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markRead('<tenantId>', ['<notificationId-1>', '<notificationId-2>']);
   * ```
   */
  @track('Notifications.MarkRead')
  async markRead(tenantId: string, notificationIds: string[]): Promise<NotificationUpdateReadResponse> {
    return this.updateRead(tenantId, notificationIds, true);
  }

  /**
   * Marks the given notifications as unread.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @param notificationIds - GUIDs of notifications to mark unread
   * @returns Operation result echoing the affected IDs and new read state
   * {@link NotificationUpdateReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markUnread('<tenantId>', ['<notificationId>']);
   * ```
   */
  @track('Notifications.MarkUnread')
  async markUnread(tenantId: string, notificationIds: string[]): Promise<NotificationUpdateReadResponse> {
    return this.updateRead(tenantId, notificationIds, false);
  }

  /**
   * Marks all notifications in the current user's inbox as read.
   *
   * Uses the server-side `forceAllRead` flag — no per-notification IDs are sent.
   *
   * @param tenantId - Tenant GUID (sent via `X-UIPATH-Internal-TenantId`)
   * @returns Operation result confirming the bulk update
   * {@link NotificationMarkAllReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markAllRead('<tenantId>');
   * ```
   */
  @track('Notifications.MarkAllRead')
  async markAllRead(tenantId: string): Promise<NotificationMarkAllReadResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.UPDATE_READ, {
      notifications: [],
      forceAllRead: true,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { all: true, read: true } };
  }

  private async updateRead(
    tenantId: string,
    notificationIds: string[],
    read: boolean
  ): Promise<NotificationUpdateReadResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.UPDATE_READ, {
      notifications: notificationIds.map((notificationId) => ({ notificationId, read })),
      forceAllRead: false,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
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
