/**
 * Platform roles service model — the ServiceModel interface that drives generated
 * API documentation, plus the entity-method attachment factories.
 */

import type {
  RawPlatformRoleGetResponse,
  PlatformRoleGetAllOptions,
  PlatformRoleUpsertRequest,
  PlatformRoleAssignmentGetAllOptions,
  PlatformPrincipalRoleAssignments,
  PlatformRoleAssignmentChanges,
  PlatformEffectiveAccessRequest,
  PlatformEffectiveAccessResponse,
  PlatformRoleAction,
  PlatformRoleActionGetAllOptions,
} from './roles.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * A role with entity methods attached.
 */
export type PlatformRoleGetResponse = RawPlatformRoleGetResponse & PlatformRoleMethods;

/**
 * Public surface of the platform Roles service. JSDoc on this interface drives
 * the generated API reference documentation.
 *
 * Roles bundle permissions (actions) and are granted to principals — users,
 * groups, external applications — through role assignments. Together with users
 * and groups this completes the RBAC model: put users in groups, grant roles to
 * the groups, and ask `getEffectiveAccess()` what a principal can do.
 */
export interface PlatformRoleServiceModel {
  /**
   * Gets the organization's roles, built-ins included, with optional filtering
   * and pagination.
   *
   * Each role carries the permissions it grants (`actionDetails`).
   *
   * @param options - Filtering and pagination options
   * @returns All roles when no pagination options are given, one page otherwise, as {@link PlatformRoleGetResponse} items
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Roles } from '@uipath/uipath-typescript/platform';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const roles = new Roles(sdk);
   * const allRoles = await roles.getAll();
   * for (const role of allRoles.items) {
   *   console.log(`${role.name} (${role.type}) — ${role.actionDetails.length} permissions`);
   * }
   * ```
   *
   * @example Filter to custom roles of a service
   * ```typescript
   * import { PlatformRoleType } from '@uipath/uipath-typescript/platform';
   *
   * const customRoles = await roles.getAll({
   *   roleType: PlatformRoleType.Custom,
   *   contains: 'Ticket',
   *   pageSize: 20,
   * });
   * ```
   */
  getAll<T extends PlatformRoleGetAllOptions = PlatformRoleGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformRoleGetResponse>
      : NonPaginatedResponse<PlatformRoleGetResponse>
  >;

  /**
   * Gets a role by ID, built-ins included.
   *
   * @param roleId - GUID of the role
   * @returns The role with its permissions, as a {@link PlatformRoleGetResponse}
   *
   * @example
   * ```typescript
   * const role = await roles.getById('<roleId>');
   * console.log(role.actionDetails.map(a => a.name));
   * ```
   */
  getById(roleId: string): Promise<PlatformRoleGetResponse>;

  /**
   * Creates or updates a custom role.
   *
   * Omit `request.id` to create a new role; pass it to overwrite an existing
   * custom role. Built-in roles cannot be changed. Actions are referenced by
   * their fully qualified names — pick them from `getActions()`.
   *
   * @param request - The role to create or update
   * @returns The role as stored after the write, as a {@link PlatformRoleGetResponse}
   *
   * @example Create a custom role
   * ```typescript
   * const actions = await roles.getActions({ serviceName: 'AuthZ' });
   *
   * const role = await roles.upsert({
   *   roleName: 'Ticket Auditor',
   *   roleScopeType: 'ORGANIZATION',
   *   organizationId: '<organizationId>',
   *   roleDescription: 'Read-only access for ticket audits',
   *   actionsGrantedByRole: [actions[0].name],
   * });
   * ```
   */
  upsert(request: PlatformRoleUpsertRequest): Promise<PlatformRoleGetResponse>;

  /**
   * Deletes a custom role. Built-in roles cannot be deleted.
   *
   * @param roleId - GUID of the role to delete
   * @returns Resolves when the role has been deleted
   *
   * @example
   * ```typescript
   * await roles.deleteById('<roleId>');
   * ```
   */
  deleteById(roleId: string): Promise<void>;

