/**
 * ChoiceSet service test constants
 * ChoiceSet-specific constants only
 */

export const CHOICESET_TEST_CONSTANTS = {
  // ChoiceSet IDs
  CHOICESET_ID: '123',

  // ChoiceSet Metadata
  CHOICESET_NAME: 'UserType',
  CHOICESET_DISPLAY_NAME: 'User Type',
  CHOICESET_DESCRIPTION: 'Denotes the type of user record in the System User entity',

  // Timestamps (RAW API format - will be transformed)
  CREATED_TIME: '2025-01-15T10:00:00Z',
  UPDATED_TIME: '2025-01-15T12:00:00Z',

  // Choice Set Value constants
  VALUE_ID: 'EEEAA51B-77E8-484A-9CD3-FC4E6EB08463',
  VALUE_NAME: 'Application',
  VALUE_DISPLAY_NAME: 'Application',
  VALUE_NUMBER_ID: 3,
} as const;

