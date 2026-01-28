/**
 * Types for Exchange Service
 */

import type { SortOrder, FeedbackRating, Exchange, Message, ContentPart } from './types/core.types';
import type { PaginationOptions } from '@/utils/pagination/types';

// ==================== Response Types ====================

/**
 * Response type for Exchange with MessageGetResponse instead of raw Message
 */
export interface ExchangeGetResponse extends Omit<Exchange, 'messages'> {
  messages: MessageGetResponse[];
}

/**
 * Response type for Message with ContentPartGetResponse
 */
export interface MessageGetResponse extends Omit<Message, 'contentParts'> {
  contentParts?: ContentPartGetResponse[];
}

/**
 * Response interface for ContentPart with convenience methods for accessing data.
 *
 * Provides helper properties and methods to determine if content is stored
 * inline or externally, and to retrieve the data accordingly.
 *
 * @example
 * ```typescript
 * const contentPart = message.contentParts[0];
 *
 * // Check storage type
 * if (contentPart.isDataInline) {
 *   const data = await contentPart.getData(); // Returns string
 * } else if (contentPart.isDataExternal) {
 *   const response = await contentPart.getData(); // Returns fetch Response
 * }
 * ```
 */
export interface ContentPartGetResponse extends ContentPart {
  /** Returns true if data is stored inline (as a string value) */
  readonly isDataInline: boolean;
  /** Returns true if data is stored externally (as a URI reference) */
  readonly isDataExternal: boolean;
  /**
   * Retrieves the content data.
   * @returns For inline data: the string content. For external data: a fetch Response.
   */
  getData(): Promise<string | Response>;
}

// ==================== Response Types ====================

/**
 * Response type for Exchange with MessageGetResponse instead of raw Message
 */
export interface ExchangeGetResponse extends Omit<Exchange, 'messages'> {
  messages: MessageGetResponse[];
}

/**
 * Response type for Message with ContentPartGetResponse
 */
export interface MessageGetResponse extends Omit<Message, 'contentParts'> {
  contentParts?: ContentPartGetResponse[];
}

/**
 * Response interface for ContentPart with convenience methods for accessing data.
 *
 * Provides helper properties and methods to determine if content is stored
 * inline or externally, and to retrieve the data accordingly.
 *
 * @example
 * ```typescript
 * const contentPart = message.contentParts[0];
 *
 * // Check storage type
 * if (contentPart.isDataInline) {
 *   const data = await contentPart.getData(); // Returns string
 * } else if (contentPart.isDataExternal) {
 *   const response = await contentPart.getData(); // Returns fetch Response
 * }
 * ```
 */
export interface ContentPartGetResponse extends ContentPart {
  /** Returns true if data is stored inline (as a string value) */
  readonly isDataInline: boolean;
  /** Returns true if data is stored externally (as a URI reference) */
  readonly isDataExternal: boolean;
  /**
   * Retrieves the content data.
   * @returns For inline data: the string content. For external data: a fetch Response.
   */
  getData(): Promise<string | Response>;
}

// ==================== Exchange Options ====================

export type ExchangeGetAllOptions = PaginationOptions & {
  /** Sort order for exchanges */
  exchangeSort?: SortOrder;
  /** Sort order for messages within each exchange */
  messageSort?: SortOrder;
}

export interface ExchangeGetByIdOptions {
  /** Sort order for messages within the exchange */
  messageSort?: SortOrder;
}

// ==================== Feedback Types ====================

export interface CreateFeedbackOptions {
  /** Rating for the exchange ('positive' or 'negative') */
  rating: FeedbackRating;
  /** Optional text comment for the feedback */
  comment?: string;
}

export interface FeedbackCreateResponse {}
