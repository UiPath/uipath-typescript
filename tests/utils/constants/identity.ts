/**
 * Identity test constants.
 *
 * Values mirror a real API response captured during onboarding.
 */

export const IDENTITY_TEST_CONSTANTS = {
  // Scope GUIDs — optional query params on both operations
  PARTITION_GLOBAL_ID: 'bc2ddac5-57bc-40e6-93fe-3b319b60ce36',
  USER_ID: '81a27926-9d8d-4c62-84e5-df1c51c0b676',

  // Setting rows
  SETTING_ID: 63036,
  SETTING_KEY: 'UserTheme.Theme',
  SETTING_VALUE: 'light',
  SETTING_ID_ALT: 63051,
  SETTING_KEY_ALT: 'UserAccessibility.Accessibility',
  SETTING_VALUE_ALT: 'false',

  // A key the API returns nothing for — unset keys are omitted from the response
  SETTING_KEY_UNSET: 'UserAlert.AlertDuration',

  // Structured setting: the API stores JSON as a string
  SETTING_KEY_JSON: 'Favorites',
  SETTING_VALUE_JSON: '{"adetenant":["admin","home"],"DefaultTenant":["actions"]}',

  // Error messages
  ERROR_SETTING_NOT_FOUND: 'Setting not found',
  ERROR_SETTING_FORBIDDEN: 'Caller is not authorized for the requested partition',
} as const;
