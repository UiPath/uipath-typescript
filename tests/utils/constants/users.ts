/**
 * Identity Users test constants.
 */

export const USER_TEST_CONSTANTS = {
  // User identifiers
  USER_ID: '1fb982fc-6078-408e-98ef-180739a17cc5',

  // Group GUIDs
  GROUP_ID: '35551807-06b1-4cda-90a1-2fb84851eee7',

  // Profile fields
  USER_NAME: 'jdoe',
  EMAIL: 'jdoe@acme.com',
  FIRST_NAME: 'Jane',
  LAST_NAME: 'Doe',
  DISPLAY_NAME: 'Jane Doe',

  // Timestamps (distinctive values so rename tests verify value preservation)
  CREATION_TIME: '2025-08-12T06:41:10.0901663',
  LAST_MODIFICATION_TIME: '2025-08-12T06:41:54.1519378',
  LAST_LOGIN_TIME: '2026-07-07T08:10:28.66354',

  // Internal API field dropped by the SDK
  LEGACY_ID: 1141202,

  // Error messages
  ERROR_USER_NOT_FOUND: 'User not found',
} as const;
