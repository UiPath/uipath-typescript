/**
 * Job service test constants
 * Job-specific constants only
 */

export const JOB_TEST_CONSTANTS = {
  // Job IDs
  JOB_ID: 456,

  // Job Metadata
  JOB_KEY: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  JOB_KEY_2: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
  JOB_ID_2: 789,
  PROCESS_NAME: 'MyProcess_Production',
  HOST_MACHINE_NAME: 'ROBOT-01',
  ENTRY_POINT_PATH: 'Main.xaml',

  // Timestamps
  CREATED_TIME: '2023-11-01T08:00:00Z',
  START_TIME: '2023-11-01T08:00:05Z',
  END_TIME: '2023-11-01T08:05:30Z',
  LAST_MODIFIED_TIME: '2023-11-01T08:05:30Z',

  // Output
  OUTPUT_FILE_KEY: '11111111-2222-3333-4444-555555555555',
  OUTPUT_ARGUMENTS: '{"result": 42, "status": "completed"}',
  PARSED_OUTPUT: { result: 42, status: 'completed' },
  BLOB_URI: 'https://blob.storage.example.com/output/file.json',
  BLOB_CONTENT: '{"largeResult": "data from blob"}',
  PARSED_BLOB_OUTPUT: { largeResult: 'data from blob' },

  // Resume
  INPUT_ARGUMENTS: { approved: true },

  // Error Messages
  ERROR_JOB_NOT_FOUND: 'Job not found',
  ERROR_JOBS_NOT_FOUND_FOR_KEYS: 'Jobs not found for keys',
  ERROR_JOB_RESUME_FAILED: 'Job resume failed',

  // Job attachments
  ATTACHMENT_LINK_ID: 'd7cd7a5f-f23d-4024-a9b7-08def2f24b42',
  ATTACHMENT_ID: '5a1f66bd-7ed8-43f1-6506-08def2f09aaf',
  ATTACHMENT_NAME: 'invoice-2026-08.pdf',
  ATTACHMENT_CATEGORY: 'JobAttachment',
  ATTACHMENT_CUSTOM_CATEGORY: 'Invoice',
  ATTACHMENT_CREATOR_USER_ID: 3495860,
  ATTACHMENT_LAST_MODIFIER_USER_ID: 3495861,
  // Distinctive values so the semantic renames are verifiable
  ATTACHMENT_CREATED_TIME: '2000-01-01T00:00:00.000Z',
  ATTACHMENT_LAST_MODIFIED_TIME: '2000-06-15T12:30:00.000Z',
  ERROR_JOB_ATTACHMENT_NOT_FOUND: 'Job attachment not found',
} as const;
