/**
 * Platform Module
 *
 * Provides access to UiPath platform administration:
 * - `Platform` — bulk read and bulk create/update of a user's setting key/value pairs
 * - `Users` — list, read, and update an organization's users, including group membership
 *
 * Settings operations are user-scoped — see {@link PlatformSettingKey}. Settings require
 * the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Platform, PlatformSettingKey, Users } from '@uipath/uipath-typescript/platform';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const platform = new Platform(sdk);
 * const settings = await platform.getUserSettings([PlatformSettingKey.UserTheme], '<userId>', {
 *   organizationId: '<organizationId>',
 * });
 *
 * await platform.updateUserSettings(
 *   [{ key: PlatformSettingKey.UserTheme, value: 'dark' }],
 *   settings[0].userId,
 *   settings[0].organizationId
 * );
 *
 * const users = new Users(sdk);
 * const allUsers = await users.getAll('<organizationId>');
 * ```
 *
 * @module
 */

export { PlatformService as Platform } from './platform';
export { PlatformUserService as Users } from './users';

// Models (types, response shapes)
export * from '../../models/platform';
