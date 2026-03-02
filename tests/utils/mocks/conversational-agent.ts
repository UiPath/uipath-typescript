/**
 * Conversational Agent mock utilities - Agent and Conversation-specific mocks
 * Uses generic utilities from core.ts for base functionality
 */
import { createMockBaseResponse, createMockCollection } from './core';
import { CONVERSATIONAL_AGENT_TEST_CONSTANTS } from '../constants/conversational-agent';
import { TEST_CONSTANTS } from '../constants/common';

/**
 * Creates a mock raw agent response as it comes from the API (before transformation).
 * Uses API field names (createdAt, updatedAt) that need transformation.
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw agent data as it comes from the API
 */
export const createMockRawAgent = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
    name: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_NAME,
    description: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_DESCRIPTION,
    processVersion: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_PROCESS_VERSION,
    processKey: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_PROCESS_KEY,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    feedId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_FEED_ID,
    // Raw API field names that should be transformed
    createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
  }, overrides);
};

/**
 * Creates a mock raw agent-by-id response (includes appearance) as it comes from the API.
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw agent-by-id data as it comes from the API
 */
export const createMockRawAgentById = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    ...createMockRawAgent(),
    appearance: {
      welcomeTitle: CONVERSATIONAL_AGENT_TEST_CONSTANTS.WELCOME_TITLE,
      welcomeDescription: CONVERSATIONAL_AGENT_TEST_CONSTANTS.WELCOME_DESCRIPTION,
      startingPrompts: [
        {
          id: CONVERSATIONAL_AGENT_TEST_CONSTANTS.STARTING_PROMPT_ID,
          displayPrompt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.STARTING_PROMPT_DISPLAY,
          actualPrompt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.STARTING_PROMPT_ACTUAL,
        }
      ]
    }
  }, overrides);
};

/**
 * Creates a mock raw conversation response as it comes from the API (before transformation).
 * Uses API field names (conversationId, lastActivityAt, agentReleaseId, createdAt, updatedAt).
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw conversation data as it comes from the API
 */
export const createMockRawConversation = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    // API field names that get transformed
    conversationId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
    lastActivityAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.LAST_ACTIVITY_AT,
    agentReleaseId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
    createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
    // Other fields
    label: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_LABEL,
    autogenerateLabel: true,
    userId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_USER_ID,
    orgId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ORG_ID,
    tenantId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TENANT_ID,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    traceId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TRACE_ID,
    spanId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_SPAN_ID,
  }, overrides);
};

/**
 * Creates a mock transformed conversation collection as returned by PaginationHelpers.getAll
 *
 * @param count - Number of conversations to include (defaults to 1)
 * @param options - Pagination options
 * @returns Mock transformed collection with items array
 */
export const createMockTransformedConversationCollection = (
  count: number = 1,
  options?: {
    totalCount?: number;
    hasNextPage?: boolean;
    nextCursor?: string;
    previousCursor?: string | null;
  }
): any => {
  const items = createMockCollection(count, (index) => ({
    id: `${CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID}-${index}`,
    label: `${CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_LABEL} ${index + 1}`,
    createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
    lastActivityTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.LAST_ACTIVITY_AT,
    agentId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.AGENT_ID,
    autogenerateLabel: true,
    userId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_USER_ID,
    orgId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ORG_ID,
    tenantId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TENANT_ID,
    folderId: TEST_CONSTANTS.FOLDER_ID,
    traceId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_TRACE_ID,
    spanId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_SPAN_ID,
  }));

  return createMockBaseResponse({
    items,
    totalCount: options?.totalCount || count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
    ...(options?.previousCursor !== undefined && { previousCursor: options.previousCursor }),
  });
};

/**
 * Creates a mock attachment create response (step 1 of upload)
 */
