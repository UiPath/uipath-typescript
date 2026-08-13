/**
 * Platform role types — request/response shapes for role and role-assignment
 * management (Authorization service).
 */

import type { PaginationOptions } from '../../utils/pagination';

/**
 * Whether a role ships with the platform or was created in the organization.
 */
export enum PlatformRoleType {
  /** Ships with the platform; cannot be modified or deleted. */
  BuiltIn = 'BUILTIN',
  /** Created in the organization. */
  Custom = 'CUSTOM',
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
  /** Scope level the action applies at; `null` when unrestricted. */
  scopeType: string | null;
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
  /** Whether the role is built-in or custom. */
  type: PlatformRoleType;
  /** Scope level the role applies at (e.g. `ORGANIZATION`, `TENANT`). */
  scopeType: string;
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
  /** Returns only roles applying at this scope level (e.g. `ORGANIZATION`, `TENANT`). */
  scopeType?: string;
  /** Returns only roles owned by this service. */
  serviceName?: string;
  /** Returns only roles whose name contains the text. */
  contains?: string;
  /** Returns only roles of this tenant. */
  tenantId?: string;
  /** Returns only built-in or only custom roles. */
  roleType?: PlatformRoleType;
};

/**
 * A custom role to create or update via `roles.upsert()`.
 */
export interface PlatformRoleUpsertRequest {
  /** GUID of the role to update; omit to create a new role. */
  id?: string;
  /** Role name. */
  roleName: string;
  /** Scope level the role applies at (e.g. `ORGANIZATION`, `TENANT`). */
  roleScopeType: string;
  /** Organization (account) GUID the role belongs to. */
  organizationId: string;
  /** Human-readable description. */
  roleDescription: string;
  /** Name of the service that owns the role. */
  roleService?: string;
  /** Tenant the role belongs to, for tenant-scoped roles. */
  tenantId?: string;
  /** Fully qualified names of the actions the role grants (e.g. `AUTHZ.ROLE.READ`) — pick them from `roles.getActions()`. */
  actionsGrantedByRole?: string[];
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
  securityPrincipalType: string;
  /** How the assignment was created (`BuiltIn` or `Custom`). */
  type: string;
  /** The scope the role is granted at (`/` = whole organization). */
  scope: string;
  /** GUID of the granted role. */
  roleId: string;
  /** Name of the granted role. */
  roleName: string;
  /** Whether the granted role is built-in or custom. */
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
 * Options for `roles.getAssignments()`.
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
 * A request for `roles.getEffectiveAccess()` — the principal and tenant scope
 * to compute access for.
 */
export interface PlatformEffectiveAccessRequest {
  /** Tenant GUID to compute access in. */
  tenantId: string;
  /** GUID of the user to check. Provide exactly one of `userId` / `groupId`. */
  userId?: string;
  /** GUID of the group to check. Provide exactly one of `userId` / `groupId`. */
  groupId?: string;
}

/**
 * A role a principal effectively holds, with the assignments granting it.
 */
export interface PlatformEffectiveRole {
  /** GUID of the role. */
  roleId: string;
  /** Name of the role. */
  roleName: string | null;
  /** Whether the role is built-in or custom. */
  roleType: string | null;
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
  securityPrincipalType: string | null;
  /** Whether the granted role is built-in or custom. */
  roleType: string | null;
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
  /** Returns only actions applying at this scope level. */
  scopeType?: string;
}
