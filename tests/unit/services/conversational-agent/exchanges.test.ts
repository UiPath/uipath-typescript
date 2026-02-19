// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExchangeService } from '@/services/conversational-agent/conversations/exchanges';
import { ApiClient } from '@/core/http/api-client';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import {
  createMockRawExchange,
  createMockTransformedExchangeCollection,
  createMockError,
  CONVERSATIONAL_AGENT_TEST_CONSTANTS,
  TEST_CONSTANTS,
} from '@tests/utils/mocks';
import { createServiceTestDependencies, createMockApiClient } from '@tests/utils/setup';
import { EXCHANGE_ENDPOINTS } from '@/utils/constants/endpoints';
import { FeedbackRating } from '@/models/conversational-agent/conversations/types/core.types';

// ===== MOCKING =====
vi.mock('@/core/http/api-client');

// Import mock objects using vi.hoisted()
const mocks = vi.hoisted(() => {
  return import('@tests/utils/mocks/core');
});

// Mock pagination helpers (do NOT mock transformData - test real transformation)
vi.mock('@/utils/pagination/helpers', async () => (await mocks).mockPaginationHelpers);

// ===== TEST SUITE =====
describe('ExchangeService Unit Tests', () => {
  let exchanges: ExchangeService;
  let mockApiClient: any;

  beforeEach(() => {
    const { instance } = createServiceTestDependencies();
    mockApiClient = createMockApiClient();

    vi.mocked(ApiClient).mockImplementation(() => mockApiClient);

    // Reset pagination helpers mock before each test
    vi.mocked(PaginationHelpers.getAll).mockReset();

    exchanges = new ExchangeService(instance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all exchanges without pagination options', async () => {
      const mockResponse = createMockTransformedExchangeCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await exchanges.getAll(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID);

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccess: expect.any(Object),
          getEndpoint: expect.toSatisfy((fn: Function) =>
            fn() === EXCHANGE_ENDPOINTS.LIST(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID)
          ),
          transformFn: expect.any(Function),
          pagination: expect.any(Object)
        }),
        undefined
      );

      expect(result).toEqual(mockResponse);
    });

    it('should return paginated exchanges when pagination options provided', async () => {
      const mockResponse = createMockTransformedExchangeCollection(5, {
        hasNextPage: true,
        nextCursor: TEST_CONSTANTS.NEXT_CURSOR,
      });

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      const result = await exchanges.getAll(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { pageSize: TEST_CONSTANTS.PAGE_SIZE }
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          pageSize: TEST_CONSTANTS.PAGE_SIZE
        })
      );

      expect(result).toEqual(mockResponse);
      expect(result.hasNextPage).toBe(true);
      expect(result.nextCursor).toBe(TEST_CONSTANTS.NEXT_CURSOR);
    });

    it('should support exchangeSort and messageSort options', async () => {
      const mockResponse = createMockTransformedExchangeCollection();

      vi.mocked(PaginationHelpers.getAll).mockResolvedValue(mockResponse);

      await exchanges.getAll(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        { exchangeSort: 'descending' as any, messageSort: 'ascending' as any }
      );

      expect(PaginationHelpers.getAll).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          exchangeSort: 'descending',
          messageSort: 'ascending'
        })
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      vi.mocked(PaginationHelpers.getAll).mockRejectedValue(error);

      await expect(
        exchanges.getAll(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('getById', () => {
    it('should get exchange by ID successfully with transformed fields', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      const result = await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID);
      expect(result.exchangeId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID);

      // Verify the correct endpoint
      expect(mockApiClient.get).toHaveBeenCalledWith(
        EXCHANGE_ENDPOINTS.GET(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID),
        expect.any(Object)
      );
    });

    it('should transform messages within the exchange', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      const result = await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      expect(result.messages).toHaveLength(2);

      // User message
      const userMessage = result.messages[0];
      expect(userMessage.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID);
      expect(userMessage.messageId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.MESSAGE_ID);
      expect(userMessage.role).toBe('user');

      // Assistant message
      const assistantMessage = result.messages[1];
      expect(assistantMessage.id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.ASSISTANT_MESSAGE_ID);
      expect(assistantMessage.role).toBe('assistant');
    });

    it('should transform content parts with ContentPartHelper', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      const result = await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      const userMessage = result.messages[0];
      expect(userMessage.contentParts).toHaveLength(1);

      const contentPart = userMessage.contentParts![0];
      expect(contentPart.contentPartId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONTENT_PART_ID);
      expect(contentPart.mimeType).toBe('text/plain');
      expect(contentPart.isDataInline).toBe(true);
      expect(contentPart.isDataExternal).toBe(false);

      // Verify getData returns inline content
      const data = await contentPart.getData();
      expect(data).toBe('Hello world');
    });

    it('should transform tool calls with id alias', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      const result = await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      const assistantMessage = result.messages[1];
      expect(assistantMessage.toolCalls).toHaveLength(1);
      expect(assistantMessage.toolCalls[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID);
      expect(assistantMessage.toolCalls[0].toolCallId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.TOOL_CALL_ID);
      expect(assistantMessage.toolCalls[0].name).toBe('search');
    });

    it('should transform interrupts with id alias', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      const result = await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      const assistantMessage = result.messages[1];
      expect(assistantMessage.interrupts).toHaveLength(1);
      expect(assistantMessage.interrupts[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID);
      expect(assistantMessage.interrupts[0].interruptId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.INTERRUPT_ID);
    });

    it('should transform citations with id alias', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      const result = await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      const assistantMessage = result.messages[1];
      const contentPart = assistantMessage.contentParts![0];
      expect(contentPart.citations).toHaveLength(1);
      expect(contentPart.citations[0].id).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
      expect(contentPart.citations[0].citationId).toBe(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CITATION_ID);
      expect(contentPart.citations[0].sources[0].title).toBe('Reference');
      expect((contentPart.citations[0].sources[0] as any).url).toBe('https://example.com/ref');
    });

    it('should pass messageSort option as query param', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        { messageSort: 'descending' as any }
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        EXCHANGE_ENDPOINTS.GET(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID),
        expect.objectContaining({
          params: { messageSort: 'descending' }
        })
      );
    });

    it('should not pass messageSort when not provided', async () => {
      const mockExchange = createMockRawExchange();
      mockApiClient.get.mockResolvedValue(mockExchange);

      await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        EXCHANGE_ENDPOINTS.GET(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID),
        expect.objectContaining({
          params: {}
        })
      );
    });

    it('should handle exchange with empty messages', async () => {
      const mockExchange = createMockRawExchange({ messages: [] });
      mockApiClient.get.mockResolvedValue(mockExchange);

      const result = await exchanges.getById(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
      );

      expect(result.messages).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.get.mockRejectedValue(error);

      await expect(
        exchanges.getById(CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID, CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID)
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });

  describe('createFeedback', () => {
    it('should create positive feedback successfully', async () => {
      const mockResponse = {};
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await exchanges.createFeedback(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        { rating: FeedbackRating.Positive }
      );

      expect(result).toEqual(mockResponse);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        EXCHANGE_ENDPOINTS.CREATE_FEEDBACK(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
        ),
        { rating: FeedbackRating.Positive },
        expect.any(Object)
      );
    });

    it('should create positive feedback with comment', async () => {
      const mockResponse = {};
      mockApiClient.post.mockResolvedValue(mockResponse);

      await exchanges.createFeedback(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        { rating: FeedbackRating.Positive, comment: 'Great response!' }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        EXCHANGE_ENDPOINTS.CREATE_FEEDBACK(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
        ),
        { rating: FeedbackRating.Positive, comment: 'Great response!' },
        expect.any(Object)
      );
    });

    it('should create negative feedback without comment', async () => {
      const mockResponse = {};
      mockApiClient.post.mockResolvedValue(mockResponse);

      await exchanges.createFeedback(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        { rating: FeedbackRating.Negative }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        EXCHANGE_ENDPOINTS.CREATE_FEEDBACK(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
        ),
        { rating: FeedbackRating.Negative },
        expect.any(Object)
      );
    });

    it('should create negative feedback with comment', async () => {
      const mockResponse = {};
      mockApiClient.post.mockResolvedValue(mockResponse);

      await exchanges.createFeedback(
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
        CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
        { rating: FeedbackRating.Negative, comment: 'Not accurate' }
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(
        EXCHANGE_ENDPOINTS.CREATE_FEEDBACK(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID
        ),
        { rating: FeedbackRating.Negative, comment: 'Not accurate' },
        expect.any(Object)
      );
    });

    it('should handle API errors', async () => {
      const error = createMockError(TEST_CONSTANTS.ERROR_MESSAGE);
      mockApiClient.post.mockRejectedValue(error);

      await expect(
        exchanges.createFeedback(
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.CONVERSATION_ID,
          CONVERSATIONAL_AGENT_TEST_CONSTANTS.EXCHANGE_ID,
          { rating: FeedbackRating.Positive }
        )
      ).rejects.toThrow(TEST_CONSTANTS.ERROR_MESSAGE);
    });
  });
});
