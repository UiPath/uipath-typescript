/**
 * Groups Module
 *
 * Provides access to an organization's groups:
 * - `Groups` — manage groups and their members
 *
 * Requires the `PM.Group` scope (or `PM.Group.Read` / `PM.Group.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Groups } from '@uipath/uipath-typescript/groups';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const groups = new Groups(sdk);
 * const allGroups = await groups.getAll();
 * ```
 *
 * @module
 */

export { PlatformGroupService as Groups } from './groups';

// Models (types, response shapes)
export * from '../../../models/platform/groups.types';
export * from '../../../models/platform/groups.models';
