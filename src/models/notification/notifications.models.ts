/**
 * Notification service model — public response shapes and the ServiceModel interface
 * that drives generated API documentation.
 */

import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

import type {
  NotificationDeleteAllResponse,
  NotificationDeleteResponse,
  NotificationGetAllOptions,
  NotificationGetResponse,
  NotificationMarkAllReadResponse,
  NotificationUpdateReadResponse,
} from './notifications.types';

/**
 * Public surface of the Notifications service. JSDoc on this interface drives
 * the generated API reference documentation.
 *
 * Every method takes the tenant GUID as the first argument — the notification
 * API identifies the acting tenant via the `X-UIPATH-Internal-TenantId` header
 * and the SDK forwards `tenantId` into that header on each call.
 */
export interface NotificationServiceModel {
  /**
   * Lists notifications from the current user's inbox.
   *
   * Returns the full list when no pagination params are provided, or a paginated cursor result
   * when any of `pageSize`/`cursor`/`jumpToPage` is supplied. Supports OData `filter` and
   * `orderby` query options.
   *
   * @param tenantId - Tenant GUID
   * @param options - Optional OData query and pagination options
   * @returns Promise resolving to either a {@link NonPaginatedResponse}<{@link NotificationGetResponse}> or a {@link PaginatedResponse}<{@link NotificationGetResponse}> when pagination options are used.
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
   *   filter: 'hasRead eq false',
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
   * @internal
   */
  getAll<T extends NotificationGetAllOptions = NotificationGetAllOptions>(
    tenantId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<NotificationGetResponse>
      : NonPaginatedResponse<NotificationGetResponse>
  >;

  /**
   * Marks the given notifications as read.
   *
   * @param tenantId - Tenant GUID
   * @param notificationIds - GUIDs of notifications to mark read
   * @returns Operation result echoing the affected IDs and new read state
   * {@link NotificationUpdateReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markAsRead('<tenantId>', ['<notificationId-1>', '<notificationId-2>']);
   * ```
   * @internal
   */
  markAsRead(tenantId: string, notificationIds: string[]): Promise<NotificationUpdateReadResponse>;

  /**
   * Marks the given notifications as unread.
   *
   * @param tenantId - Tenant GUID
   * @param notificationIds - GUIDs of notifications to mark unread
   * @returns Operation result echoing the affected IDs and new read state
   * {@link NotificationUpdateReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markAsUnread('<tenantId>', ['<notificationId>']);
   * ```
   * @internal
   */
  markAsUnread(tenantId: string, notificationIds: string[]): Promise<NotificationUpdateReadResponse>;

  /**
   * Marks all notifications in the current user's inbox as read.
   *
   * @param tenantId - Tenant GUID
   * @returns Operation result confirming the bulk update
   * {@link NotificationMarkAllReadResponse}
   *
   * @example
   * ```typescript
   * await notifications.markAllAsRead('<tenantId>');
   * ```
   * @internal
   */
  markAllAsRead(tenantId: string): Promise<NotificationMarkAllReadResponse>;

  /**
   * Deletes the given notifications.
   *
   * @param tenantId - Tenant GUID
   * @param notificationIds - GUIDs of notifications to delete. Must be non-empty.
   * @returns Operation result echoing the deleted IDs
   * {@link NotificationDeleteResponse}
   *
   * @example
   * ```typescript
   * await notifications.deleteByIds('<tenantId>', ['<notificationId-1>', '<notificationId-2>']);
   * ```
   * @internal
   */
  deleteByIds(tenantId: string, notificationIds: string[]): Promise<NotificationDeleteResponse>;

  /**
   * Deletes all notifications from the current user's inbox.
   *
   * @param tenantId - Tenant GUID
   * @returns Operation result confirming the bulk delete
   * {@link NotificationDeleteAllResponse}
   *
   * @example
   * ```typescript
   * await notifications.deleteAll('<tenantId>');
   * ```
   * @internal
   */
  deleteAll(tenantId: string): Promise<NotificationDeleteAllResponse>;
}
