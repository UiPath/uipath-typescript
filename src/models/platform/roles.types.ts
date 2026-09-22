/**
 * Platform role types — request/response shapes for role and role-assignment
 * management (Authorization service).
 */

import type { PaginationOptions } from '../../utils/pagination';

/**
 * Who defines a role.
 */
export enum PlatformRoleType {
  /** Ships with the platform; cannot be modified or deleted. */
  BuiltIn = 'BUILTIN',
  /** Provided by the platform for cross-service access; cannot be modified or deleted. */
  Platform = 'PLATFORM',
  /** Created in the organization. */
  Custom = 'CUSTOM',
}

/**
 * The level a role applies at.
 */
export enum PlatformRoleScopeType {
  /** Applies across the whole organization. */
  Organization = 'ORGANIZATION',
  /** Applies within one tenant. */
  Tenant = 'TENANT',
  /** Applies within one project. */
  Project = 'PROJECT',
  /** Applies within one process. */
  Process = 'PROCESS',
  /** Applies within one app. */
  App = 'APP',
  /** Grants permissions at more than one level. */
  Mixed = 'MIXED',
}

/**
 * The level a permission (action) applies at.
 */
export enum PlatformActionScopeType {
  /** Can be granted at any level. */
  Any = 'ANY',
  /** Not tied to a level. */
  None = 'NONE',
  Organization = 'ORGANIZATION',
  Tenant = 'TENANT',
  Folder = 'FOLDER',
  Project = 'PROJECT',
  Process = 'PROCESS',
}

/**
 * The kind of principal a role assignment targets.
 */
export enum PlatformPrincipalType {
  User = 'User',
  Group = 'Group',
  ExternalApplication = 'ExternalApplication',
  Robot = 'Robot',
}

/**
 * Fields roles can be sorted by in `roles.getAll()`.
 */
export enum PlatformRoleSortField {
  Id = 'Id',
  Name = 'OriginalRoleName',
  UniqueName = 'UniqueName',
  Description = 'Description',
  Type = 'Type',
  ScopeType = 'ScopeType',
  OrganizationId = 'OrganizationId',
  TenantId = 'TenantId',
  OwnerService = 'OwnerService',
  OwnerServiceId = 'OwnerServiceId',
  CreatedBy = 'CreatedBy',
  CreatedTime = 'CreatedOn',
  UpdatedBy = 'UpdatedBy',
  UpdatedTime = 'UpdatedOn',
}

/**
 * Sort direction for `roles.getAll()`.
 */
export enum PlatformRoleSortOrder {
  Ascending = 'Asc',
  Descending = 'Desc',
}

/**
 * A permission (action) a role can grant.
 */
export interface PlatformRoleAction {
  /** GUID of the action definition. */
  id: string;
  /** Fully qualified action name (e.g. `AUTHZ.ROLE.READ`). */
  name: string;
  /** Namespace of the owning service. */
  namespace: string;
  /** Display name of the owning service. */
  serviceDisplayName: string;
  /** The resource the action applies to. */
  resourceType: string;
  /** The operation on the resource (e.g. `Read`, `Update`). */
  resourceAction: string;
  /** UI grouping of the action. */
  resourceGroup: string;
  /** Human-readable description. */
  description: string;
  /** Level the action applies at; `null` when unrestricted. */
  scopeType: PlatformActionScopeType | null;
}

/**
 * A role, before entity methods are attached.
 */
export interface RawPlatformRoleGetResponse {
  /** GUID of the role. */
  id: string;
  /** Role name. */
  name: string;
  /** Human-readable description. */
  description: string;
  /** Who defines the role. */
  type: PlatformRoleType;
  /** Level the role applies at. */
  scopeType: PlatformRoleScopeType;
  /** GUID of the user who created the role. */
  createdBy: string;
  /** When the role was created. */
  createdTime: string;
  /** Tenant the role belongs to; the empty GUID for organization-level roles. */
  tenantId: string;
  /** GUID of the service that owns the role. */
  ownerServiceId: string;
  /** Name of the service that owns the role. */
  ownerServiceName: string;
  /** The permissions the role grants. */
  actionDetails: PlatformRoleAction[];
}

