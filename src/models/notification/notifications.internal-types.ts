/**
 * Internal-only types for the Notification service.
 *
 * NOT exported from the public barrel (`src/models/notification/index.ts`).
 */

import type { NotificationGetResponse } from './notifications.types';

/**
 * Raw notification entry shape as returned by `/odata/v1/NotificationEntry` — includes
 * the internal/transport-layer fields the SDK drops before returning to consumers.
 */
export interface RawNotificationEntry extends NotificationGetResponse {
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
export const INTERNAL_NOTIFICATION_FIELDS: ReadonlyArray<keyof RawNotificationEntry> = [
  'entityOrgName',
  'entityTenantName',
  'serviceRegistryName',
  'messageTemplateKey',
  'messageVersion',
  'publicationId',
  'correlationId',
  'partitionKey',
];
