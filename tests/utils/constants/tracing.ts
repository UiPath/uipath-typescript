/**
 * Test constants for trace markers (`trace()` and `@trace`)
 */

export const TRACE_TEST_CONSTANTS = {
  HOST_KEY: 'uipath.host.v1',
  CAPABILITY: 'tracing',
  CAPABILITY_MAJOR: 1,
  PARENT_SPAN_ID: '0f9e8d7c-6b5a-4c3d-9e2f-1a0b9c8d7e6f',

  LABEL: 'after-total',
  ORDER_ID: 'order-42',
  LOCAL_NAME: 'cartId',
  LOCAL_VALUE: 'cart-7',

  METHOD_NAME: 'approve',
  FIELD_NAME: 'retries',
  TOTAL: 250,
  LIMIT: 1000,
  ASYNC_DELAY_MS: 25,
  TIMER_TOLERANCE_MS: 5,

  HOST_ERROR_MESSAGE: 'host down',
  CALL_ERROR_MESSAGE: 'card declined',
} as const;