/**
 * Options for `roles.getAll()`.
 */
export type PlatformRoleGetAllOptions = PaginationOptions & {
  /** Returns only roles applying at this level. */
  scopeType?: PlatformRoleScopeType;
  /** Returns only roles owned by this service. */
  serviceName?: string;
  /** Returns only roles whose name contains the text. */
  contains?: string;
  /** Returns only roles of this tenant. */
  tenantId?: string;
  /** Returns only roles of this type. */
  roleType?: PlatformRoleType;
  /** Field to sort by. */
  sortBy?: PlatformRoleSortField;
  /** Sort direction. */
  sortOrder?: PlatformRoleSortOrder;
};

/**
 * A custom role to create via `roles.create()`.
 */
export interface PlatformRoleCreateRequest {
  /** Role name; must be unique in the organization. */
  name: string;
  /** Level the role applies at. */
  scopeType: PlatformRoleScopeType;
  /** Human-readable description. */
  description: string;
  /** Fully qualified names of the actions the role grants (e.g. `AUTHZ.ROLE.READ`) — pick them from `roles.getActions()`. */
  actionsGrantedByRole: string[];
  /** Name of the service that owns the role. */
  ownerServiceName?: string;
  /** Tenant the role belongs to, for tenant-scoped roles. */
  tenantId?: string;
}

/**
 * Fields to change on a custom role via `roles.updateById()`. Only the fields
 * present are changed — omitted fields keep their current values.
 */
export interface PlatformRoleUpdateOptions {
  /** New role name. */
  name?: string;
  /** New level the role applies at. */
  scopeType?: PlatformRoleScopeType;
  /** New description. */
  description?: string;
  /** Replaces the full set of granted actions — pick names from `roles.getActions()`. */
  actionsGrantedByRole?: string[];
  /** Name of the service that owns the role. */
  ownerServiceName?: string;
  /** Tenant the role belongs to, for tenant-scoped roles. */
  tenantId?: string;
}

/**
 * A role assignment — a role granted to a principal at a scope.
 */
export interface PlatformRoleAssignment {
  /** GUID of the assignment. */
  id: string;
  /** GUID of the principal (user, group, external app, or robot). */
  securityPrincipalId: string;
  /** The kind of principal. */
  securityPrincipalType: PlatformPrincipalType;
  /**
   * Who created the assignment: the platform (built-in) or an administrator (custom).
   * Independent of `roleType`, which describes the granted role — an administrator can
   * assign a built-in role, giving a custom assignment of a built-in role.
   */
  type: PlatformRoleType;
  /** The scope the role is granted at (`/` = whole organization). */
  scope: string;
  /** GUID of the granted role. */
  roleId: string;
  /** Name of the granted role. */
  roleName: string;
  /** Who defines the granted role. */
  roleType: PlatformRoleType;
  /** GUID of the user who created the assignment. */
  createdBy: string;
  /** When the assignment was created. */
  createdTime: string;
  /** Whether the assignment is inherited from a wider scope. */
  inherited: boolean;
  /** Whether the assignment can be removed. */
  mutable: boolean;
}

/**
 * The role assignments of one principal, as returned by `roles.getAssignments()`.
 */
export interface PlatformPrincipalRoleAssignments {
  /** GUID of the principal. */
  securityPrincipalId: string;
  /** The principal's role assignments in the requested scope. */
  roleAssignments: PlatformRoleAssignment[];
  /** Display name of the principal. */
  displayName: string;
  /** Email address; `null` for groups and applications. */
  email: string | null;
  /** The kind of principal (e.g. `DirectoryUser`, `DirectoryGroup`). */
  type: string;
  /** Where the principal is provisioned from (e.g. `local`). */
  source: string;
}

/**
 * Options for `roles.getAssignments()`. `pageSize` may not exceed 100.
 */
export type PlatformRoleAssignmentGetAllOptions = PaginationOptions & {
  /** Returns only assignments for roles owned by this service. */
  serviceName?: string;
  /** Returns only assignments of this principal. */
  securityPrincipalId?: string;
  /** Returns only assignments of these roles. */
  roleIds?: string[];
  /** Excludes assignments inherited from wider scopes. */
  noInheritance?: boolean;
};

