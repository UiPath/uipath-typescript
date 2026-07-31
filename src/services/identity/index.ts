/**
 * Identity Module
 *
 * Provides access to UiPath Identity settings:
 * - `Identity` — bulk read and bulk create/update of a user's setting key/value pairs
 *
 * Every operation is user-scoped — see {@link IdentitySettingKey}.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Identity, IdentitySettingKey } from '@uipath/uipath-typescript/identity';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const identity = new Identity(sdk);
 * const settings = await identity.getSettings([IdentitySettingKey.UserTheme], '<userId>');
 *
 * await identity.updateSettings(
 *   [{ key: IdentitySettingKey.UserTheme, value: 'dark' }],
 *   settings[0].userId,
 *   settings[0].organizationId
 * );
 * ```
 *
 * @module
 */

export { IdentityService as Identity } from './identity';

// Models (types, response shapes)
export * from '../../models/identity';
