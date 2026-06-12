/**
 * Notification Service Module
 *
 * Provides access to the UiPath Notification platform from the perspective of an
 * authenticated user (UserContext):
 * - `Notifications` — list operations on the user's inbox (further operations land in
 *   follow-up PRs)
 *
 * Publishing (sending) notifications is a first-party service action and is NOT part of this module.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Notifications } from '@uipath/uipath-typescript/notifications';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const notifications = new Notifications(sdk);
 * const unread = await notifications.getAll('<tenantId>', { filter: 'isRead eq false' });
 * ```
 *
 * @module
 */

export { NotificationService as Notifications } from './notifications';

// Models (types, enums, response shapes)
export * from '../../models/notification';
