/**
 * Log service test constants
 * Log-specific constants only
 */

export const LOG_TEST_CONSTANTS = {
  // Entry content
  MESSAGE: 'Invoice batch started',
  SECOND_MESSAGE: 'Invoice 124 rejected',
  /** Whitespace-only message — must be rejected like an empty one. */
  MESSAGE_WHITESPACE: '   ',
  PROCESS_NAME: 'InvoiceApp',
  PROCESS_VERSION: '1.0.0',
  FILE_NAME: 'Main',
  JOB_KEY: '6fb260e0-1c1d-4c4c-a3a1-489028e8dd43',
  ROBOT_NAME: 'invoice-robot',
  MACHINE_NAME: 'INVOICE-VM-01',
  WINDOWS_IDENTITY: 'CORP\\invoice.svc',
  AGENT_SESSION_ID: '00000000-0000-0000-0000-000000000000',
  FINGERPRINT: '436ccdd3-3f43-4f49-b354-f21766d51d35',
  /** Fingerprint of the second batch entry, distinct from FINGERPRINT. */
  SECOND_FINGERPRINT: 'b2a9f6e4-3c1d-4e7f-9a8b-5d6c7e8f9a0b',

  // Timestamps
  /** Fake "now" for default-timestamp tests. */
  NOW: '2026-10-14T09:40:14.000Z',
  /** Caller-supplied timestamp, distinct from NOW. */
  TIMESTAMP: '2026-10-13T08:15:30.250Z',
  /** Timestamp of the second batch entry, distinct from TIMESTAMP and NOW. */
  SECOND_TIMESTAMP: '2026-10-13T08:16:45.500Z',
  /** Input that `new Date()` turns into an invalid Date. */
  INVALID_DATE_INPUT: 'not-a-date',

  // Custom fields
  CUSTOM_FIELD_KEY: 'invoiceId',
  CUSTOM_FIELD_VALUE: 'INV-123',
  NESTED_FIELD_KEY: 'activity',
  NESTED_FIELD_VALUE: { name: 'ReadInvoice', durationMs: 1200, tags: ['ocr', 'pdf'] },

  // Folder scoping
  FOLDER_PATH: 'Shared/Finance',
  // base64-of-UTF-16-LE encoded value matching encodeFolderPathHeader().
  // Reference: Buffer.from(<path>, 'utf16le').toString('base64').
  FOLDER_PATH_ENCODED: 'UwBoAGEAcgBlAGQALwBGAGkAbgBhAG4AYwBlAA==',
} as const;
