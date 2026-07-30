/**
 * Identity Module
 *
 * Provides access to organization-level UiPath Identity configuration:
 * - `Identity` — bulk read and bulk create/update of identity setting key/value pairs
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Identity } from '@uipath/uipath-typescript/identity';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const identity = new Identity(sdk);
 * const settings = await identity.getSettings();
 *
 * await identity.updateSettings([
 *   { key: 'Auth.Password.DefaultLifetimeDays', value: '90' },
 * ]);
 * ```
 *
 * @module
 */

export { IdentityService as Identity } from './identity';

// Models (types, response shapes)
export * from '../../models/identity';