  /**
   * Gets the organization's role assignments grouped by principal, with
   * optional filtering and pagination.
   *
   * @param scope - The scope to list assignments for; `/` means the whole organization
   * @param options - Filtering and pagination options
   * @returns All assignment groups when no pagination options are given, one page otherwise, as {@link PlatformPrincipalRoleAssignments} items
   *
   * @example Basic usage
   * ```typescript
   * const assignments = await roles.getAssignments('/');
   * for (const principal of assignments.items) {
   *   console.log(`${principal.displayName}: ${principal.roleAssignments.map(a => a.roleName)}`);
   * }
   * ```
   *
   * @example Assignments of one principal
   * ```typescript
   * const assignments = await roles.getAssignments('/', {
   *   securityPrincipalId: '<userId>',
   * });
   * ```
   */
  getAssignments<T extends PlatformRoleAssignmentGetAllOptions = PlatformRoleAssignmentGetAllOptions>(
    scope: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformPrincipalRoleAssignments>
      : NonPaginatedResponse<PlatformPrincipalRoleAssignments>
  >;

  /**
   * Adds and removes role assignments atomically.
   *
   * Additions grant a role to a principal; removals are identified by
   * assignment GUID (from `getAssignments()`). If a removal fails, added
   * assignments are rolled back on a best-effort basis.
   *
   * First, get role IDs with `getAll()` and principal IDs with `users.getAll()`
   * or `groups.getAll()` (from `@uipath/uipath-typescript/platform`).
   *
   * @param changes - The assignments to add and remove
   * @returns Resolves when the changes have been applied
   *
   * @example Grant a role to a group
   * ```typescript
   * import { PlatformPrincipalType } from '@uipath/uipath-typescript/platform';
   *
   * await roles.updateAssignments({
   *   toAdd: [{
   *     roleId: '<roleId>',
   *     securityPrincipalId: '<groupId>',
   *     securityPrincipalType: PlatformPrincipalType.Group,
   *     scope: '/',
   *   }],
   * });
   * ```
   *
   * @example Revoke an assignment
   * ```typescript
   * await roles.updateAssignments({ toDelete: ['<roleAssignmentId>'] });
   * ```
   */
  updateAssignments(changes: PlatformRoleAssignmentChanges): Promise<void>;

  /**
   * Exports all direct role assignments of the organization as CSV.
   *
   * @returns The CSV document as a string
   *
   * @example
   * ```typescript
   * const csv = await roles.exportAssignments();
   * console.log(csv.split('\n')[0]); // header row
   * ```
   */
  exportAssignments(): Promise<string>;

  /**
   * Computes the roles a principal effectively holds in a tenant — directly
   * and through group membership.
   *
   * This is the RBAC question "what can this user do here": the response
   * groups every effective role with the assignments granting it, plus
   * metadata for the granted services and roles.
   *
   * @param request - The principal and tenant scope to compute access for
   * @returns The principal's effective access, as a {@link PlatformEffectiveAccessResponse}
   *
   * @example
   * ```typescript
   * const access = await roles.getEffectiveAccess({
   *   tenantId: '<tenantId>',
   *   userId: '<userId>',
   * });
   * const isAdmin = access.roles.some(r => r.roleName === 'Administrator');
   * ```
   */
  getEffectiveAccess(request: PlatformEffectiveAccessRequest): Promise<PlatformEffectiveAccessResponse>;

  /**
   * Gets the catalog of permission (action) definitions roles can grant,
   * optionally filtered by owning service or scope level.
   *
   * Use it to pick the `actionsGrantedByRole` names when creating a custom
   * role with `upsert()`.
   *
   * @param options - Filtering options
   * @returns The action definitions, as {@link PlatformRoleAction} items
   *
   * @example
   * ```typescript
   * const actions = await roles.getActions({ serviceName: 'AuthZ' });
   * for (const action of actions) {
   *   console.log(`${action.name}: ${action.description}`);
   * }
   * ```
   */
  getActions(options?: PlatformRoleActionGetAllOptions): Promise<PlatformRoleAction[]>;
}

/**
 * Methods attached to role objects returned by the Roles service.
 */
export interface PlatformRoleMethods {
  /**
   * Deletes this role. Built-in roles cannot be deleted.
   *
   * @returns Promise resolving when the role has been deleted
   */
  delete(): Promise<void>;
}

/**
 * Creates the bound methods for a role object.
 *
 * @param roleData - The role data (response from API)
 * @param service - The Roles service instance
 * @returns Object containing role methods
 */
function createPlatformRoleMethods(
  roleData: RawPlatformRoleGetResponse,
  service: PlatformRoleServiceModel
): PlatformRoleMethods {
  return {
    async delete(): Promise<void> {
      if (!roleData.id) throw new Error('Role ID is undefined');

      return service.deleteById(roleData.id);
    },
  };
}

/**
 * Attaches entity methods to a role object.
 *
 * @param roleData - The role data (response from API)
 * @param service - The Roles service instance
 * @returns The role with bound methods
 */
export function createPlatformRoleWithMethods(
  roleData: RawPlatformRoleGetResponse,
  service: PlatformRoleServiceModel
): PlatformRoleGetResponse {
  const methods = createPlatformRoleMethods(roleData, service);
  return Object.assign({}, roleData, methods);
}
