/**
 * Notification test constants.
 */

export const NOTIFICATION_TEST_CONSTANTS = {
  // Tenant GUID — passed as the first arg to every Notifications method
  // (sent to the API via the X-UIPATH-Internal-TenantId header)
  TENANT_ID: '99999999-9999-4999-8999-999999999999',

  // Notification entry identifiers
  NOTIFICATION_ID: '11111111-1111-4111-8111-111111111111',
  NOTIFICATION_ID_2: '22222222-2222-4222-8222-222222222222',
  NOTIFICATION_ID_3: '33333333-3333-4333-8333-333333333333',

  // Publisher / topic IDs used inside notification-entry fixtures
  PUBLISHER_ID: '44444444-4444-4444-4444-444444444444',
  PUBLISHER_NAME: 'Orchestrator',
  PUBLISHER_DISPLAY_NAME: 'Orchestrator',
  PUBLISHER_NAME_ALT: 'Actions',
  TOPIC_ID: '55555555-5555-4555-8555-555555555555',
  TOPIC_NAME: 'Process.JobExecution.Faulted',
  TOPIC_KEY_NAME: 'Process.JobExecution.Faulted',
  TOPIC_DISPLAY_NAME: 'Job execution faulted',

  // User identifier
  USER_ID: '66666666-6666-4666-8666-666666666666',

  // Notification content (mirrors real-API field shapes captured during onboarding)
  MESSAGE: 'Job XYZ failed in folder ABC',
  MESSAGE_PARAM: '{"jobId":"<jobId>","folderName":"<folderName>"}',
  REDIRECTION_URL: 'https://alpha.uipath.com/orchestrator_/jobs/<jobId>',

  // Unix epoch seconds (API returns seconds, not ms)
  PUBLISHED_ON: 1780981200,

  // Error messages
  ERROR_NOTIFICATION_NOT_FOUND: 'Notification not found',
  ERROR_PUBLISHER_NOT_FOUND: 'Publisher not found',
} as const;
