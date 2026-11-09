/** Decisions test constants used across Decisions service tests. */
export const DECISIONS_TEST_CONSTANTS = {
  TRACE_ID: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  DECISION_ID: '0123456789abcdef',
  DECISION_ID_2: 'fedcba9876543210',
  FOLDER_KEY: '00000000-0000-0000-0000-000000000001',
  FEEDBACK_ID: '11111111-1111-1111-1111-111111111111',
  ORIGIN: 'DecisionsApi',
  PROCESS_KEY: 'my-process',
  PROCESS_NAME: 'My Process',
  CREATED_AT: '2026-01-01T00:00:00.000Z',
  UPDATED_AT: '2026-01-02T00:00:00.000Z',

  ERROR_DECISION_NOT_FOUND: 'Decision not found',

  INVALID_TRACE_ID: 'not-32-hex',
  INVALID_DECISION_ID: 'not-16-hex',
} as const;
