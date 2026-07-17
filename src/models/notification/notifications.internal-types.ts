/**
 * Internal-only types for the Notification service.
 *
 * NOT exported from the public barrel (`src/models/notification/index.ts`).
 */

import type { NotificationPriority, NotificationCategory } from './notifications.types';

/**
 * Raw notification entry shape as returned by `/odata/v1/NotificationEntry`.
 *
 * Mirrors the API contract exactly: it uses the API's `isRead` field (renamed to
 * `hasRead` in the SDK response) and includes the internal/transport-layer fields
 * the SDK drops before returning to consumers.
 */
export interface RawNotificationEntry {
  id: string;
  message: string | null;
  /** API read flag — renamed to `hasRead` in the SDK response. */
  isRead: boolean;
  publisherName: string;
  publisherId: string;
  topicName: string;
  topicKeyName: string;
  topicId: string;
  userId: string;
  userEmail: string | null;
  tenantId: string | null;
  priority: NotificationPriority;
  category: NotificationCategory;
  messageParam: string | null;
  redirectionUrl: string | null;
  publishedOn: number;
  // Internal/transport-layer fields the SDK strips before returning to consumers:
  entityOrgName?: string | null;
  entityTenantName?: string | null;
  serviceRegistryName?: string | null;
  messageTemplateKey?: string | null;
  messageVersion?: number;
  publicationId?: string;
  correlationId?: string | null;
  partitionKey?: string;
}

/**
 * Fields stripped from each {@link RawNotificationEntry} before it is returned to the
 * SDK consumer as a {@link NotificationGetResponse}.
 */
export const INTERNAL_NOTIFICATION_FIELDS = [
  'entityOrgName',
  'entityTenantName',
  'serviceRegistryName',
  'messageTemplateKey',
  'messageVersion',
  'publicationId',
  'correlationId',
  'partitionKey',
] as const satisfies ReadonlyArray<keyof RawNotificationEntry>;
