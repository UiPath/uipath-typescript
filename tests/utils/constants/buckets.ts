/**
 * Test constants for Bucket service tests
 * Provides consistent test data for bucket-related operations
 */

export const BUCKET_TEST_CONSTANTS = {
  // Bucket identifiers
  BUCKET_ID: 123,
  BUCKET_NAME: 'Test Bucket',
  BUCKET_DESCRIPTION: 'Test bucket description',
  BUCKET_IDENTIFIER: '123e4567-e89b-12d3-a456-426614174000',
  
  // Storage configuration
  STORAGE_PROVIDER: 'Azure',
  STORAGE_CONTAINER: 'test-container',
  STORAGE_PARAMETERS: '{"accountName":"testaccount","containerName":"testcontainer"}',
  FILE_CONTENT: 'test content',
  
  // Credentials and external references
  CREDENTIAL_STORE_ID: 1,
  EXTERNAL_NAME: 'external-bucket-name',
  PASSWORD: 'test-password',
  
  // Folder and organization
  FOLDERS_COUNT: 5,
  
  // File and path information
  FILE_PATH: '/test/file.txt',
  PREFIX: '/test',
  CONTENT_TYPE: 'text/plain',
  CONTENT_TYPE_2: 'application/pdf',
  CONTENT_TYPE_HEADER: 'Content-Type',
  FILE_SIZE: 1024,
  LAST_MODIFIED: '2023-12-01T10:00:00Z',
  
  // URI and HTTP information
  READ_URI: 'https://teststorage.blob.core.windows.net/testcontainer/test/file.txt?sv=2021-06-08&se=2024-01-01T00:00:00Z',
  UPLOAD_URI: 'https://teststorage.blob.core.windows.net/testcontainer/test/file.txt',
  HTTP_METHOD: 'GET',
  UPLOAD_HTTP_METHOD: 'PUT',
  UPLOAD_SUCCESS_STATUS_CODE: 201,
    
  // Blob headers for Azure storage
  BLOB_HEADERS: {
    'x-ms-blob-type': 'BlockBlob',
    'Content-Type': 'text/plain'
  },
  
  // Query options
  EXPAND_FOLDERS: 'Folders',
  SELECT_ID_NAME: 'Id,Name',
} as const;