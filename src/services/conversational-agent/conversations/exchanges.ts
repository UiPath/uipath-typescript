/**
 * ExchangeService - Exchange operations for Conversations
 *
 * Exchanges represent individual request-response pairs within a conversation.
 * Each exchange contains messages from the user and assistant.
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationId,
  CreateFeedbackInput,
  Exchange,
  ExchangeId,
  ExchangeServiceModel,
  FeedbackCreateResponse,
  ExchangeGetAllOptions,
  ExchangeGetByIdOptions
} from '@/models/conversational-agent';

// Utils
import { CONVERSATIONAL_PAGINATION, CONVERSATIONAL_TOKEN_PARAMS } from '@/utils/constants/common';
import { EXCHANGE_ENDPOINTS } from '@/utils/constants/endpoints';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';

// Local imports
import { transformExchange, type ExchangeWithHelpers } from '@/services/conversational-agent/helpers';

/**
 * Service for exchange operations within a conversation
 *
 * Provides methods to list, retrieve, and provide feedback on exchanges.
 * Exchanges are the conversation turns containing user prompts and assistant responses.
 *
 * @example
 * ```typescript
 * // List all exchanges in a conversation
 * const conversationExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId);
 *
 * // Get a specific exchange with messages
 * const exchangeDetails = await conversationalAgentService.conversations.exchanges.getById(conversationId, exchangeId);
 *
 * // Submit feedback for an exchange
 * await conversationalAgentService.conversations.exchanges.createFeedback(conversationId, exchangeId, {
 *   rating: 'positive',
 *   comment: 'Great response!'
 * });
 * ```
 */
export class ExchangeService extends BaseService implements ExchangeServiceModel {
  /**
   * Creates a new ExchangeService instance
   * @param instance - UiPath SDK instance
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
  }

  /**
   * Gets all exchanges for a conversation with optional filtering and pagination
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param conversationId - The conversation ID to get exchanges for
   * @param options - Query options including optional pagination parameters
   * @returns Promise resolving to exchanges or paginated result
   *
   * @example
   * ```typescript
   * // Get all exchanges (non-paginated)
   * const conversationExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId);
   *
   * // First page with pagination
   * const firstPageOfExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPageOfExchanges.hasNextPage) {
   *   const nextPageOfExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId, { cursor: firstPageOfExchanges.nextCursor });
   * }
   * ```
   */
  @track('Exchanges.GetAll')
  async getAll<T extends ExchangeGetAllOptions = ExchangeGetAllOptions>(
    conversationId: ConversationId,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ExchangeWithHelpers>
      : NonPaginatedResponse<ExchangeWithHelpers>
  > {
    // Transform function to convert Exchange to ExchangeWithHelpers
    const transformFn = (exchange: Exchange) => transformExchange(exchange);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => EXCHANGE_ENDPOINTS.LIST(conversationId),
      transformFn,
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: CONVERSATIONAL_PAGINATION.ITEMS_FIELD,
        continuationTokenField: CONVERSATIONAL_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: CONVERSATIONAL_TOKEN_PARAMS.PAGE_SIZE_PARAM,
          tokenParam: CONVERSATIONAL_TOKEN_PARAMS.TOKEN_PARAM
        }
      },
      excludeFromPrefix: Object.keys(options || {}) // Conversational params are not OData
    }, options) as any;
  }

  /**
   * Gets an exchange by ID with its messages
   *
   * Retrieves a specific exchange including user and assistant messages.
   * Returns an ExchangeWithHelpers object that provides convenient access
   * to messages and content.
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange ID to retrieve
   * @param input - Optional parameters for message sorting
   * @returns Promise resolving to the exchange with helper methods
   *
   * @example
   * ```typescript
   * const exchangeDetails = await conversationalAgentService.conversations.exchanges.getById(
   *   conversationId,
   *   exchangeId
   * );
   *
   * // Access messages via helpers
   * const userPrompt = exchangeDetails.getUserMessage();
   * const assistantResponse = exchangeDetails.getAssistantMessage();
   *
   * // With message sort order
   * const exchangeWithDescMessages = await conversationalAgentService.conversations.exchanges.getById(
   *   conversationId,
   *   exchangeId,
   *   { messageSort: 'desc' }
   * );
   * ```
   */
  @track('Exchanges.GetById')
  async getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    input?: ExchangeGetByIdOptions
  ): Promise<ExchangeWithHelpers> {
    const params: ExchangeGetByIdOptions = {};

    if (input?.messageSort) {
      params.messageSort = input.messageSort;
    }

    const result = await this.get<Exchange>(
      EXCHANGE_ENDPOINTS.GET(conversationId, exchangeId),
      { params }
    );

    return transformExchange(result.data);
  }

  /**
   * Creates feedback for an exchange
   *
   * Submits user feedback (rating and optional comment) for an exchange.
   * Useful for collecting feedback on assistant responses for quality improvement.
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange to provide feedback for
   * @param input - Feedback data including rating and optional comment
   * @returns Promise resolving to the feedback creation response
   *
   * @example
   * ```typescript
   * // Submit positive feedback
   * await conversationalAgentService.conversations.exchanges.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: 'positive', comment: 'Very helpful response!' }
   * );
   *
   * // Submit negative feedback with explanation
   * await conversationalAgentService.conversations.exchanges.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: 'negative', comment: 'Response was not accurate' }
   * );
   * ```
   */
  @track('Exchanges.CreateFeedback')
  async createFeedback(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    input: CreateFeedbackInput
  ): Promise<FeedbackCreateResponse> {
    const response = await this.post<FeedbackCreateResponse>(
      EXCHANGE_ENDPOINTS.CREATE_FEEDBACK(conversationId, exchangeId),
      input
    );
    return response.data;
  }
}
