/**
 * Test constants for the generic HTTP helper (`httpRequest`) and the shared retry engine
 */

export const HTTP_TEST_CONSTANTS = {
  // Target URLs
  URL: 'https://api.example.com/v1/orders',
  URL_WITH_QUERY: 'https://api.example.com/v1/orders?page=2',

  // Statuses
  STATUS_OK: 200,
  STATUS_NO_CONTENT: 204,
  STATUS_UNAUTHORIZED: 401,
  STATUS_NOT_FOUND: 404,
  STATUS_TOO_MANY_REQUESTS: 429,
  STATUS_SERVER_ERROR: 500,
  STATUS_SERVICE_UNAVAILABLE: 503,

  // Bodies
  JSON_BODY: { id: 'order-1', quantity: 2 },
  TEXT_BODY: 'plain text body',
  MALFORMED_JSON_BODY: '{ "id": ',

  // Headers
  API_KEY_HEADER: 'x-api-key',
  API_KEY_VALUE: 'test-api-key',

  // Retry values
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 500,
  BACKOFF_FACTOR: 2,
  BACKOFF_MAX_DELAY_MS: 30000,
  TIMEOUT_MS: 1000,
  RETRY_AFTER_SECONDS: 3,

  // Integration probe values
  PROBE_RETRY_DELAY_MS: 2000,
  PROBE_TIMEOUT_MS: 30000,

  // Failures
  TRANSPORT_ERROR_MESSAGE: 'network down',
} as const;
