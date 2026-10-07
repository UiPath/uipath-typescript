/**
 * Directory Module
 *
 * Provides access to an organization's directory of principals:
 * - `Directory` — search users, groups, and applications by name, and check group membership
 *
 * Requires the `PM.Directory` scope (or `PM.Directory.Read`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Directory } from '@uipath/uipath-typescript/directory';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const directory = new Directory(sdk);
 * const results = await directory.search('sar');
 * ```
 *
 * @module
 */

export { PlatformDirectoryService as Directory } from './directory';

// Models (types, response shapes)
export * from '../../../models/platform/directory.types';
export * from '../../../models/platform/directory.models';
