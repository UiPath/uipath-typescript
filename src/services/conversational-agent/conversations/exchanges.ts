/**
 * ExchangeService - Exchange operations for Conversations
 *
 * Exchanges represent individual request-response pairs within a conversation.
 * Each exchange contains messages from the user and assistant.
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationId,
  CreateFeedbackOptions,
  Exchange,
  ExchangeId,
  ExchangeServiceModel,
  FeedbackCreateResponse,
  ExchangeGetAllOptions,
  ExchangeGetByIdOptions,
  ExchangeGetResponse
} from '@/models/conversational-agent';

// Utils
import { CONVERSATIONAL_PAGINATION, CONVERSATIONAL_TOKEN_PARAMS } from '@/utils/constants/common';
import { EXCHANGE_ENDPOINTS } from '@/utils/constants/endpoints';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';

// Local imports
import { transformExchange } from '@/services/conversational-agent/helpers';

/**
 * Service for exchange operations within a conversation
 *
 * Provides methods to list, retrieve, and provide feedback on exchanges.
 * Exchanges are the conversation turns containing user prompts and assistant responses.
 *
 * @example
 * ```typescript
 * import { Exchanges } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const exchangesService = new Exchanges(sdk);
 *
 * // List all exchanges in a conversation
 * const conversationExchanges = await exchangesService.getAll(conversationId);
 *
 * // Get a specific exchange with messages
 * const exchangeDetails = await exchangesService.getById(conversationId, exchangeId);
 *
 * // Submit feedback for an exchange
 * await exchangesService.createFeedback(conversationId, exchangeId, {
 *   rating: FeedbackRating.Positive,
 *   comment: 'Great response!'
 * });
 * ```
 */
export class ExchangeService extends BaseService implements ExchangeServiceModel {
  /**
   * Creates a new ExchangeService instance
   * @param instance - UiPath SDK instance
   */
  constructor(instance: IUiPath) {
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
   * @param options - Options for querying exchanges including optional pagination parameters
   * @returns Promise resolving to either an array of exchanges {@link NonPaginatedResponse}<{@link ExchangeGetResponse}> or a {@link PaginatedResponse}<{@link ExchangeGetResponse}> when pagination options are used
   *
   * @example
   * ```typescript
   * // Get all exchanges (non-paginated)
   * const conversationExchanges = await exchangesService.getAll(conversationId);
   *
   * // First page with pagination
   * const firstPageOfExchanges = await exchangesService.getAll(conversationId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPageOfExchanges.hasNextPage) {
   *   const nextPageOfExchanges = await exchangesService.getAll(conversationId, { cursor: firstPageOfExchanges.nextCursor });
   * }
   * ```
   */
  @track('ConversationalAgent.Exchanges.GetAll')
  async getAll<T extends ExchangeGetAllOptions = ExchangeGetAllOptions>(
    conversationId: ConversationId,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ExchangeGetResponse>
      : NonPaginatedResponse<ExchangeGetResponse>
  > {
    // Transform function to convert Exchange to ExchangeGetResponse
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
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange ID to retrieve
   * @param options - Optional parameters for message sorting
   * @returns Promise resolving to {@link ExchangeGetResponse}
   *
   * @example
   * ```typescript
   * const exchange = await exchangesService.getById(conversationId, exchangeId);
   *
   * // Access messages
   * for (const message of exchange.messages) {
   *   console.log(message.role, message.contentParts);
   * }
   * ```
   */
  @track('ConversationalAgent.Exchanges.GetById')
  async getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    options?: ExchangeGetByIdOptions
  ): Promise<ExchangeGetResponse> {
    const params: ExchangeGetByIdOptions = {};

    if (options?.messageSort) {
      params.messageSort = options.messageSort;
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
   * @param options - Feedback data including rating and optional comment
   * @returns Promise resolving to the feedback creation response
   *
   * @example
   * ```typescript
   * // Submit positive feedback
   * await exchangesService.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: FeedbackRating.Positive, comment: 'Very helpful response!' }
   * );
   *
   * // Submit negative feedback with explanation
   * await exchangesService.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: FeedbackRating.Negative, comment: 'Response was not accurate' }
   * );
   * ```
   */
  @track('ConversationalAgent.Exchanges.CreateFeedback')
  async createFeedback(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    options: CreateFeedbackOptions
  ): Promise<FeedbackCreateResponse> {
    const response = await this.post<FeedbackCreateResponse>(
      EXCHANGE_ENDPOINTS.CREATE_FEEDBACK(conversationId, exchangeId),
      options
    );
    return response.data;
  }
}
