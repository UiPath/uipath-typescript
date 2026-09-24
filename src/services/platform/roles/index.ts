/**
 * Roles Module
 *
 * Provides access to an organization's role-based access control:
 * - `Roles` — manage roles and role assignments, and compute a principal's effective access
 *
 * The Authorization service publishes no dedicated OAuth scope — the caller's own platform
 * roles govern access (see the OAuth scopes guide).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Roles } from '@uipath/uipath-typescript/roles';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const roles = new Roles(sdk);
 * const allRoles = await roles.getAll();
 * ```
 *
 * @module
 */

export { PlatformRoleService as Roles } from './roles';

// Models (types, response shapes)
export * from '../../../models/platform/roles.types';
export * from '../../../models/platform/roles.models';
