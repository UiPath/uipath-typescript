/**
 * Agent Memory test constants used across memory service tests
 */

export const MEMORY_TEST_CONSTANTS = {
  START_TIME: '2026-05-01T00:00:00Z',
  END_TIME: '2026-06-01T00:00:00Z',
  TIME_SLICE_1: '2026-05-07T00:00:00Z',
  TIME_SLICE_2: '2026-05-14T00:00:00Z',

  AGENT_ID: '6f0f123e-88db-4f2a-a632-5f315f631534',
  AGENT_VERSION: '1.0.0',
  FOLDER_KEY: '8709b9b7-5779-4952-b519-016db272da0a',

  MEMORY_SPACE_ID: '8645d674-92d8-4281-9aef-43f3e3608ded',
  MEMORY_SPACE_NAME: 'Shared memory space',
  MEMORY_SPACE_ID_2: '00000000-0000-0000-0000-000000000002',
  MEMORY_SPACE_NAME_2: 'Second memory space',
  LIMIT: 10,

  ERROR_MESSAGE: 'Failed to retrieve memory timeline',
  ERROR_MESSAGE_CALLS: 'Failed to retrieve memory calls timeline',
  ERROR_MESSAGE_SPACES: 'Failed to retrieve top memory spaces',
} as const;
