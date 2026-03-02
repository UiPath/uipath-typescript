// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MessageService } from '@/services/conversational-agent/conversations/messages';
import { ApiClient } from '@/core/http/api-client';
import {
  createMockRawMessage,
  createMockRawAssistantMessage,
  createMockRawContentPart,
  createMockError,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
  TEST_CONSTANTS,
} from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import { MESSAGE_ENDPOINTS } from '@/utils/constants/endpoints';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// ===== TEST SUITE =====
describe('MessageService Unit Tests', () => {
  let messages: MessageService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    messages = new MessageService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should get a user message by ID successfully', async () => {
      const mockMessage = createMockRawMessage();
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID);
      expect(result.messageId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID);
      expect(result.role).toBe('user');

      // Verify the correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MESSAGE_ENDPOINTS.GET(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
        ),
        expect.any(Object)
      );
    });

    it('should transform content parts with ContentPartHelper', async () => {
      const mockMessage = createMockRawMessage();
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
      );

      expect(result.contentParts).toHaveLength(1);

      const contentPart = result.contentParts![0];
      expect(contentPart.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(contentPart.contentPartId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(contentPart.mimeType).toBe('text/plain');

      // Verify ContentPartHelper methods
      expect(contentPart.isDataInline).toBe(true);
      expect(contentPart.isDataExternal).toBe(false);

      const data = await contentPart.getData();
      expect(data).toBe('Hello world');
    });

    it('should handle external content part data', async () => {
      const mockMessage = createMockRawMessage({
        contentParts: [
          {
            contentPartId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID,
            mimeType: 'application/pdf',
            data: { uri: 'https://example.com/document.pdf', byteCount: 12345 },
            citations: [],
            createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
            updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
          }
        ]
      });
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
      );

      const contentPart = result.contentParts![0];
      expect(contentPart.isDataInline).toBe(false);
      expect(contentPart.isDataExternal).toBe(true);
    });

    it('should transform assistant message with tool calls', async () => {
      const mockMessage = createMockRawAssistantMessage();
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.ASSISTANT_MESSAGE_ID
      );

      expect(result.role).toBe('assistant');

      // Tool calls
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID);
      expect(result.toolCalls[0].toolCallId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID);
      expect(result.toolCalls[0].name).toBe('search');
    });

    it('should transform interrupts with id alias', async () => {
      const mockMessage = createMockRawAssistantMessage();
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.ASSISTANT_MESSAGE_ID
      );

      expect(result.interrupts).toHaveLength(1);
      expect(result.interrupts[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID);
      expect(result.interrupts[0].interruptId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID);
      expect(result.interrupts[0].type).toBe('uipath_cas_tool_call_confirmation');
    });

    it('should transform citations with id alias', async () => {
      const mockMessage = createMockRawAssistantMessage();
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.ASSISTANT_MESSAGE_ID
      );

      const contentPart = result.contentParts![0];
      expect(contentPart.citations).toHaveLength(1);
      expect(contentPart.citations[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
      expect(contentPart.citations[0].citationId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
      expect(contentPart.citations[0].sources[0].title).toBe('Reference');
      expect((contentPart.citations[0].sources[0] as any).url).toBe('https://example.com/ref');
    });

    it('should handle message with no content parts', async () => {
      const mockMessage = createMockRawMessage({ contentParts: undefined });
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
      );

      expect(result.contentParts).toBeUndefined();
    });

    it('should handle message with empty tool calls and interrupts', async () => {
      const mockMessage = createMockRawMessage({
        toolCalls: [],
        interrupts: []
      });
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
      );

      expect(result.toolCalls).toHaveLength(0);
      expect(result.interrupts).toHaveLength(0);
    });

    it('should handle message with null tool calls and interrupts', async () => {
      const mockMessage = createMockRawMessage({
        toolCalls: null,
        interrupts: null
      });
      mockApiClient.get.mockResolvedValue(mockMessage);

      const result = await messages.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
      );

      // null should be coerced to empty arrays by the transformer
      expect(result.toolCalls).toHaveLength(0);
      expect(result.interrupts).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        messages.getById(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getContentPartById', () => {
    it('should get content part by ID successfully with inline data', async () => {
      const mockContentPart = createMockRawContentPart();
      mockApiClient.get.mockResolvedValue(mockContentPart);

      const result = await messages.getContentPartById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(result.contentPartId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(result.mimeType).toBe('text/plain');
      expect(result.isDataInline).toBe(true);
      expect(result.isDataExternal).toBe(false);

      // Verify getData returns inline content
      const data = await result.getData();
      expect(data).toBe('Some content');

      // Verify the correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        MESSAGE_ENDPOINTS.GET_CONTENT_PART(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID
        ),
        expect.any(Object)
      );
    });

    it('should get content part with external data', async () => {
      const mockContentPart = createMockRawContentPart({
        mimeType: 'application/pdf',
        data: { uri: 'https://example.com/document.pdf', byteCount: 54321 }
      });
      mockApiClient.get.mockResolvedValue(mockContentPart);

      const result = await messages.getContentPartById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID
      );

      expect(result.isDataInline).toBe(false);
      expect(result.isDataExternal).toBe(true);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should get content part with external data and fetch it', async () => {
      const mockFetchResponse = { ok: true, text: () => Promise.resolve('External content') };
      const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse);
      global.fetch = mockFetch;

      const mockContentPart = createMockRawContentPart({
        data: { uri: 'https://example.com/content.txt' }
      });
      mockApiClient.get.mockResolvedValue(mockContentPart);

      const result = await messages.getContentPartById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID
      );

      const data = await result.getData();
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/content.txt');
      expect(data).toEqual(mockFetchResponse);
    });

    it('should handle content part with citations', async () => {
      const mockContentPart = createMockRawContentPart({
        citations: [
          {
            citationId: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID,
            offset: 0,
            length: 5,
            sources: [{ title: 'Doc', number: 1, url: 'https://example.com/doc' }],
            createdTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.CREATED_AT,
            updatedTime: CONVERSATIONAL_AGENT_TEST_CONSTANTS.UPDATED_AT,
          }
        ]
      });
      mockApiClient.get.mockResolvedValue(mockContentPart);

      const result = await messages.getContentPartById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID
      );

      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
      expect(result.citations[0].citationId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
    });

    it('should handle content part with optional fields', async () => {
      const mockContentPart = createMockRawContentPart({
        isTranscript: true,
        isIncomplete: false,
        name: 'transcript.txt'
      });
      mockApiClient.get.mockResolvedValue(mockContentPart);

      const result = await messages.getContentPartById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID
      );

      expect(result.isTranscript).toBe(true);
      expect(result.isIncomplete).toBe(false);
      expect(result.name).toBe('transcript.txt');
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        messages.getContentPartById(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
