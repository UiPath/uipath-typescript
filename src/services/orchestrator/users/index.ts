/**
 * Users Module
 *
 * Provides access to UiPath Orchestrator user APIs.
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
 * const currentUser = await users.getCurrent();
 * ```
 *
 * @module
 */

export { UserService as Users, UserService } from './users';

export * from '../../../models/orchestrator/users.types';
export * from '../../../models/orchestrator/users.models';
