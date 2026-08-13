/**
 * Platform test constants.
 *
 * Scope GUIDs and the theme/accessibility values mirror a real API response captured
 * during onboarding.
 */

import { PlatformSettingKey } from '../../../src/models/platform/platform.types';

export const PLATFORM_TEST_CONSTANTS = {
  // Scope GUIDs. The API calls the organization a "partition" on the wire; the SDK
  // exposes the same GUID as `organizationId`.
  ORGANIZATION_ID: 'bc2ddac5-57bc-40e6-93fe-3b319b60ce36',
  USER_ID: '81a27926-9d8d-4c62-84e5-df1c51c0b676',

  // Setting rows
  SETTING_ID: 63036,
  SETTING_KEY: PlatformSettingKey.UserTheme,
  SETTING_VALUE: 'light',
  SETTING_ID_ALT: 63051,
  SETTING_KEY_ALT: PlatformSettingKey.UserAccessibility,
  SETTING_VALUE_ALT: 'false',

  // A key the API returned nothing for — unset keys are omitted from the response
  SETTING_KEY_UNSET: PlatformSettingKey.UserAlert,

  // Structured setting: the API stores JSON as a string
  SETTING_KEY_JSON: PlatformSettingKey.UserCasePinnedInstancesByTenant,
  SETTING_VALUE_JSON: '{"CaseManagement":["instance-a","instance-b"],"DefaultTenant":[]}',

  // Error messages
  ERROR_SETTING_FORBIDDEN: 'Caller is not authorized for the requested organization',
} as const;

/**
 * Platform user test constants.
 *
 * Field values mirror a real API response captured during onboarding: camelCase wire
 * fields, numeric type/category codes, and `groupIDs` casing.
 */
export const PLATFORM_USER_TEST_CONSTANTS = {
  USER_ID: '1fb982fc-6078-408e-98ef-180739a17cc5',
  USER_ID_ALT: '83a96086-367d-49f1-8967-1911503fa31f',
  USER_NAME: 'jo.doe@example.com',
  EMAIL: 'jo.doe@example.com',
  FIRST_NAME: 'Jo',
  SURNAME: 'Doe',
  DISPLAY_NAME: 'Jo Doe',
  // Distinctive values so rename tests verify value preservation, not just field presence
  CREATION_TIME: '2025-08-12T06:41:10.0901663',
  LAST_MODIFICATION_TIME: '2025-08-12T06:41:54.1519378',
  LAST_LOGIN_TIME: '2026-07-07T08:10:28.66354',
  GROUP_ID: 'cdc34b5b-77d2-4ae1-9744-209d21ce557d',
  GROUP_ID_ALT: '35551807-06b1-4cda-90a1-2fb84851eee7',
  LEGACY_ID: 1141202,
  TOTAL_COUNT: 56,
  SEARCH_TERM: 'jo',

  // Error messages
  ERROR_USER_NOT_FOUND: 'The entity was not found.',
  ERROR_USERS_FORBIDDEN: 'Caller is not authorized to list users for the organization',
} as const;

/**
 * Platform group test constants.
 *
 * Field values mirror a real API response captured during onboarding: camelCase wire
 * fields and numeric type codes (0 = built-in, 1 = custom).
 */
export const PLATFORM_GROUP_TEST_CONSTANTS = {
  GROUP_ID: 'ce684f6f-5af3-4e43-8516-1adad6e98fc9',
  GROUP_ID_ALT: '9e18c49b-92ea-4407-969e-b32422717a6c',
  GROUP_NAME: 'Everyone',
  GROUP_NAME_ALT: 'IntegrationTestGroup',
  // Distinctive values so rename tests verify value preservation, not just field presence
  CREATION_TIME: '2025-08-04T06:05:21.8464663',
  LAST_MODIFICATION_TIME: '2025-08-04T06:05:21.8464664',
  MEMBERS_TOTAL_COUNT: 12,

  // Error messages
  ERROR_GROUP_NOT_FOUND: 'The entity was not found.',
  ERROR_GROUPS_FORBIDDEN: 'Caller is not authorized to list groups for the organization',
} as const;

/**
 * Platform directory test constants.
 *
 * Field values mirror a real API response captured during onboarding:
 * `identifier`/`identityName` wire naming and numeric type codes.
 */
export const PLATFORM_DIRECTORY_TEST_CONSTANTS = {
  SEARCH_PREFIX: 'sar',
  ENTRY_NAME: 'sarah.c@example.com',
  ENTRY_DISPLAY_NAME: 'Sarah C',
  SOURCE_LOCAL: 'local',

  // Error messages
  ERROR_DIRECTORY_FORBIDDEN: 'Caller is not authorized to search the organization directory',
} as const;

/**
 * Platform role test constants.
 *
 * Field values mirror a real Authorization service response captured during
 * onboarding: camelCase wire fields, UPPER-case role type strings, `createdOn`
 * timestamp naming.
 */
export const PLATFORM_ROLE_TEST_CONSTANTS = {
  ROLE_ID: '587d79d6-85de-4ee7-819b-1eb19b85009b',
  ROLE_NAME: 'Access Administrator',
  ROLE_DESCRIPTION: 'Access Administrator',
  SCOPE_TYPE_ORGANIZATION: 'ORGANIZATION',
  CREATED_BY: '7f36fcc2-b822-430b-ae30-5ecfbacac186',
  // Distinctive value so rename tests verify value preservation, not just field presence
  CREATED_ON: '2025-12-09T08:20:56.7703633+00:00',
  EMPTY_GUID: '00000000-0000-0000-0000-000000000000',
  OWNER_SERVICE_ID: '225374a7-f966-4e77-ba9e-588d18c51b76',
  OWNER_SERVICE_NAME: 'AuthZ',
  ACTION_ID: '2aa62290-e290-4478-807e-c94bb8aa2fc1',
  ACTION_NAME: 'AUTHZ.ACTION.READ',
  ASSIGNMENT_ID: 'eeaffca2-5456-408b-99f3-5910e800a37d',
  ASSIGNMENT_SCOPE: '/',
  PRINCIPAL_DISPLAY_NAME: 'Jo Doe',
  ROLES_TOTAL_COUNT: 86,
  CSV_EXPORT_HEADER: 'Id,RoleName,RoleId',

  // Error messages
  ERROR_ROLE_NOT_FOUND: 'Role with given ID does not exist.',
  ERROR_ROLES_FORBIDDEN: 'Caller is not authorized to manage roles for the organization',
} as const;
