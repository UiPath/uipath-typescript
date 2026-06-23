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
import type { PaginatedResponse } from '@/utils/pagination';

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
   * Gets exchanges for a conversation with pagination and optional sort parameters
   *
   * Returns a paginated response. When called without `pageSize`/`cursor`, the
   * backend applies its default page size — inspect `hasNextPage`/`nextCursor`
   * to navigate further pages.
   *
   * @param conversationId - The conversation ID to get exchanges for
   * @param options - Options for querying exchanges including optional pagination parameters
   * @returns Promise resolving to a {@link PaginatedResponse}<{@link ExchangeGetResponse}>
   *
   * @example Basic usage - default page size and sort order
   * ```typescript
   * // First page
   * const firstPage = await exchanges.getAll(conversationId);
   *
   * // Navigate using cursor
   * if (firstPage.hasNextPage) {
   *   const nextPage = await exchanges.getAll(conversationId, { cursor: firstPage.nextCursor });
   * }
   * ```
   *
   * @example With explicit page size and exchange/message sort orders
   * ```typescript
   * import { SortOrder } from '@uipath/uipath-typescript/conversational-agent';
   *
   * const firstPage = await exchanges.getAll(conversationId, {
   *   pageSize: 10,
   *   exchangeSort: SortOrder.Descending,
   *   messageSort: SortOrder.Ascending
   * });
   *
   * // Navigate using cursor and same parameters
   * if (firstPage.hasNextPage) {
   *   const nextPage = await exchanges.getAll(conversationId, {
   *     pageSize: 10,
   *     exchangeSort: SortOrder.Descending,
   *     messageSort: SortOrder.Ascending,
   *     cursor: firstPage.nextCursor
   *   });
   * }
   * ```
   */
  getAll(
    conversationId: string,
    options?: ExchangeGetAllOptions
  ): Promise<PaginatedResponse<ExchangeGetResponse>>;

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
   * Gets exchanges for this conversation with pagination and optional sort parameters
   *
   * Returns a paginated response. When called without `pageSize`/`cursor`, the
   * backend applies its default page size — inspect `hasNextPage`/`nextCursor`
   * to navigate further pages.
   *
   * @param options - Options for querying exchanges including optional pagination parameters
   * @returns Promise resolving to a {@link PaginatedResponse}<{@link ExchangeGetResponse}>
   *
   * @example Basic usage - default page size and sort order
   * ```typescript
   * const conversation = await conversationalAgent.conversations.getById(conversationId);
   *
   * // First page
   * const firstPage = await conversation.exchanges.getAll();
   *
   * // Navigate using cursor
   * if (firstPage.hasNextPage) {
   *   const nextPage = await conversation.exchanges.getAll({ cursor: firstPage.nextCursor });
   * }
   * ```
   *
   * @example With explicit page size and exchange/message sort orders
   * ```typescript
   * import { SortOrder } from '@uipath/uipath-typescript/conversational-agent';
   *
   * const conversation = await conversationalAgent.conversations.getById(conversationId);
   *
   * // First page
   * const firstPage = await conversation.exchanges.getAll({
   *   pageSize: 10,
   *   exchangeSort: SortOrder.Descending,
   *   messageSort: SortOrder.Ascending
   * });
   *
   * // Navigate using cursor and same parameters
   * if (firstPage.hasNextPage) {
   *   const nextPage = await conversation.exchanges.getAll({
   *     pageSize: 10,
   *     exchangeSort: SortOrder.Descending,
   *     messageSort: SortOrder.Ascending,
   *     cursor: firstPage.nextCursor
   *   });
   * }
   * ```
   */
  getAll(options?: ExchangeGetAllOptions): Promise<PaginatedResponse<ExchangeGetResponse>>;

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
