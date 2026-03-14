/**
 * Job service test constants
 * Job-specific constants only
 */

export const JOB_TEST_CONSTANTS = {
  // Job IDs
  JOB_ID: 456,

  // Job Metadata
  JOB_KEY: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  RELEASE_NAME: 'MyProcess_Production',
  HOST_MACHINE_NAME: 'ROBOT-01',
  ENTRY_POINT_PATH: 'Main.xaml',

  // Timestamps
  CREATED_TIME: '2023-11-01T08:00:00Z',
  START_TIME: '2023-11-01T08:00:05Z',
  END_TIME: '2023-11-01T08:05:30Z',
  LAST_MODIFIED_TIME: '2023-11-01T08:05:30Z',

  // Error Messages
  ERROR_JOB_NOT_FOUND: 'Job not found',
} as const;
