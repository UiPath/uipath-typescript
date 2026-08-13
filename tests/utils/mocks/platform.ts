/**
 * Platform mock factories.
 *
 * Shapes mirror the real API response captured during onboarding.
 */

import type { RawPlatformSetting } from '../../../src/models/platform/platform.internal-types';
import type {
  RawPlatformUser,
  RawPlatformUserListResponse,
  RawPlatformUserUpdateResult,
} from '../../../src/models/platform/users.internal-types';
import type {
  RawPlatformGroup,
  RawPlatformGroupMember,
  RawPlatformGroupMembersResponse,
} from '../../../src/models/platform/groups.internal-types';
import type {
  RawPlatformDirectoryEntry,
  RawPlatformDirectoryGroup,
} from '../../../src/models/platform/directory.internal-types';
import type {
  RawPlatformRole,
  RawPlatformRoleAction,
  RawPlatformRoleListResponse,
  RawPlatformRoleAssignment,
  RawPlatformPrincipalRoleAssignments,
  RawPlatformRoleAssignmentListResponse,
  RawPlatformEffectiveAccessResponse,
} from '../../../src/models/platform/roles.internal-types';
import {
  PLATFORM_TEST_CONSTANTS,
  PLATFORM_USER_TEST_CONSTANTS,
  PLATFORM_GROUP_TEST_CONSTANTS,
  PLATFORM_DIRECTORY_TEST_CONSTANTS,
  PLATFORM_ROLE_TEST_CONSTANTS,
} from '../constants/platform';

/**
 * Builds a single setting row in the raw wire shape — the service renames
 * `partitionGlobalId` to `organizationId`.
 */
export const createBasicPlatformSetting = (
  overrides?: Partial<RawPlatformSetting>
): RawPlatformSetting => ({
  id: PLATFORM_TEST_CONSTANTS.SETTING_ID,
  key: PLATFORM_TEST_CONSTANTS.SETTING_KEY,
  value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE,
  partitionGlobalId: PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID,
  userId: PLATFORM_TEST_CONSTANTS.USER_ID,
  ...overrides,
});

/**
 * Builds the settings list returned by a multi-key read.
 */
export const createBasicPlatformSettings = (): RawPlatformSetting[] => [
  createBasicPlatformSetting(),
  createBasicPlatformSetting({
    id: PLATFORM_TEST_CONSTANTS.SETTING_ID_ALT,
    key: PLATFORM_TEST_CONSTANTS.SETTING_KEY_ALT,
    value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE_ALT,
  }),
];

/**
 * Builds a single user in the raw wire shape: camelCase fields, `groupIDs` casing,
 * numeric `type`/`category` codes, and the internal fields the service drops.
 */
export const createBasicRawPlatformUser = (
  overrides?: Partial<RawPlatformUser>
): RawPlatformUser => ({
  id: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
  userName: PLATFORM_USER_TEST_CONSTANTS.USER_NAME,
  email: PLATFORM_USER_TEST_CONSTANTS.EMAIL,
  emailConfirmed: true,
  name: PLATFORM_USER_TEST_CONSTANTS.FIRST_NAME,
  surname: PLATFORM_USER_TEST_CONSTANTS.SURNAME,
  displayName: PLATFORM_USER_TEST_CONSTANTS.DISPLAY_NAME,
  creationTime: PLATFORM_USER_TEST_CONSTANTS.CREATION_TIME,
  lastModificationTime: PLATFORM_USER_TEST_CONSTANTS.LAST_MODIFICATION_TIME,
  lastLoginTime: PLATFORM_USER_TEST_CONSTANTS.LAST_LOGIN_TIME,
  groupIDs: [PLATFORM_USER_TEST_CONSTANTS.GROUP_ID, PLATFORM_USER_TEST_CONSTANTS.GROUP_ID_ALT],
  legacyId: PLATFORM_USER_TEST_CONSTANTS.LEGACY_ID,
  isActive: true,
  bypassBasicAuthRestriction: false,
  type: 0,
  category: 0,
  invitationAccepted: true,
  ...overrides,
});

/**
 * Builds the paged user list response in the raw wire shape. `totalCount`
 * defaults to the number of users so single-page mocks satisfy the service's
 * fetch-all loop; pass it explicitly to simulate further pages.
 */
export const createRawPlatformUserListResponse = (
  users: RawPlatformUser[] = [createBasicRawPlatformUser()],
  totalCount: number = users.length
): RawPlatformUserListResponse => ({
  totalCount,
  results: users,
});

