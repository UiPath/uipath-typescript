/**
 * Platform role field mappings.
 */

import { PlatformRoleType } from './roles.types';

/**
 * Semantic renames applied to roles and role assignments — standard `*Time`
 * timestamp naming.
 */
export const PlatformRoleMap = {
  createdOn: 'createdTime',
} as const;

/**
 * Normalizes the role-type strings to {@link PlatformRoleType}. The API is
 * inconsistent across endpoints — lists return `BUILTIN`/`CUSTOM` while
 * single-role reads return `BuiltIn`/`Custom` (live-verified).
 */
export const PlatformRoleTypeMap: { [key: string]: PlatformRoleType } = {
  BUILTIN: PlatformRoleType.BuiltIn,
  CUSTOM: PlatformRoleType.Custom,
  BuiltIn: PlatformRoleType.BuiltIn,
  Custom: PlatformRoleType.Custom,
};

/**
 * Semantic renames applied to per-principal assignment groups — drops the
 * `Dto` wire jargon.
 */
export const PlatformPrincipalRoleAssignmentsMap = {
  roleAssignmentDtos: 'roleAssignments',
} as const;

/**
 * Outbound renames for `roles.updateAssignments()` — SDK `toAdd`/`toDelete`
 * become the API's `roleAssignmentsTo*` names. Used with `transformRequest()`,
 * which reverses the map (SDK name → wire name).
 */
export const PlatformRoleAssignmentChangesMap = {
  roleAssignmentsToAdd: 'toAdd',
  roleAssignmentsToDelete: 'toDelete',
} as const;
