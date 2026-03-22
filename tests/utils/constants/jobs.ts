/**
 * Job service test constants
 * Job-specific constants only
 */

export const JOB_TEST_CONSTANTS = {
  // Job IDs
  JOB_ID: 39763867,
  JOB_KEY: 'c80c3b30-f010-4eb8-82d4-b67bc615e137',

  // Job Metadata
  RELEASE_NAME: 'TestProcess',
  BATCH_EXECUTION_KEY: '1d74d5e9-1749-4a9c-b435-eebb04cfdfbb',
  ENTRY_POINT_PATH: 'Main.xaml',
  HOST_MACHINE_NAME: 'ROBOT-001',
  REFERENCE: 'test-reference',
  INFO: 'Job completed successfully',
  PROJECT_KEY: '18f8c56d-e800-4a96-a6a5-d529c65e4927',
  CREATOR_USER_KEY: 'a081d57d-b42e-43dd-b534-37d4bcdba470',

  // Timestamps
  START_TIME: '2023-10-15T10:00:00Z',
  END_TIME: '2023-10-15T10:30:00Z',
  CREATED_TIME: '2023-10-15T09:55:00Z',
  LAST_MODIFIED_TIME: '2023-10-15T10:30:00Z',

  // Job Properties
  STATE: 'Successful',
  JOB_PRIORITY: 'Normal',
  SPECIFIC_PRIORITY_VALUE: 45,
  SOURCE: 'Manual',
  SOURCE_TYPE: 'Manual',
  TYPE: 'Unattended',
  RUNTIME_TYPE: 'Unattended',
  PROCESS_TYPE: 'Process',
  REMOTE_CONTROL_ACCESS: 'None',
  RELEASE_VERSION_ID: 638096,

  // Error Messages
  ERROR_JOBS_NOT_FOUND: 'Jobs not found',
} as const;
