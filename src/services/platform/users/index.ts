/**
 * Users Module
 *
 * Provides access to an organization's user accounts:
 * - `Users` — list, read, and update users, including group membership
 *
 * Requires the `PM.User` scope (or `PM.User.Read` / `PM.User.Write`).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Users } from '@uipath/uipath-typescript/users';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const users = new Users(sdk);
 * const allUsers = await users.getAll();
 * ```
 *
 * @module
 */

export { PlatformUserService as Users } from './users';

// Models (types, response shapes)
export * from '../../../models/platform/users.types';
export * from '../../../models/platform/users.models';
