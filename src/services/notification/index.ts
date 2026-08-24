/**
 * Notification Service Module
 *
 * Provides access to the UiPath Notification platform from the perspective of an
 * authenticated user (UserContext):
 * - `Notifications` — list / mark-read / delete operations on the user's inbox
 * - `Subscriptions` — read the user's notification preferences per publisher and topic
 *
 * Publishing (sending) notifications is a first-party service action and is NOT part of this module.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Notifications, Subscriptions } from '@uipath/uipath-typescript/notifications';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const notifications = new Notifications(sdk);
 * const unread = await notifications.getAll('<tenantId>', { filter: 'hasRead eq false' });
 *
 * const subscriptions = new Subscriptions(sdk);
 * const { publishers } = await subscriptions.getAll('<tenantId>');
 * ```
 *
 * @module
 */

export { NotificationService as Notifications } from './notifications';
export { SubscriptionService as Subscriptions } from './subscriptions';

// Models (types, enums, response shapes)
export * from '../../models/notification';
