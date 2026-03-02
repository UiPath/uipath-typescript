/**
 * Message Service Model
 */

import type {
  MessageGetResponse,
  ContentPartGetResponse
} from './exchanges.types';

/**
 * Service for retrieving individual messages within an {@link ExchangeServiceModel | Exchange}
 *
 * A message is a single turn from a user, assistant, or system. Each message includes
 * a role, contentParts (text, audio, images), toolCalls, and interrupts.
 * Messages are also returned as part of exchange responses — use this service
 * when you need to fetch a specific message by ID or retrieve external content parts.
 * For real-time streaming of messages, see {@link MessageStream}.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Messages } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const message = new Messages(sdk);
 * const messageDetails = await message.getById(conversationId, exchangeId, messageId);
 * ```
 */
export interface MessageServiceModel {
  /**
   * Gets a message by ID
   *
   * Returns the message including its content parts, tool calls, and interrupts.
   *
   * @param conversationId - The conversation containing the message
   * @param exchangeId - The exchange containing the message
   * @param messageId - The message ID to retrieve
   * @returns Promise resolving to {@link MessageGetResponse}
   * @example
   * ```typescript
   * const message = await messages.getById(conversationId, exchangeId, messageId);
   *
   * console.log(message.role);
   * console.log(message.contentParts);
   * console.log(message.toolCalls);
   * ```
   */
  getById(
    conversationId: string,
    exchangeId: string,
    messageId: string
  ): Promise<MessageGetResponse>;

  /**
   * Gets an external content part by ID
   *
   * @param conversationId - The conversation containing the content
   * @param exchangeId - The exchange containing the content
   * @param messageId - The message containing the content part
   * @param contentPartId - The content part ID to retrieve
   * @returns Promise resolving to {@link ContentPartGetResponse}
   * @example
   * ```typescript
   * const contentPart = await messages.getContentPartById(
   *   conversationId,
   *   exchangeId,
   *   messageId,
   *   contentPartId
   * );
   * ```
   */
  getContentPartById(
    conversationId: string,
    exchangeId: string,
    messageId: string,
    contentPartId: string
  ): Promise<ContentPartGetResponse>;
}
