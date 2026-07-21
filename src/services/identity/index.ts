/**
 * Identity Users Service Module
 *
 * Provides organization-level user administration via the UiPath Identity API:
 * - `Users` — retrieve, update and delete users, and create users in bulk
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
 * const user = await users.getById('<userId>');
 * ```
 *
 * @module
 */

export { UserService as Users } from './users';

// Models (types, enums, response shapes)
export * from '../../models/identity';
