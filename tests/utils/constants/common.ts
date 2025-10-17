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
  
  // Pagination Values
  NEXT_CURSOR: 'next-cursor',
  
  // Base URLs and Endpoints
  BASE_URL: 'https://test.uipath.com',
  CLIENT_ID: 'test-client-id',
  CLIENT_SECRET: 'test-client-secret',
  ORGANIZATION_ID: 'test-org-id',
  TENANT_ID: 'test-tenant-id',
} as const;