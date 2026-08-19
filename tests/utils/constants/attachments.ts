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

  // Create
  UPLOAD_CONTENT: 'file body',
  ERROR_NAME_REQUIRED: 'name is required for create',
  ERROR_CONTENT_REQUIRED: 'content is required for create',
  ERROR_UPLOAD_FAILED: 'Server failed to authenticate the request.',
  // Blob storage answers in XML, not JSON — the upload failure path must cope.
  XML_UPLOAD_ERROR_BODY:
    '<?xml version=\'1.0\' encoding=\'utf-8\'?><Error><Code>AuthenticationFailed</Code></Error>',
} as const;
