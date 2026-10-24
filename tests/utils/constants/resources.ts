/**
 * Resource declaration test constants
 * Declarations a project's `resources.ts` would make, used to build handles in tests
 */

export const RESOURCE_TEST_CONSTANTS = {
  FOLDER_PATH: 'Shared/Finance',

  ASSET_NAME: 'ApiKey',
  ASSET_TYPE: 'text',
  BUCKET_NAME: 'Invoices',
  BUCKET_TYPE: 'orchestrator',
  QUEUE_NAME: 'InvoiceReview',
  PROCESS_NAME: 'Nightly Sync',
  PROCESS_TYPE: 'process',
  ENTITY_NAME: 'Customers',

  LOCAL_QUEUE_NAME: 'Local',
  PLAIN_NAME: 'Plain',
} as const;
