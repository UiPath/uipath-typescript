/**
 * Types for Exchange Service
 */

import type { SortOrder, Exchange, Message, ContentPart } from './core.types';
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

// ==================== Exchange Options ====================

export type ExchangeGetAllOptions = PaginationOptions & {
  exchangeSort?: SortOrder;
  messageSort?: SortOrder;
}

export interface ExchangeGetByIdOptions {
  messageSort?: SortOrder;
  /** Index signature for QueryParams compatibility */
  [key: string]: SortOrder | undefined;
}
