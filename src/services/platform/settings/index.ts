/**
 * Settings Module
 *
 * Provides access to a user's platform settings:
 * - `Settings` — bulk read and bulk create/update of a user's setting key/value pairs
 *
 * Every operation is user-scoped — see {@link PlatformSettingKey}.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Settings, PlatformSettingKey } from '@uipath/uipath-typescript/settings';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const settings = new Settings(sdk);
 * const stored = await settings.getUserSettings([PlatformSettingKey.UserTheme], '<userId>');
 *
 * await settings.updateUserSettings(
 *   [{ key: PlatformSettingKey.UserTheme, value: 'dark' }],
 *   '<userId>'
 * );
 * ```
 *
 * @module
 */

export { PlatformSettingService as Settings } from './settings';

// Models (types, response shapes)
export * from '../../../models/platform/settings.types';
export * from '../../../models/platform/settings.models';
