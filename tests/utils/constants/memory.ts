/**
 * Memory (Agent Memory / Traceview) test constants used across memory service tests
 */

export const MEMORY_TEST_CONSTANTS = {
  START_TIME: '2026-05-01T00:00:00Z',
  END_TIME: '2026-06-01T00:00:00Z',
  TIME_SLICE_1: '2026-05-07T00:00:00Z',
  TIME_SLICE_2: '2026-05-14T00:00:00Z',

  AGENT_ID: '6f0f123e-88db-4f2a-a632-5f315f631534',
  AGENT_VERSION: '1.0.0',
  FOLDER_KEY: '8709b9b7-5779-4952-b519-016db272da0a',

  ERROR_MESSAGE: 'Failed to retrieve memory timeline',
  ERROR_MESSAGE_CALLS: 'Failed to retrieve memory calls timeline',
} as const;
