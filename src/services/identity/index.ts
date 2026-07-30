/**
 * Identity Settings Module
 *
 * Provides access to organization-level UiPath Identity settings:
 * - `IdentitySettings` — bulk read and bulk create/update of identity setting key/value pairs
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { IdentitySettings } from '@uipath/uipath-typescript/identity-settings';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const identitySettings = new IdentitySettings(sdk);
 * const settings = await identitySettings.getAll();
 *
 * await identitySettings.updateSettings([
 *   { key: 'Auth.Password.DefaultLifetimeDays', value: '90' },
 * ]);
 * ```
 *
 * @module
 */

export { IdentitySettingService as IdentitySettings } from './settings';

// Models (types, response shapes)
export * from '../../models/identity';
