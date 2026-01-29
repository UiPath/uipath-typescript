/**
 * Message Service Model
 */

import type {
  ConversationId,
  ExchangeId,
  MessageId,
  ContentPartId
} from './common.types';
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
 * const messageDetails = await conversationalAgentService.conversations.messages.getById(
 *   conversationId, exchangeId, messageId
 * );
 * ```
 */
export interface MessageServiceModel {
  /**
   * Gets a message by ID
   *
   * @param conversationId - The conversation containing the message
   * @param exchangeId - The exchange containing the message
   * @param messageId - The message ID to retrieve
   * @returns Promise resolving to the message with helper methods
   * {@link MessageGetResponse}
   * @example
   * ```typescript
   * const messageDetails = await conversationalAgentService.conversations.messages.getById(
   *   conversationId,
   *   exchangeId,
   *   messageId
   * );
   *
   * const messageText = messageDetails.getTextContent();
   * const messageToolCalls = messageDetails.getToolCalls();
   * ```
   */
  getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId
  ): Promise<MessageGetResponse>;

  /**
   * Gets a content part by ID
   *
   * @param conversationId - The conversation containing the content
   * @param exchangeId - The exchange containing the content
   * @param messageId - The message containing the content part
   * @param contentPartId - The content part ID to retrieve
   * @returns Promise resolving to a ContentPartGetResponse
   * {@link ContentPartGetResponse}
   * @example
   * ```typescript
   * const contentPartDetails = await conversationalAgentService.conversations.messages.getContentPartById(
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
