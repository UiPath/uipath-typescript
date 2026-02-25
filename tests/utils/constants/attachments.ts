/**
 * Attachment service test constants
 * Attachment-specific constants only
 */

export const ATTACHMENT_TEST_CONSTANTS = {
  // Attachment IDs
  ATTACHMENT_ID: '12345678-1234-1234-1234-123456789abc',
  ATTACHMENT_NAME: 'test-attachment.pdf',

  // Job Key
  JOB_KEY: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  ATTACHMENT_CATEGORY: 'Output',

  // Timestamps
  CREATED_TIME: '2023-11-01T08:00:00Z',
  LAST_MODIFIED_TIME: '2023-11-01T09:00:00Z',

  // User IDs
  CREATOR_USER_ID: 101,
  LAST_MODIFIER_USER_ID: 102,

  // Blob file access
  BLOB_URI: 'https://storage.blob.core.windows.net/container/attachment.pdf',
  BLOB_HTTP_METHOD: 'GET',

  // Error Messages
  ERROR_ATTACHMENT_NOT_FOUND: 'Attachment not found',
  ERROR_ID_REQUIRED: 'id is required for getById',

  // OData Parameters
  ODATA_SELECT_FIELDS: 'id,name,blobFileAccess',
} as const;
