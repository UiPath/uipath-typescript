/**
 * Message Service Model
 */

import type {
  ConversationId,
  ExchangeId,
  MessageId,
  ContentPartId
} from './types/common.types';
import type {
  MessageGetResponse,
  ContentPartGetResponse
} from './exchanges.types';

/**
 * Service for message operations within conversations
 *
 * Messages are the individual turns within an exchange.
 *
 * ### Usage
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
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId
  ): Promise<MessageGetResponse>;

  /**
   * Gets an external content part by ID
   *
   * Retrieves content stored externally (e.g., large files or attachments)
   * rather than inline in the message. Returns 404 for inline content parts (text) —
   * use the message's contentParts directly for inline content.
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
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId,
    contentPartId: ContentPartId
  ): Promise<ContentPartGetResponse>;
}
