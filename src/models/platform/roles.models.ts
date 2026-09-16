/**
 * Platform roles service model — the ServiceModel interface that drives generated
 * API documentation, plus the entity-method attachment factories.
 */

import type {
  RawPlatformRoleGetResponse,
  PlatformRoleGetAllOptions,
  PlatformRoleCreateRequest,
  PlatformRoleUpdateOptions,
  PlatformRoleAssignmentGetAllOptions,
  PlatformPrincipalRoleAssignments,
  PlatformRoleAssignmentChanges,
  PlatformEffectiveAccessPrincipal,
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
 * Public surface of the Roles service.
 *
 * A role bundles permissions (actions) and is granted to a principal — a user, a group,
 * or an external application — through a role assignment. Together with users and groups
 * this completes role-based access control (RBAC): put users in groups, grant roles to the
 * groups, then ask what a principal can do. Built-in roles are read-only; custom roles
 * can be created, changed, and deleted.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Roles } from '@uipath/uipath-typescript/roles';
 *
 * const roles = new Roles(sdk);
 * const allRoles = await roles.getAll();
 * ```
 */
export interface PlatformRoleServiceModel {
  /**
   * Gets the organization's roles, built-ins included, with optional filtering,
   * sorting, and pagination.
   *
   * Each role carries the permissions it grants (`actionDetails`).
   *
   * @param options - Filtering, sorting, and pagination options
   * @returns All roles when no pagination options are given, one page otherwise, as {@link PlatformRoleGetResponse} items
   *
   * @example Basic usage
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
   * @example Filter, sort, and paginate
   * ```typescript
   * import { PlatformRoleType, PlatformRoleSortField, PlatformRoleSortOrder } from '@uipath/uipath-typescript/roles';
   *
   * const customRoles = await roles.getAll({
   *   roleType: PlatformRoleType.Custom,
   *   contains: 'Ticket',
   *   sortBy: PlatformRoleSortField.Name,
   *   sortOrder: PlatformRoleSortOrder.Ascending,
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
   * // Get a role id from the listing first
   * const allRoles = await roles.getAll();
   *
   * const role = await roles.getById(allRoles.items[0].id);
   * ```
   */
  getById(roleId: string): Promise<PlatformRoleGetResponse>;

  /**
   * Creates a custom role.
   *
   * Actions are referenced by their fully qualified names — pick them from
   * `getActions()`. The name must be unique in the organization.
   *
   * @param request - The role to create
   * @returns The created role as stored, as a {@link PlatformRoleGetResponse}
   *
   * @example
   * ```typescript
   * import { PlatformRoleScopeType } from '@uipath/uipath-typescript/roles';
   *
   * const actions = await roles.getActions({ serviceName: 'AuthZ' });
   *
   * const role = await roles.create({
   *   name: 'Ticket Auditor',
   *   scopeType: PlatformRoleScopeType.Organization,
   *   description: 'Read-only access for ticket audits',
   *   actionsGrantedByRole: [actions[0].name],
   * });
   * ```
   */
  create(request: PlatformRoleCreateRequest): Promise<PlatformRoleGetResponse>;

  /**
   * Updates a custom role.
   *
   * Only the fields present in `update` are changed — omitted fields keep their
   * current values, including the granted actions. Passing `actionsGrantedByRole`
   * replaces the full set. Built-in roles cannot be updated.
   *
   * @param roleId - GUID of the role to update
   * @param update - The fields to change
   * @returns The role as stored after the update, as a {@link PlatformRoleGetResponse}
   *
   * @example Rename a role
   * ```typescript
   * const updated = await roles.updateById('<roleId>', { name: 'Ticket Managers' });
   * ```
   *
   * @example Grant an additional action
   * ```typescript
   * const role = await roles.getById('<roleId>');
   * await roles.updateById(role.id, {
   *   actionsGrantedByRole: [...role.actionDetails.map(a => a.name), 'AUTHZ.ROLE.READ'],
   * });
   * ```
   */
  updateById(roleId: string, update: PlatformRoleUpdateOptions): Promise<PlatformRoleGetResponse>;

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
   * Each item is one principal (user, group, or application) with every role assigned
   * to it at the given scope. Assignments carry their own GUID, which is what
   * `updateAssignments()` uses to revoke them. `pageSize` may not exceed 100.
   *
   * @param scope - The scope to list assignments for; `/` means the whole organization
   * @param options - Filtering and pagination options
   * @returns All assignment groups when no pagination options are given, one page otherwise, as {@link PlatformPrincipalRoleAssignments} items
   *
   * @example Basic usage
   * ```typescript
   * const assignments = await roles.getAssignments('/');
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
   * First, get role IDs with `getAll()` and principal IDs from the Users or Groups
   * service (`users.getAll()` / `groups.getAll()`).
   *
   * @param changes - The assignments to add and remove
   * @returns Resolves when the changes have been applied
   *
   * @example Grant a role to a group
   * ```typescript
   * import { PlatformPrincipalType } from '@uipath/uipath-typescript/roles';
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
   * The first row is the header; each following row is one assignment (role and
   * principal). Group-inherited access is not expanded — use `getEffectiveAccess()`
   * for a single principal's full picture.
   *
   * @returns The CSV document as a string
   *
   * @example
   * ```typescript
   * const csv = await roles.exportAssignments();
   * ```
   */
  exportAssignments(): Promise<string>;

  /**
   * Computes the roles a principal effectively holds in a tenant — directly
   * and through group membership.
   *
   * This answers "what can this principal do here": the response lists every
   * effective role together with the assignments granting it, plus metadata for
   * the granted services and roles.
   *
   * @param tenantId - GUID of the tenant to compute access in
   * @param principal - The user or group to check
   * @returns The principal's effective access, as a {@link PlatformEffectiveAccessResponse}
   *
   * @example Check a user
   * ```typescript
   * const access = await roles.getEffectiveAccess('<tenantId>', { userId: '<userId>' });
   * const isAdmin = access.roles.some(r => r.roleName === 'Administrator');
   * ```
   *
   * @example Check a group
   * ```typescript
   * const access = await roles.getEffectiveAccess('<tenantId>', { groupId: '<groupId>' });
   * ```
   */
  getEffectiveAccess(
    tenantId: string,
    principal: PlatformEffectiveAccessPrincipal
  ): Promise<PlatformEffectiveAccessResponse>;

  /**
   * Gets the catalog of permission (action) definitions roles can grant,
   * optionally filtered by owning service or level.
   *
   * Use it to pick the `actionsGrantedByRole` names when creating or updating a
   * custom role.
   *
   * @param options - Filtering options
   * @returns The action definitions, as {@link PlatformRoleAction} items
   *
   * @example
   * ```typescript
   * const actions = await roles.getActions({ serviceName: 'AuthZ' });
   * ```
   */
  getActions(options?: PlatformRoleActionGetAllOptions): Promise<PlatformRoleAction[]>;
}

/**
 * Methods attached to role objects returned by the Roles service.
 */
export interface PlatformRoleMethods {
  /**
   * Updates this role. Only the fields present in `update` are changed.
   *
   * @param update - The fields to change
   * @returns Promise resolving to the role as stored after the update
   */
  update(update: PlatformRoleUpdateOptions): Promise<PlatformRoleGetResponse>;

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
    async update(update: PlatformRoleUpdateOptions): Promise<PlatformRoleGetResponse> {
      if (!roleData.id) throw new Error('Role ID is undefined');

      return service.updateById(roleData.id, update);
    },

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
