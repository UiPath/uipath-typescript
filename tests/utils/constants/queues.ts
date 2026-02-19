/**
 * Queue service test constants
 * Queue-specific constants only
 */

export const QUEUE_TEST_CONSTANTS = {
  // Queue IDs
  QUEUE_ID: 456,
  QUEUE_ITEM_ID: 654,
  QUEUE_DEFINITION_ID: 789,

  // Queue Metadata
  QUEUE_NAME: 'InvoiceProcessing',
  QUEUE_KEY: '87654321-4321-4321-4321-cba987654321',
  QUEUE_DESCRIPTION: 'Queue for processing invoices',
  QUEUE_ITEM_KEY: '12345678-1234-1234-1234-123456789abc',
  QUEUE_ITEM_STATUS: 'New',
  QUEUE_ITEM_PRIORITY: 'Normal',
  QUEUE_ITEM_REFERENCE: 'INV-1001',
  QUEUE_ITEM_PROGRESS: 'Queued',
  CONTENT: {
    invoiceNumber: 'INV-1001',
    amount: 1500
  },

  // Queue Configuration
  MAX_NUMBER_OF_RETRIES: 1,
  ACCEPT_AUTOMATICALLY_RETRY: true,
  RETRY_ABANDONED_ITEMS: false,
  ENFORCE_UNIQUE_REFERENCE: false,
  ENCRYPTED: false,
  SLA_IN_MINUTES: 60,
  RISK_SLA_IN_MINUTES: 30,
  FOLDERS_COUNT: 1,

  // IDs and References
  PROCESS_SCHEDULE_ID: 789,
  RELEASE_ID: 321,

  // Flags
  IS_PROCESS_IN_CURRENT_FOLDER: true,

  // JSON Schemas
  SPECIFIC_DATA_JSON_SCHEMA: '{"type": "object", "properties": {"invoiceNumber": {"type": "string"}}}',
  OUTPUT_DATA_JSON_SCHEMA: '{"type": "object", "properties": {"status": {"type": "string"}}}',
  ANALYTICS_DATA_JSON_SCHEMA: null,

  // Timestamps
  CREATED_TIME: '2023-11-10T09:00:00Z',

  // Error Messages
  ERROR_QUEUE_NOT_FOUND: 'Queue not found',

  // OData Parameters
  ODATA_SELECT_FIELDS: 'id,name,description',
} as const;
