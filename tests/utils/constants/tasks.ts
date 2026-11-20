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

  // Task Schema
  TASK_SCHEMA_KEY: '8e4f2a91-3c7e-4d2b-9b5c-1a6f8d3e2c91',
  TASK_SCHEMA_NAME: 'Invoice Approval',
  TASK_SCHEMA_BODY: { inputs: [{ id: 'invoice' }], outcomes: [{ name: 'Approve' }] },
  TASK_SCHEMA_JOB_PROCESS_NAME: 'InvoiceProcess',
  TASK_SCHEMA_FOLDER_KEY: 'd1f37437-7cbd-457f-857f-b7a1b0627839',
  TASK_SCHEMA_PROCESS_KEY: '5b1d6c3a-9f2e-4a7b-8c1d-2e3f4a5b6c7d',
  ERROR_TASK_SCHEMA_NOT_FOUND: 'Task schema not found',
  TASK_GUID_KEY: '5310d617-2d27-4d7f-9ba7-0af82aa29df8',
  APP_TASK_SCHEMA: {
    inputs: [
      { key: '6a7af829-41dc-523c-b6bc-9a63d4600a9e', name: 'InvoiceNumber', isList: false, customType: null, version: 0, required: false, type: 'String', typeNamespace: 'System', properties: [], collectionDataType: null },
    ],
    outputs: [
      { key: '27b8f7a2-21ce-59a5-b9cc-6a585b2035a3', name: 'Comment', isList: false, customType: null, version: 0, required: true, type: 'String', typeNamespace: 'System', properties: [], collectionDataType: null },
    ],
    inOuts: [],
    outcomes: [
      { key: '010ad993-227d-5eca-8cd8-ffad9a3889fc', name: 'Approve', isList: false, customType: null, version: 0, required: false, type: 'String', typeNamespace: 'System', properties: [], collectionDataType: null },
    ],
  },
} as const;
