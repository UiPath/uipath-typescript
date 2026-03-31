/**
 * Feedback test constants used across feedback service tests
 */

export const FEEDBACK_TEST_CONSTANTS = {
  // Feedback identifiers
  FEEDBACK_ID: 'feedback-1',
  FEEDBACK_ID_2: 'feedback-2',

  // Agent identifiers (string UUID for feedback API)
  AGENT_UUID: 'agent-789',

  // Feedback category identifiers
  CATEGORY_ID: 'category-1',
  CATEGORY_NAME: 'Output',

  // Error messages
  ERROR_FEEDBACK_NOT_FOUND: 'Feedback not found',
} as const;
