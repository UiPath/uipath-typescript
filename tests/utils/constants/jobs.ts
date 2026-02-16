/**
 * Test constants for Jobs service
 */

export const JOB_TEST_CONSTANTS = {
  // Job identifiers
  JOB_ID: 12345,
  JOB_KEY: '8a4f2e6c-1b3d-4a5e-9c7f-0d2e8b6a4c1f',
  JOB_ID_2: 12346,
  JOB_KEY_2: '9b5g3f7d-2c4e-5b6f-0d8g-1e3f9c7b5d2g',

  // Process info
  PROCESS_NAME: 'TestAutomation',
  PROCESS_VERSION_ID: 100,

  // Timestamps
  TIME: '2025-03-10T14:30:00.00Z',
  START_TIME: '2025-03-10T14:30:00.00Z',
  END_TIME: '2025-03-10T14:35:00.00Z',

  // Job properties
  BATCH_EXECUTION_KEY: 'batch-test-key',
  REFERENCE: 'test-job-reference',
  HOST_MACHINE_NAME: 'WORKER-01',
  LOCAL_SYSTEM_ACCOUNT: 'NT AUTHORITY\\SYSTEM',
  RUNTIME_TYPE: 'Unattended',
  INPUT_ARGUMENTS: '{"param1": "value1"}',

  // Expand options
  EXPAND_ROBOT: 'Robot',
  EXPAND_MACHINE: 'Machine',
} as const;
