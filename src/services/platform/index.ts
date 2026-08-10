/**
 * Platform Module
 *
 * Provides access to UiPath platform settings:
 * - `Platform` — bulk read and bulk create/update of a user's setting key/value pairs
 *
 * Every operation is user-scoped — see {@link PlatformSettingKey}.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Platform, PlatformSettingKey } from '@uipath/uipath-typescript/platform';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const platform = new Platform(sdk);
 * const settings = await platform.getSettings([PlatformSettingKey.UserTheme], '<userId>');
 *
 * await platform.updateSettings(
 *   [{ key: PlatformSettingKey.UserTheme, value: 'dark' }],
 *   settings[0].userId,
 *   settings[0].organizationId
 * );
 * ```
 *
 * @module
 */

export { PlatformService as Platform } from './platform';

// Models (types, response shapes)
export * from '../../models/platform';
