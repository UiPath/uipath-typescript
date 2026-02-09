/**
 * Exchange Service Model
 */

import type {
  ConversationId,
  ExchangeId
} from './types/common.types';
import type {
  ExchangeGetAllOptions,
  ExchangeGetByIdOptions,
  CreateFeedbackOptions,
  FeedbackCreateResponse,
  ExchangeGetResponse
} from './exchanges.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';

/**
 * Service for exchange operations within conversations
 *
 * Exchanges represent individual request-response pairs within a conversation.
 * Each exchange contains messages from the user and assistant.
 *
 * ### Usage
 *
 * ```typescript
 * import { Exchanges } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const exchangesService = new Exchanges(sdk);
 * const conversationExchanges = await exchangesService.getAll(conversationId);
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
   * const conversationExchanges = await exchangesService.getAll(conversationId);
   *
   * // First page with pagination
   * const firstPageOfExchanges = await exchangesService.getAll(conversationId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPageOfExchanges.hasNextPage) {
   *   const nextPageOfExchanges = await exchangesService.getAll(conversationId, {
   *     cursor: firstPageOfExchanges.nextCursor
   *   });
   * }
   * ```
   */
  getAll<T extends ExchangeGetAllOptions = ExchangeGetAllOptions>(
    conversationId: ConversationId,
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
   * const exchange = await exchangesService.getById(conversationId, exchangeId);
   *
   * // Access messages
   * for (const message of exchange.messages) {
   *   console.log(message.role, message.contentParts);
   * }
   * ```
   */
  getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
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
   * await exchangesService.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: FeedbackRating.Positive, comment: 'Very helpful!' }
   * );
   * ```
   */
  createFeedback(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    options: CreateFeedbackOptions
  ): Promise<FeedbackCreateResponse>;
}
