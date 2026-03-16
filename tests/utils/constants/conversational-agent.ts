/**
 * Conversational Agent test constants used across agent and conversation tests
 */

export const CONVERSATIONAL_AGENT_TEST_CONSTANTS = {
  // Agent identifiers
  AGENT_ID: 456,
  AGENT_NAME: 'Test Agent',
  AGENT_DESCRIPTION: 'A test conversational agent',
  AGENT_PROCESS_VERSION: '1.0.0',
  AGENT_PROCESS_KEY: 'test-process-key',
  AGENT_FEED_ID: 'test-feed-id',

  // Agent appearance
  WELCOME_TITLE: 'Welcome!',
  WELCOME_DESCRIPTION: 'How can I help you today?',
  STARTING_PROMPT_ID: 'prompt-1',
  STARTING_PROMPT_DISPLAY: 'Tell me about UiPath',
  STARTING_PROMPT_ACTUAL: 'What is UiPath and what does it do?',

  // Conversation identifiers
  CONVERSATION_ID: '4cc1935e-bb8a-40fd-b00c-63a4d85112b2',
  CONVERSATION_LABEL: 'Test Conversation',
  CONVERSATION_USER_ID: 'user-123',
  CONVERSATION_ORG_ID: 'org-456',
  CONVERSATION_TENANT_ID: 'tenant-789',
  CONVERSATION_TRACE_ID: 'trace-abc',
  CONVERSATION_SPAN_ID: 'span-def',

  // Exchange identifiers
  EXCHANGE_ID: 'exchange-abc-123',
  EXCHANGE_ID_2: 'exchange-def-456',

  // Message identifiers
  MESSAGE_ID: 'msg-001',
  ASSISTANT_MESSAGE_ID: 'msg-assistant-001',
  MESSAGE_SPAN_ID: 'span-msg-1',
  ASSISTANT_MESSAGE_SPAN_ID: 'span-msg-2',

  // Content part identifiers
  CONTENT_PART_ID: 'cp-001',
  ASSISTANT_CONTENT_PART_ID: 'cp-assistant-001',

  // Tool call / Interrupt / Citation identifiers
  TOOL_CALL_ID: 'tc-001',
  INTERRUPT_ID: 'int-001',
  CITATION_ID: 'cite-001',

  // Timestamps (raw API format)
  CREATED_AT: '2024-01-01T00:00:00Z',
  UPDATED_AT: '2024-01-01T12:00:00Z',
  LAST_ACTIVITY_AT: '2024-01-01T11:00:00Z',

  // Attachment
  ATTACHMENT_URI: 'urn:uipath:cas:file:orchestrator:123',
  ATTACHMENT_NAME: 'document.pdf',
  ATTACHMENT_MIME_TYPE: 'application/pdf',
  ATTACHMENT_UPLOAD_URL: 'https://storage.example.com/blob/upload-url',
  ATTACHMENT_UPLOAD_VERB: 'PUT',

  // Feature flags
  FEATURE_FLAG_KEY: 'test-feature',
  FEATURE_FLAG_VALUE: true,

  // Error messages
  ERROR_AGENT_NOT_FOUND: 'Agent not found',
  ERROR_CONVERSATION_NOT_FOUND: 'Conversation not found',
  ERROR_UPLOAD_FAILED: 'Failed to upload to file storage: 403 Forbidden',
} as const;
