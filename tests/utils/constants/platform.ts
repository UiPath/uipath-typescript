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