/**
 * A role assignment to add via `roles.updateAssignments()`.
 */
export interface PlatformRoleAssignmentAdd {
  /** GUID of the role to grant. */
  roleId: string;
  /** GUID of the principal to grant the role to. */
  securityPrincipalId: string;
  /** The kind of principal. */
  securityPrincipalType: PlatformPrincipalType;
  /** The scope to grant at (`/` = whole organization). Defaults to the role's scope. */
  scope?: string;
  /** Tenant of the assignment, for tenant-scoped roles. */
  tenantId?: string;
}

/**
 * Assignment changes for `roles.updateAssignments()` — applied atomically.
 */
export interface PlatformRoleAssignmentChanges {
  /** Assignments to add. */
  toAdd?: PlatformRoleAssignmentAdd[];
  /** GUIDs of assignments to remove. */
  toDelete?: string[];
}

/**
 * The principal to compute access for in `roles.getEffectiveAccess()` — a user
 * or a group, never both.
 */
export type PlatformEffectiveAccessPrincipal =
  | {
      /** GUID of the user to check. */
      userId: string;
      groupId?: never;
    }
  | {
      /** GUID of the group to check. */
      groupId: string;
      userId?: never;
    };

/**
 * A role a principal effectively holds, with the assignments granting it.
 */
export interface PlatformEffectiveRole {
  /** GUID of the role. */
  roleId: string;
  /** Name of the role. */
  roleName: string | null;
  /** Who defines the role. */
  roleType: PlatformRoleType | null;
  /** Tenant the role applies in. */
  tenantId: string | null;
  /** Name of the service that owns the role. */
  serviceName: string | null;
  /** GUID of the service that owns the role. */
  serviceId: string;
  /** The assignments granting the role. */
  assignments: PlatformEffectiveRoleAssignment[];
}

/**
 * One assignment contributing to a principal's effective access.
 */
export interface PlatformEffectiveRoleAssignment {
  /** GUID of the granted role. */
  roleId: string;
  /** GUID of the principal the role is granted to (may be a group the user is in). */
  securityPrincipalId: string;
  /** Organization the assignment belongs to. */
  organizationId: string;
  /** Tenant of the assignment. */
  tenantId: string | null;
  /** When the assignment was created. */
  createdTime: string;
  /** Name of the granted role. */
  roleName: string | null;
  /** The kind of principal the role is granted to. */
  securityPrincipalType: PlatformPrincipalType | null;
  /** Who defines the granted role. */
  roleType: PlatformRoleType | null;
  /** Name of the service that owns the role. */
  serviceName: string | null;
  /** GUID of the service that owns the role. */
  serviceId: string;
  /** The scope the role is granted at. */
  scope: string | null;
  /** Folder name, for folder-scoped assignments. */
  folderName: string | null;
}

/**
 * Metadata for a service a principal has access in.
 */
export interface PlatformServiceMetadata {
  /** GUID of the service. */
  id: string;
  /** Service name. */
  serviceName: string | null;
  /** Display name of the service. */
  serviceDisplayName: string | null;
  /** Service type. */
  serviceType: string | null;
}

/**
 * Metadata for a role a principal holds.
 */
export interface PlatformRoleMetadata {
  /** GUID of the role. */
  id: string;
  /** Name of the role. */
  roleName: string | null;
}

/**
 * A principal's effective access in a scope, as returned by
 * `roles.getEffectiveAccess()`.
 */
export interface PlatformEffectiveAccessResponse {
  /** The roles the principal effectively holds, with the granting assignments. */
  roles: PlatformEffectiveRole[];
  /** Total number of effective roles. */
  totalCount: number;
  /** Metadata for every service the principal has access in. */
  grantedServices: PlatformServiceMetadata[];
  /** Metadata for every role the principal holds. */
  grantedRoles: PlatformRoleMetadata[];
}

/**
 * Options for `roles.getActions()`.
 */
export interface PlatformRoleActionGetAllOptions {
  /** Returns only actions owned by this service. */
  serviceName?: string;
  /** Returns only actions applying at this level. */
  scopeType?: PlatformActionScopeType;
}
