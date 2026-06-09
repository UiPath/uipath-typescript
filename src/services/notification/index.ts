/**
 * Notification Service Module
 *
 * Provides access to the UiPath Notification platform from the perspective of an
 * authenticated user (UserContext):
 * - `Notifications` — list / mark read / delete operations on the user's inbox
 * - `Subscriptions` — manage the user's notification preferences per publisher, topic, and channel
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
 * const unread = await notifications.getAll({ filter: 'isRead eq false' });
 *
 * const subscriptions = new Subscriptions(sdk);
 * const { publishers } = await subscriptions.getAll();
 * ```
 *
 * @module
 */

export { NotificationService as Notifications } from './notifications';
export { SubscriptionService as Subscriptions } from './subscriptions';

// Models (types, enums, response shapes)
export * from '../../models/notification';
