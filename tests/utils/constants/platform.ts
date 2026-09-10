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
