/**
 * NotificationService — manages the current user's notification inbox.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

import type {
  NotificationDeleteAllResponse,
  NotificationDeleteResponse,
  NotificationGetAllOptions,
  NotificationGetResponse,
  NotificationMarkAllReadResponse,
  NotificationUpdateReadResponse,
} from '../../models/notification/notifications.types';
import type {
  NotificationServiceModel,
} from '../../models/notification/notifications.models';
import {
  INTERNAL_NOTIFICATION_FIELDS,
  type RawNotificationEntry,
} from '../../models/notification/notifications.internal-types';

import { NotificationMap } from '../../models/notification/notifications.constants';
import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION } from '../../utils/constants/common';
import { NOTIFICATION_ENDPOINTS } from '../../utils/constants/endpoints';
import { TENANT_ID } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { transformData, transformOptions } from '../../utils/transform';
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
 * Provides inbox operations against the current user's notifications (the
 * `/odata/v1/NotificationEntry` API).
 *
 * Every public method takes the acting tenant GUID as the first argument — the
 * notification API identifies the tenant via the `X-UIPATH-Internal-TenantId`
 * header and the SDK forwards `tenantId` into that header on each call.
 */
export class NotificationService extends BaseService implements NotificationServiceModel {
  @track('Notifications.GetAll')
  async getAll<T extends NotificationGetAllOptions = NotificationGetAllOptions>(
    tenantId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<NotificationGetResponse>
      : NonPaginatedResponse<NotificationGetResponse>
  > {
    // Rewrite renamed SDK field names → API names inside OData strings
    // (e.g. `hasRead` → `isRead`) before delegating, so callers use the same
    // field names for filtering/sorting that they see in the response.
    const apiOptions = options ? transformOptions(options, NotificationMap) : options;

    // Drops internal/transport-layer fields from a raw notification entry and
    // applies the SDK field renames (e.g. `isRead` → `hasRead`) before returning
    // it to the consumer.
    const transformNotificationResponse = (item: RawNotificationEntry): NotificationGetResponse => {
      const stripped: RawNotificationEntry = { ...item };
      for (const field of INTERNAL_NOTIFICATION_FIELDS) {
        delete stripped[field];
      }
      return transformData(stripped, NotificationMap) as unknown as NotificationGetResponse;
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => NOTIFICATION_ENDPOINTS.GET_ALL,
      headers: createHeaders({ [TENANT_ID]: tenantId }),
      transformFn: transformNotificationResponse,
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
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<NotificationGetResponse>
        : NonPaginatedResponse<NotificationGetResponse>
    >;
  }

  @track('Notifications.MarkAsRead')
  async markAsRead(tenantId: string, notificationIds: string[]): Promise<NotificationUpdateReadResponse> {
    return this.updateRead(tenantId, notificationIds, true);
  }

  @track('Notifications.MarkAsUnread')
  async markAsUnread(tenantId: string, notificationIds: string[]): Promise<NotificationUpdateReadResponse> {
    return this.updateRead(tenantId, notificationIds, false);
  }

  @track('Notifications.MarkAllAsRead')
  async markAllAsRead(tenantId: string): Promise<NotificationMarkAllReadResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.UPDATE_READ, {
      notifications: [],
      forceAllRead: true,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { all: true, read: true } };
  }

  @track('Notifications.DeleteByIds')
  async deleteByIds(tenantId: string, notificationIds: string[]): Promise<NotificationDeleteResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.DELETE_BULK, {
      // API spec misspells the key as `notifcationIds` — preserve it.
      notifcationIds: notificationIds,
      deleteAll: false,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { notificationIds } };
  }

  @track('Notifications.DeleteAll')
  async deleteAll(tenantId: string): Promise<NotificationDeleteAllResponse> {
    await this.post(NOTIFICATION_ENDPOINTS.DELETE_BULK, {
      // API spec misspells the key as `notifcationIds` — preserve it.
      notifcationIds: [],
      deleteAll: true,
    }, { headers: createHeaders({ [TENANT_ID]: tenantId }) });
    return { success: true, data: { all: true } };
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