/**
 * Builds the update result in the raw wire shape — the service renames
 * `succeeded` to `success`.
 */
export const createRawPlatformUserUpdateResult = (
  overrides?: Partial<RawPlatformUserUpdateResult>
): RawPlatformUserUpdateResult => ({
  succeeded: true,
  errors: [],
  ...overrides,
});

/**
 * Builds a single group in the raw wire shape: camelCase fields, numeric `type`
 * code, and the internal fields the service drops (`members`, `mappedRole`, `scope`).
 */
export const createBasicRawPlatformGroup = (
  overrides?: Partial<RawPlatformGroup>
): RawPlatformGroup => ({
  id: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID,
  name: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME,
  displayName: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME,
  type: 0,
  creationTime: PLATFORM_GROUP_TEST_CONSTANTS.CREATION_TIME,
  lastModificationTime: PLATFORM_GROUP_TEST_CONSTANTS.LAST_MODIFICATION_TIME,
  members: [],
  mappedRole: null,
  scope: null,
  ...overrides,
});

/**
 * Builds a single group member reference in the raw wire shape — numeric `type` code.
 */
export const createBasicRawPlatformGroupMember = (
  overrides?: Partial<RawPlatformGroupMember>
): RawPlatformGroupMember => ({
  id: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
  type: 0,
  ...overrides,
});

/**
 * Builds the paged group members response in the raw wire shape. `totalCount`
 * defaults to the number of members so single-page mocks satisfy the service's
 * fetch-all loop; pass it explicitly to simulate further pages.
 */
export const createRawPlatformGroupMembersResponse = (
  members: RawPlatformGroupMember[] = [createBasicRawPlatformGroupMember()],
  totalCount: number = members.length
): RawPlatformGroupMembersResponse => ({
  totalCount,
  results: members,
});

/**
 * Builds a directory search result in the raw wire shape: `identifier`/`identityName`
 * naming, numeric `type` code, and the redundant `objectType` the service drops.
 */
export const createBasicRawPlatformDirectoryEntry = (
  overrides?: Partial<RawPlatformDirectoryEntry>
): RawPlatformDirectoryEntry => ({
  source: PLATFORM_DIRECTORY_TEST_CONSTANTS.SOURCE_LOCAL,
  identifier: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
  identityName: PLATFORM_DIRECTORY_TEST_CONSTANTS.ENTRY_NAME,
  displayName: PLATFORM_DIRECTORY_TEST_CONSTANTS.ENTRY_DISPLAY_NAME,
  email: PLATFORM_DIRECTORY_TEST_CONSTANTS.ENTRY_NAME,
  domain: null,
  type: 0,
  objectType: 'DirectoryUser',
  ...overrides,
});

/**
 * Builds a membership-check result in the raw wire shape.
 */
export const createBasicRawPlatformDirectoryGroup = (
  overrides?: Partial<RawPlatformDirectoryGroup>
): RawPlatformDirectoryGroup => ({
  objectType: 'DirectoryGroup',
  externalId: null,
  source: PLATFORM_DIRECTORY_TEST_CONSTANTS.SOURCE_LOCAL,
  identifier: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_ID,
  name: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME,
  email: null,
  displayName: PLATFORM_GROUP_TEST_CONSTANTS.GROUP_NAME,
  ...overrides,
});

/**
 * Builds an action definition in the raw wire shape, including the internal
 * `originalResourceAction` the service drops.
 */
export const createBasicRawPlatformRoleAction = (
  overrides?: Partial<RawPlatformRoleAction>
): RawPlatformRoleAction => ({
  id: PLATFORM_ROLE_TEST_CONSTANTS.ACTION_ID,
  name: PLATFORM_ROLE_TEST_CONSTANTS.ACTION_NAME,
  namespace: 'AUTHZ',
  serviceDisplayName: 'Authorization',
  resourceType: 'Action',
  resourceAction: 'Read',
  resourceGroup: 'Action',
  description: 'Read all Actions',
  scopeType: 'ANY',
  originalResourceAction: null,
  ...overrides,
});

/**
 * Builds a role in the raw wire shape: `createdOn` naming and UPPER-case type.
 */
