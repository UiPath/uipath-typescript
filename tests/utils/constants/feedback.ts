/**
 * Feedback test constants used across feedback service tests
 */

export const FEEDBACK_TEST_CONSTANTS = {
  // Feedback identifiers
  FEEDBACK_ID: 'feedback-1',
  FEEDBACK_ID_2: 'feedback-2',

  // Folder key for authorization
  FOLDER_KEY: '00000000-0000-0000-0000-000000000001',

  // Agent identifiers (string UUID for feedback API)
  AGENT_UUID: 'agent-789',

  // Trace / span identifiers
  TRACE_ID: 'trace-abc-123',
  SPAN_ID: 'span-def-456',

  // Feedback category identifiers
  CATEGORY_ID: 'category-1',
  CATEGORY_NAME: 'Output',

  // Error messages
  ERROR_FEEDBACK_NOT_FOUND: 'Feedback not found',
  ERROR_CATEGORY_NOT_FOUND: 'Category not found',

  // Category name for create tests
  CATEGORY_NAME_CUSTOM: 'Hallucination',
} as const;
