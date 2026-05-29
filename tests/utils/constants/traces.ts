/**
 * Traces test constants used across traces service tests
 */

export const TRACES_TEST_CONSTANTS = {
  TRACE_ID: '64652c6d-a385-4612-9716-c8a9a4ce79e2',

  SPAN_ID_1: '00000000-0000-0000-0000-000000000001',

  AGENT_ID: '6f0f123e-88db-4f2a-a632-5f315f631534',

  START_TIME: '2026-01-01T00:00:00.000Z',
  END_TIME: '2026-01-01T00:01:00.000Z',
  UPDATED_AT: '2026-01-01T00:01:00.000Z',

  SPAN_NAME: 'Agent run - Agent',
  ATTRIBUTES: { type: 'agentRun', agentName: 'Agent' },
  AGENT_VERSION: '1.0.0',
  SPAN_TYPE: 'agentRun',

  FOLDER_KEY: '8709b9b7-5779-4952-b519-016db272da0a',
  ORG_ID: 'ecdee71c-7966-447e-a156-41c94eda9e3e',
  TENANT_ID: '9afe4be8-0be8-48a7-bc75-d0e3dca824fb',

  ERROR_TRACE_NOT_FOUND: 'Trace not found',
  ERROR_SPANS_NOT_FOUND: 'No spans found for trace',
} as const;
