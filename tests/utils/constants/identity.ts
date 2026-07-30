/**
 * Identity Settings test constants.
 */

export const IDENTITY_SETTING_TEST_CONSTANTS = {
  // Organization (partition) GUID — optional query param on both operations
  PARTITION_GLOBAL_ID: '88888888-8888-4888-8888-888888888888',

  // Setting keys / values
  SETTING_KEY: 'Auth.Password.DefaultLifetimeDays',
  SETTING_VALUE: '90',
  SETTING_KEY_ALT: 'Auth.Password.ShouldChangePasswordAfterFirstLogin',
  SETTING_VALUE_ALT: 'true',

  // Error messages
  ERROR_SETTING_NOT_FOUND: 'Setting not found',
  ERROR_SETTING_FORBIDDEN: 'Caller is not authorized for the requested partition',
} as const;
