/**
 * AgentHub test constants used across chat completion tests
 */

export const AGENTHUB_TEST_CONSTANTS = {
  MODEL: 'gpt-4.1-2025-04-14',
  COMPLETION_ID: 'chatcmpl-123',
  OBJECT: 'chat.completion',
  CREATED: 1700000000,
  CREATED_TIME: '2023-11-14T22:13:20.000Z',
  PROMPT: 'Summarize this invoice.',
  COMPLETION_TEXT: 'Invoice total: $100.',
  FINISH_REASON: 'stop',
  FINISH_REASON_TOOL_CALLS: 'tool_calls',
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.7,
  PROMPT_TOKENS: 12,
  COMPLETION_TOKENS: 5,
  TOTAL_TOKENS: 17,
  TOOL_NAME: 'lookupInvoice',
  TOOL_CALL_ID: 'call_abc123',
  TOOL_ARGUMENTS: { invoice_id: 'INV-42' },
  TOOL_RESULT: '{"total":100}',
  ERROR_MESSAGE: 'Failed to create chat completion',
} as const;
