/**
 * Internal Platform role types — raw API wire shapes before transformation.
 */

/**
 * A role exactly as the API returns it: `createdOn` timestamp naming and the
 * internal `originalResourceAction` on each action, which the SDK drops.
 */
export interface RawPlatformRole {
  id: string;
  name: string;
  description: string;
  type: string;
  scopeType: string;
  createdBy: string;
  createdOn: string;
  tenantId: string;
  ownerServiceId: string;
  ownerServiceName: string;
  actionDetails: RawPlatformRoleAction[];
}

/**
 * An action definition exactly as the API returns it.
 */
export interface RawPlatformRoleAction {
  id: string;
  name: string;
  namespace: string;
  serviceDisplayName: string;
  resourceType: string;
  resourceAction: string;
  resourceGroup: string;
  description: string;
  scopeType: string | null;
  originalResourceAction: string | null;
}

/**
 * Wire shape of the paged role list response.
 */
export interface RawPlatformRoleListResponse {
  totalCount: number;
  results: RawPlatformRole[];
}

/**
 * Wire shape of the role create-or-update result — only the role ID is
 * returned; the SDK follows up with a read to return the stored role.
 */
export interface RawPlatformRoleUpsertResult {
  createdRoleId: string;
}

/**
 * A role assignment exactly as the API returns it.
 */
export interface RawPlatformRoleAssignment {
  id: string;
  securityPrincipalId: string;
  securityPrincipalType: string;
  type: string;
  scope: string;
  roleId: string;
  roleName: string;
  roleType: string;
  createdBy: string;
  createdOn: string;
  inherited: boolean;
  mutable: boolean;
}

/**
 * One principal's assignments exactly as the API returns them — the SDK
 * renames `roleAssignmentDtos` to `roleAssignments`.
 */
export interface RawPlatformPrincipalRoleAssignments {
  securityPrincipalId: string;
  roleAssignmentDtos: RawPlatformRoleAssignment[];
  displayName: string;
  email: string | null;
  type: string;
  source: string;
}

/**
 * Wire shape of the paged role assignments response.
 */
export interface RawPlatformRoleAssignmentListResponse {
  totalCount: number;
  results: RawPlatformPrincipalRoleAssignments[];
}

/**
 * An effective-access assignment exactly as the API returns it.
 */
export interface RawPlatformEffectiveRoleAssignment {
  roleId: string;
  securityPrincipalId: string;
  organizationId: string;
  tenantId: string | null;
  createdOn: string;
  roleName: string | null;
  securityPrincipalType: string | null;
  roleType: string | null;
  serviceName: string | null;
  serviceId: string;
  scope: string | null;
  folderName: string | null;
}

/**
 * One effective role group exactly as the API returns it.
 */
export interface RawPlatformEffectiveRole {
  roleId: string;
  tenantId: string | null;
  roleName: string | null;
  serviceName: string | null;
  serviceId: string;
  roleType: string | null;
  roleAssignments: RawPlatformEffectiveRoleAssignment[] | null;
}

/**
 * Wire shape of the effective-access response envelope.
 */
export interface RawPlatformEffectiveAccessResponse {
  roleAssignments: {
    totalCount: number;
    results: RawPlatformEffectiveRole[];
  };
  grantedServicesMetadata: RawPlatformServiceMetadata[] | null;
  grantedRolesMetadata: RawPlatformRoleMetadata[] | null;
}

/**
 * Service metadata exactly as the API returns it.
 */
export interface RawPlatformServiceMetadata {
  id: string;
  serviceName: string | null;
  serviceDisplayName: string | null;
  serviceType: string | null;
}

/**
 * Role metadata exactly as the API returns it.
 */
export interface RawPlatformRoleMetadata {
  id: string;
  roleName: string | null;
}
