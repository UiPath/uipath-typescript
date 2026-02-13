/**
 * User service test constants.
 */
export const USER_TEST_CONSTANTS = {
  USER_ID: 321,
  USER_NAME: 'Jane',
  USER_SURNAME: 'Doe',
  USER_FULL_NAME: 'Jane Doe',
  USERNAME: 'jane.doe',
  USER_EMAIL: 'jane.doe@uipath.com',
  USER_KEY: '12345678-1234-1234-1234-123456789abc',
  CREATED_TIME: '2024-01-01T09:00:00Z',
  ERROR_USER_NOT_FOUND: 'User not found',
  ODATA_SELECT_FIELDS: 'id,userName,emailAddress',
  ODATA_EXPAND_FIELDS: 'UserRoles'
} as const;