export const createMockAttachmentCreateResponse = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    uri: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_URI,
    name: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_NAME,
    fileUploadAccess: {
      url: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_UPLOAD_URL,
      verb: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ATTACHMENT_UPLOAD_VERB,
      requiresAuth: true,
      headers: {
        keys: ['x-ms-blob-type'],
        values: ['BlockBlob']
      }
    }
  }, overrides);
};

/**
 * Creates a mock feature flags response
 */
export const createMockFeatureFlags = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    [CONVERSATIONAL_AGENT_TEST_CONSTANTS.FEATURE_FLAG_KEY]: CONVERSATIONAL_AGENT_TEST_CONSTANTS.FEATURE_FLAG_VALUE,
  }, overrides);
};

/**
 * Creates a mock raw user message as returned by the API (before transformation).
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw message data as it comes from the API
 */
export const createMockRawMessage = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    messageId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
    role: 'user',
    createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
    spanId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_SPAN_ID,
    contentParts: [
      {
        contentPartId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID,
        mimeType: 'text/plain',
        data: { inline: 'Hello world' },
        citations: [],
        createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
        updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
      }
    ],
    toolCalls: [],
    interrupts: [],
  }, overrides);
};

/**
 * Creates a mock raw assistant message with tool calls, interrupts, and citations.
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw assistant message data as it comes from the API
 */
export const createMockRawAssistantMessage = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    messageId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ASSISTANT_MESSAGE_ID,
    role: 'assistant',
    createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
    spanId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ASSISTANT_MESSAGE_SPAN_ID,
    contentParts: [
      {
        contentPartId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.ASSISTANT_CONTENT_PART_ID,
        mimeType: 'text/markdown',
        data: { inline: 'Here is the result' },
        citations: [
          {
            citationId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID,
            offset: 0,
            length: 10,
            sources: [{ title: 'Reference', number: 1, url: 'https://example.com/ref' }],
            createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
            updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
          }
        ],
        createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
        updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
      }
    ],
    toolCalls: [
      {
        toolCallId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID,
        name: 'search',
        input: { query: 'test' },
        result: { output: 'found it' },
        createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
        updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
      }
    ],
    interrupts: [
      {
        interruptId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID,
        type: 'uipath_cas_tool_call_confirmation',
        interruptValue: { toolName: 'search' },
        createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
        updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
      }
    ],
  }, overrides);
};

/**
 * Creates a mock raw content part as returned by the API.
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw content part data
 */
export const createMockRawContentPart = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    contentPartId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID,
    mimeType: 'text/plain',
    data: { inline: 'Some content' },
    citations: [],
    createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
  }, overrides);
};

/**
 * Creates a mock raw exchange as returned by the API (before transformation).
 * Includes a user message and an assistant message with tool calls/interrupts/citations.
 *
 * @param overrides - Optional overrides for specific fields
 * @returns Raw exchange data as it comes from the API
 */
export const createMockRawExchange = (overrides: Partial<any> = {}): any => {
  return createMockBaseResponse({
    exchangeId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
    createdAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedAt: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
    spanId: 'span-exchange-1',
    messages: [
      createMockRawMessage(),
      createMockRawAssistantMessage(),
    ],
  }, overrides);
};

/**
 * Creates a mock transformed exchange collection as returned by PaginationHelpers.getAll
 *
 * @param count - Number of exchanges to include (defaults to 1)
 * @param options - Pagination options
 * @returns Mock transformed collection with items array
 */
export const createMockTransformedExchangeCollection = (
  count: number = 1,
  options?: {
    hasNextPage?: boolean;
    nextCursor?: string;
  }
): any => {
  const items = createMockCollection(count, (index) => ({
    id: `exchange-${index}`,
    exchangeId: `exchange-${index}`,
    createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
    updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
    messages: []
  }));

  return createMockBaseResponse({
    items,
    totalCount: count,
    ...(options?.hasNextPage !== undefined && { hasNextPage: options.hasNextPage }),
    ...(options?.nextCursor && { nextCursor: options.nextCursor }),
  });
};
