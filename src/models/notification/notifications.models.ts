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
  NotificationGetAllOptions,
  NotificationGetResponse,
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
  getAll<T extends NotificationGetAllOptions = NotificationGetAllOptions>(
    tenantId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<NotificationGetResponse>
      : NonPaginatedResponse<NotificationGetResponse>
  >;
}
