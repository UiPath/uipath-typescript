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

/**
 * Test constants for the session trace context that SDK calls and job starts join
 */
export const TRACE_CONTEXT_TEST_CONSTANTS = {
  TRACE_ID: '4bf92f3577b34da6a3ce929d0e0e4736',
  SPAN_ID: '00f067aa0ba902b7',
  OTHER_SPAN_ID: 'b7ad6b7169203331',
  ZERO_TRACE_ID: '00000000000000000000000000000000',
  ZERO_SPAN_ID: '0000000000000000',
  UPPERCASE_TRACE_ID: '4BF92F3577B34DA6A3CE929D0E0E4736',
  SHORT_SPAN_ID: '00f067aa',
  CALLER_TRACE_ID: '0af7651916cd43dd8448eb211c80319c',
  CALLER_PARENT_OPERATION_ID: 'caller-operation-id',
  PROVIDER_ERROR_MESSAGE: 'tracer not ready',
} as const;
