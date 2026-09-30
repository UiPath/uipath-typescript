/**
 * Case App (v3) test constants.
 *
 * Wire fields keep their `Utc` suffix; distinctive timestamps prove the renames carry values.
 */

export const CASE_APP_TEST_CONSTANTS = {
  // Identifiers
  INSTANCE_ID: '6f1d2c3b-4a59-4e8f-9b7a-1c2d3e4f5a6b',
  INSTANCE_ID_ALT: '7a2e3d4c-5b6a-4f9e-8c7b-2d3e4f5a6b7c',
  FOLDER_KEY: 'b3c4d5e6-f7a8-4b9c-8d0e-1f2a3b4c5d6e',
  PROCESS_KEY: 'c4d5e6f7-a8b9-4c0d-9e1f-2a3b4c5d6e7f',
  RUN_ID: 'd5e6f7a8-b9c0-4d1e-8f2a-3b4c5d6e7f8a',
  ELEMENT_RUN_ID: 'e6f7a8b9-c0d1-4e2f-9a3b-4c5d6e7f8a9b',
  INCIDENT_ID: 'f7a8b9c0-d1e2-4f3a-8b4c-5d6e7f8a9b0c',
  STAGE_ID: 'Stage_1a2b3c',
  STAGE_ID_ALT: 'Stage_4d5e6f',
  ELEMENT_ID: 'Task_7g8h9i',
  OPERATION_ID: '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  MESSAGE_ID: '1b2c3d4e-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  JOB_ID: '2c3d4e5f-6a7b-4c8d-8e9f-1a2b3c4d5e6f',
  CASE_ID: 'CASE-00042',
  PACKAGE_ID: 'Claims.Case',
  NEXT_PAGE_TOKEN: 'eyJwYWdlIjoyfQ==',

  // Names
  STAGE_NAME: 'Review',
  STAGE_NAME_ALT: 'Intake',
  TASK_NAME: 'Request Documents',
  ELEMENT_NAME: 'Verify Identity',
  COMMENT: 'Duplicate case',
  SECTION_TITLE: 'Claimant',
  SECTION_DETAIL_KEY: 'PolicyNumber',
  SECTION_DETAIL_VALUE: 'PN-9912',

  // Timestamps
  STARTED_TIME: '2026-07-01T08:15:00Z',
  COMPLETED_TIME: '2026-07-02T17:45:00Z',
  ERROR_TIME: '2026-07-01T09:30:00Z',
  INCIDENT_UPDATE_TIME: '2026-07-01T10:00:00Z',
  SLA_DUE_TIME: '2026-07-05T00:00:00Z',

  // Errors
  ERROR_CASE_NOT_FOUND: 'Case instance was not found',
  ERROR_TASK_NOT_FOUND: 'Ad-hoc task was not found',
  ERROR_STAGE_NOT_FOUND: 'Stage was not found',
  ERROR_CASE_ALREADY_COMPLETED: 'Case has already completed',
} as const;
