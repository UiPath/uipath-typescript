/**
 * Business App test constants.
 *
 * Field shapes mirror the `v1/business-apps` contract: GUID identifiers, `Utc`-suffixed
 * timestamps on the wire, and nullable `icon` / `color`.
 */

export const BUSINESS_APP_TEST_CONSTANTS = {
  // Identifiers
  BUSINESS_APP_ID: '8f14e45f-ceea-467a-9575-5b39dbba31e4',
  BUSINESS_APP_ID_ALT: 'c9f0f895-fb98-4b41-b4d1-3a0e2a9c4a11',
  PROCESS_KEY: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
  PROCESS_KEY_ALT: '45c48cce-2e2d-4fbd-aa1f-9a37f2c1b1e7',
  USER_ID: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',

  // Display fields
  NAME: 'Claims Intake',
  NAME_ALT: 'Renewals',
  DESCRIPTION: 'Handles inbound claims',
  DESCRIPTION_UPDATED: 'Handles inbound and renewal claims',
  ICON: 'claims-icon',
  COLOR: '#1F6FEB',

  // Audit timestamps — distinctive values so the `*TimeUtc` renames are provably carried
  CREATED_TIME: '2026-08-05T09:31:00Z',
  MODIFIED_TIME: '2026-08-06T14:02:00Z',

  // Continuation token returned by a paged list
  NEXT_PAGE_TOKEN: 'eyJ0b2tlbiI6ImFiYyJ9',

  // Error messages
  ERROR_BUSINESS_APP_NOT_FOUND: 'Business app was not found',
  ERROR_BUSINESS_APP_NAME_EXISTS: 'A business app with that name already exists in this tenant',
} as const;