export const createBasicRawPlatformRole = (
  overrides?: Partial<RawPlatformRole>
): RawPlatformRole => ({
  id: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID,
  name: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME,
  description: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_DESCRIPTION,
  type: 'BUILTIN',
  scopeType: PLATFORM_ROLE_TEST_CONSTANTS.SCOPE_TYPE_ORGANIZATION,
  createdBy: PLATFORM_ROLE_TEST_CONSTANTS.CREATED_BY,
  createdOn: PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON,
  tenantId: PLATFORM_ROLE_TEST_CONSTANTS.EMPTY_GUID,
  ownerServiceId: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_ID,
  ownerServiceName: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME,
  actionDetails: [createBasicRawPlatformRoleAction()],
  ...overrides,
});

/**
 * Builds the paged role list response in the raw wire shape. `totalCount`
 * defaults to the number of roles so single-page mocks satisfy the service's
 * fetch-all loop; pass it explicitly to simulate further pages.
 */
export const createRawPlatformRoleListResponse = (
  roles: RawPlatformRole[] = [createBasicRawPlatformRole()],
  totalCount: number = roles.length
): RawPlatformRoleListResponse => ({
  totalCount,
  results: roles,
});

/**
 * Builds a role assignment in the raw wire shape.
 */
export const createBasicRawPlatformRoleAssignment = (
  overrides?: Partial<RawPlatformRoleAssignment>
): RawPlatformRoleAssignment => ({
  id: PLATFORM_ROLE_TEST_CONSTANTS.ASSIGNMENT_ID,
  securityPrincipalId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
  securityPrincipalType: 'User',
  type: 'Custom',
  scope: PLATFORM_ROLE_TEST_CONSTANTS.ASSIGNMENT_SCOPE,
  roleId: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID,
  roleName: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME,
  roleType: 'BUILTIN',
  createdBy: PLATFORM_ROLE_TEST_CONSTANTS.CREATED_BY,
  createdOn: PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON,
  inherited: false,
  mutable: true,
  ...overrides,
});

/**
 * Builds one principal's assignment group in the raw wire shape — the service
 * renames `roleAssignmentDtos` to `roleAssignments`.
 */
export const createBasicRawPlatformPrincipalRoleAssignments = (
  overrides?: Partial<RawPlatformPrincipalRoleAssignments>
): RawPlatformPrincipalRoleAssignments => ({
  securityPrincipalId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
  roleAssignmentDtos: [createBasicRawPlatformRoleAssignment()],
  displayName: PLATFORM_ROLE_TEST_CONSTANTS.PRINCIPAL_DISPLAY_NAME,
  email: PLATFORM_USER_TEST_CONSTANTS.EMAIL,
  type: 'DirectoryUser',
  source: 'local',
  ...overrides,
});

/**
 * Builds the paged role assignments response in the raw wire shape.
 */
export const createRawPlatformRoleAssignmentListResponse = (
  groups: RawPlatformPrincipalRoleAssignments[] = [createBasicRawPlatformPrincipalRoleAssignments()],
  totalCount: number = groups.length
): RawPlatformRoleAssignmentListResponse => ({
  totalCount,
  results: groups,
});

/**
 * Builds the effective-access response envelope in the raw wire shape.
 */
export const createRawPlatformEffectiveAccessResponse = (
  overrides?: Partial<RawPlatformEffectiveAccessResponse>
): RawPlatformEffectiveAccessResponse => ({
  roleAssignments: {
    totalCount: 1,
    results: [{
      roleId: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID,
      tenantId: null,
      roleName: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME,
      serviceName: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME,
      serviceId: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_ID,
      roleType: 'BUILTIN',
      roleAssignments: [{
        roleId: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID,
        securityPrincipalId: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
        organizationId: PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID,
        tenantId: null,
        createdOn: PLATFORM_ROLE_TEST_CONSTANTS.CREATED_ON,
        roleName: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME,
        securityPrincipalType: 'User',
        roleType: 'BUILTIN',
        serviceName: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_NAME,
        serviceId: PLATFORM_ROLE_TEST_CONSTANTS.OWNER_SERVICE_ID,
        scope: PLATFORM_ROLE_TEST_CONSTANTS.ASSIGNMENT_SCOPE,
        folderName: null,
      }],
    }],
  },
  grantedServicesMetadata: [],
  grantedRolesMetadata: [{ id: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_ID, roleName: PLATFORM_ROLE_TEST_CONSTANTS.ROLE_NAME }],
  ...overrides,
});
