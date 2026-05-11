/**
 * Common test constants used across all services
 */

export const TEST_CONSTANTS = {
  // Basic identifiers
  USER_ID: 123,
  FOLDER_ID: 123,
  FOLDER_NAME: 'Test Folder',
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
  AUTHORIZATION_HEADER: 'Authorization',
  BEARER_PREFIX: 'Bearer',
  
  // Pagination Values
  NEXT_CURSOR: 'next-cursor',
  
  // Base URLs and Endpoints
  BASE_URL: 'https://test.uipath.com',
  CLIENT_ID: 'test-client-id',
  CLIENT_SECRET: 'test-client-secret',
  ORGANIZATION_ID: 'test-org-id',
  GUID_ORG_ID: '550e8400-e29b-41d4-a716-446655440000',
  INVALID_GUID_ORG_ID: '550e840-e29b-41d4-a716-446655440000',
  REDIRECT_URI: 'http://localhost:3000/callback',
  CODE_CHALLENGE: 'test-code-challenge',
  OAUTH_SCOPE: 'OR.Processes',
  TENANT_ID: 'test-tenant-id',
} as const;