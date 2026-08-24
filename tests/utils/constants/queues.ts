/**
 * Queue service test constants
 * Queue-specific constants only
 */

export const QUEUE_TEST_CONSTANTS = {
  // Queue IDs
  QUEUE_ID: 456,

  // Queue Metadata
  QUEUE_NAME: 'InvoiceProcessing',
  QUEUE_KEY: '87654321-4321-4321-4321-cba987654321',
  QUEUE_DESCRIPTION: 'Queue for processing invoices',

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
  ERROR_QUEUE_ITEM_NOT_FOUND: 'Queue item not found',

  // OData Parameters
  ODATA_SELECT_FIELDS: 'id,name,description',

  // Queue Item fields
  ITEM_ID: 22905684,
  ITEM_KEY: '62625516-227e-41cd-8e9b-43e6be405d5d',
  ITEM_STATUS: 'New',
  ITEM_REVIEW_STATUS: 'None',
  ITEM_PRIORITY: 'High',
  ITEM_REFERENCE: 'SDK-REF-001',
  ITEM_PROGRESS: 'step 1 of 3',
  ITEM_RETRY_NUMBER: 0,
  ITEM_CREATED_TIME: '2026-08-03T16:20:00.601Z',
  ITEM_DEFER_DATE: '2026-08-03T00:00:00Z',
  ITEM_DUE_DATE: '2026-08-15T00:00:00Z',
  ITEM_START_PROCESSING: '2026-08-03T16:28:58.582Z',

  // User-defined payload — mixed key casing on purpose: the SDK must return
  // these keys EXACTLY as stored (no case conversion).
  ITEM_SPECIFIC_CONTENT: {
    InvoiceId: 'INV-1001',
    amountDue: 1520,
    Vendor_Name: 'Acme'
  },
  // Raw JSON-string wire form of the payload (SpecificData on the wire)
  ITEM_SPECIFIC_DATA_JSON:
    '{"DynamicProperties":{"InvoiceId":"INV-1001","amountDue":1520,"Vendor_Name":"Acme"}}',
  ITEM_OUTPUT_CONTENT: {
    PaymentId: 'P-778',
    processedBy: 'sdk'
  },
  ITEM_OUTPUT_DATA_JSON:
    '{"DynamicProperties":{"PaymentId":"P-778","processedBy":"sdk"}}',

  // Transaction completion
  TRANSACTION_FAILURE_REASON: 'Vendor not found',
  TRANSACTION_FAILURE_DETAILS: 'lookup failed',
  TRANSACTION_FAILURE_TYPE: 'BusinessException',
} as const;
