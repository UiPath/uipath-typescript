/**
 * Machine service test constants
 * Machine-specific constants only
 */

export const MACHINE_TEST_CONSTANTS = {
  // Machine IDs
  MACHINE_ID: 101,

  // Machine Metadata
  MACHINE_NAME: 'BuildServer01',
  MACHINE_KEY: 'aabbccdd-1122-3344-5566-778899aabbcc',
  MACHINE_DESCRIPTION: 'Primary build server machine',

  // Machine Configuration
  NON_PRODUCTION_SLOTS: 0,
  UNATTENDED_SLOTS: 2,
  HEADLESS_SLOTS: 0,
  TEST_AUTOMATION_SLOTS: 1,
  CLIENT_SECRET: 'mock-client-secret',
  LICENSE_KEY: 'mock-license-key',

  // OData Parameters
  ODATA_SELECT_FIELDS: 'Id,Name,Description',

  // Error Messages
  ERROR_MACHINE_NOT_FOUND: 'Machine not found',
} as const;
