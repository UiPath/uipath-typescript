/**
 * Exchange Service Model
 */

import type {
  ExchangeGetAllOptions,
  ExchangeGetByIdOptions,
  CreateFeedbackOptions,
  FeedbackCreateResponse,
  ExchangeGetResponse
} from './exchanges.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';

/**
 * Service for retrieving exchanges and managing feedback within a {@link ConversationServiceModel | Conversation}
 *
 * An exchange represents a single request-response cycle — typically one user
 * question and the agent's reply. Each exchange response includes its
 * {@link MessageServiceModel | Messages}, making this the primary way to retrieve
 * conversation history. For real-time streaming of exchanges, see {@link ExchangeStream}.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Exchanges } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const exchanges = new Exchanges(sdk);
 * const conversationExchanges = await exchanges.getAll(conversationId);
 * ```
 */
export interface ExchangeServiceModel {
  /**
   * Gets all exchanges for a conversation with optional filtering and pagination
   *
   * @param conversationId - The conversation ID to get exchanges for
   * @param options - Options for querying exchanges including optional pagination parameters
   * @returns Promise resolving to either an array of exchanges {@link NonPaginatedResponse}<{@link ExchangeGetResponse}> or a {@link PaginatedResponse}<{@link ExchangeGetResponse}> when pagination options are used
   * @example
   * ```typescript
   * // Get all exchanges (non-paginated)
   * const conversationExchanges = await exchanges.getAll(conversationId);
   *
   * // First page with pagination
   * const firstPageOfExchanges = await exchanges.getAll(conversationId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPageOfExchanges.hasNextPage) {
   *   const nextPageOfExchanges = await exchanges.getAll(conversationId, {
   *     cursor: firstPageOfExchanges.nextCursor
   *   });
   * }
   * ```
   */
  getAll<T extends ExchangeGetAllOptions = ExchangeGetAllOptions>(
    conversationId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ExchangeGetResponse>
      : NonPaginatedResponse<ExchangeGetResponse>
  >;

  /**
   * Gets an exchange by ID with its messages
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange ID to retrieve
   * @param options - Optional parameters for message sorting
   * @returns Promise resolving to {@link ExchangeGetResponse}
   * @example
   * ```typescript
   * const exchange = await exchanges.getById(conversationId, exchangeId);
   *
   * // Access messages
   * for (const message of exchange.messages) {
   *   console.log(message.role, message.contentParts);
   * }
   * ```
   */
  getById(
    conversationId: string,
    exchangeId: string,
    options?: ExchangeGetByIdOptions
  ): Promise<ExchangeGetResponse>;

  /**
   * Creates feedback for an exchange
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange to provide feedback for
   * @param options - Feedback data including rating and optional comment
   * @returns Promise resolving to the feedback creation response
   * {@link FeedbackCreateResponse}
   * @example
   * ```typescript
   * await exchanges.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: FeedbackRating.Positive, comment: 'Very helpful!' }
   * );
   * ```
   */
  createFeedback(
    conversationId: string,
    exchangeId: string,
    options: CreateFeedbackOptions
  ): Promise<FeedbackCreateResponse>;
}

/**
 * Scoped exchange service for a specific conversation.
 * Auto-fills conversationId from the conversation.
 */
export interface ConversationExchangeServiceModel {
  /**
   * Gets all exchanges for this conversation with optional filtering and pagination
   *
   * @param options - Options for querying exchanges including optional pagination parameters
   * @returns Promise resolving to either an array of exchanges or a paginated response
   *
   * @example
   * ```typescript
   * const conversation = await conversationalAgent.conversations.getById(conversationId);
   *
   * // Get all exchanges
   * const allExchanges = await conversation.exchanges.getAll();
   *
   * // With pagination
   * const firstPage = await conversation.exchanges.getAll({ pageSize: 10 });
   * if (firstPage.hasNextPage) {
   *   const nextPage = await conversation.exchanges.getAll({ cursor: firstPage.nextCursor });
   * }
   * ```
   */
  getAll<T extends ExchangeGetAllOptions = ExchangeGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ExchangeGetResponse>
      : NonPaginatedResponse<ExchangeGetResponse>
  >;

  /**
   * Gets an exchange by ID with its messages
   *
   * @param exchangeId - The exchange ID to retrieve
   * @param options - Optional parameters for message sorting
   * @returns Promise resolving to the exchange with messages
   *
   * @example
   * ```typescript
   * const exchange = await conversation.exchanges.getById(exchangeId);
   * for (const message of exchange.messages) {
   *   console.log(message.role, message.contentParts);
   * }
   * ```
   */
  getById(
    exchangeId: string,
    options?: ExchangeGetByIdOptions
  ): Promise<ExchangeGetResponse>;

  /**
   * Creates feedback for an exchange
   *
   * @param exchangeId - The exchange to provide feedback for
   * @param options - Feedback data including rating and optional comment
   * @returns Promise resolving to the feedback creation response
   *
   * @example
   * ```typescript
   * await conversation.exchanges.createFeedback(exchangeId, {
   *   rating: FeedbackRating.Positive,
   *   comment: 'Very helpful!'
   * });
   * ```
   */
  createFeedback(
    exchangeId: string,
    options: CreateFeedbackOptions
  ): Promise<FeedbackCreateResponse>;
}
