/**
 * Task service test constants
 * Task-specific constants only
 */

export const TASK_TEST_CONSTANTS = {
  // Task IDs
  TASK_ID: 123,
  TASK_ID_2: 456,
  TASK_ID_3: 789,

  // User IDs
  USER_ID: 456,
  USER_ID_2: 101,

  // Task Metadata
  TASK_TITLE: 'Test Task',
  TASK_TITLE_COMPLEX: 'Complex Task',
  TASK_TITLE_FORM: 'Form Task',
  TASK_KEY: 'TASK-123',
  TASK_KEY_PREFIX: 'TASK-',

  // User Information
  USER_NAME: 'User',
  USER_USERNAME_PREFIX: 'user',
  USER_DISPLAY_NAME_PREFIX: 'User ',
  USER_EMAIL: 'user@example.com',

  // Timestamps
  CREATION_TIME: '2025-01-15T10:00:00Z',

  // Pagination
  CURSOR_NEXT: 'next-cursor-string',

  // Task Actions
  ACTION_SUBMIT: 'submit',
  ACTION_APPROVE: 'approve',

  // Task Form Data
  FORM_DATA: {
    fieldName: 'John Doe',
    fieldEmail: 'john@example.com',
    fieldNotes: 'Completed the form'
  },

  // Task Custom Data
  CUSTOM_DATA: {
    customField: 'customValue',
    nested: { key: 'value' },
    array: [1, 2, 3]
  },

  // App Task Completion Data
  APP_TASK_DATA: {
    Content: null,
    Comment: null
  },
} as const;
