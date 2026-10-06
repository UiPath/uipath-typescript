/**
 * Common test constants used across all services
 */

export const TEST_CONSTANTS = {
  // Basic identifiers
  USER_ID: 123,
  FOLDER_ID: 123,
  FOLDER_NAME: 'Test Folder',
  FOLDER_KEY: 'f0ldabcd-1234-4321-9876-abcdef123456',
  /** A second folder key, for the source a context's key must beat or fall back on. */
  META_FOLDER_KEY: 'meta0000-1234-4321-9876-abcdef123456',
  /** Whitespace-only folder key — must be treated as absent folder context. */
  FOLDER_KEY_WHITESPACE: '   ',
  FOLDER_PATH: 'Shared/Finance',
  // Common status values
  RUNNING: 'Running',
  CANCELLED: 'Cancelled',
  
  // Common values
  PAGE_SIZE: 10,
  CURSOR_VALUE: 'test-cursor-value',
  ERROR_MESSAGE: 'API Error',
  
  // User Information
  USER_EMAIL: 'testuser@uipath.com',
  
  // Authentication Tokens
  SECRET_TOKEN_TYPE: 'secret',
  OAUTH_TOKEN_TYPE: 'oauth',
  DEFAULT_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  EXPIRED_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkV4cGlyZWQgVG9rZW4iLCJpYXQiOjE1MTYyMzkwMjJ9.expired_token_signature',
  REFRESHED_ACCESS_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlJlZnJlc2hlZCBUb2tlbiIsImlhdCI6MTUxNjIzOTAyMn0.refreshed_token_signature',
  ID_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiYXVkIjoidGVzdC1jbGllbnQtaWQiLCJpYXQiOjE1MTYyMzkwMjJ9.id_token_signature',
  ID_TOKEN_REFRESHED: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiYXVkIjoidGVzdC1jbGllbnQtaWQiLCJpYXQiOjE1MTYyMzkwOTl9.id_token_refreshed_signature',
  AUTHORIZATION_HEADER: 'Authorization',
  BEARER_PREFIX: 'Bearer',
  
  // Pagination Values
  NEXT_CURSOR: 'next-cursor',
  
  // Base URLs and Endpoints
  BASE_URL: 'https://test.uipath.com',
  BASE_URL_TRAILING_SLASH: 'https://test.uipath.com/',
  BASE_URL_WITH_PATH: 'https://test.uipath.com/test-org-id/test-tenant-id',
  BASE_URL_WITH_QUERY: 'https://test.uipath.com/?tenant=test-tenant-id',
  BASE_URL_WITH_HASH: 'https://test.uipath.com/#/home',
  BASE_URL_WITH_PORT: 'http://localhost:8080',
  BASE_URL_NON_HTTP: 'file:///tmp/worker',
  BASE_URL_NOT_A_URL: 'not a url',
  CLIENT_ID: 'test-client-id',
  CLIENT_SECRET: 'test-client-secret',
  ORGANIZATION_ID: 'test-org-id',
  GUID_ORG_ID: '550e8400-e29b-41d4-a716-446655440000',
  INVALID_GUID_ORG_ID: '550e840-e29b-41d4-a716-446655440000',
  REDIRECT_URI: 'http://localhost:3000/callback',
  CODE_CHALLENGE: 'test-code-challenge',
  OAUTH_SCOPE: 'OR.Processes',
  TENANT_ID: 'test-tenant-id',
  ROBOT_KEY: 'test-robot-key',
} as const;