/**
 * Message operations for Conversations
 *
 * Messages are the individual turns within an exchange. Each exchange typically
 * contains a user message (the prompt) and an assistant message (the response).
 * Messages contain content parts which hold the actual text, attachments, or tool calls.
 */

// Core SDK imports
import type { UiPath } from '@/core/uipath';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ContentPart,
  ContentPartId,
  ConversationId,
  ExchangeId,
  Message,
  MessageId
} from '@/models/conversational';

// Utils
import { MESSAGE_ENDPOINTS } from '@/utils/constants/endpoints';

// Local imports
import {
  ContentPartHelper,
  transformMessage,
  type MessageWithHelpers
} from '../helpers';

/**
 * Service for message operations within a conversation
 *
 * Provides methods to retrieve individual messages and their content parts.
 * Content parts can contain text, attachments, citations, or tool calls.
 *
 * @example
 * ```typescript
 * // Get a specific message
 * const message = await conversations.messages.getById(
 *   conversationId,
 *   exchangeId,
 *   messageId
 * );
 *
 * // Access content via helpers
 * const textContent = message.getTextContent();
 * const toolCalls = message.getToolCalls();
 *
 * // Get external content part data
 * const contentPart = await conversations.messages.getContentPart(
 *   conversationId,
 *   exchangeId,
 *   messageId,
 *   contentPartId
 * );
 * ```
 */
export class MessageOperations extends BaseService {
  /**
   * Creates a new MessageOperations instance
   * @param instance - UiPath SDK instance
   */
  constructor(instance: UiPath) {
    super(instance);
  }

  /**
   * Gets a message by ID
   *
   * Retrieves a specific message including all its content parts.
   * Returns a MessageWithHelpers object that provides convenient methods
   * for accessing text content, tool calls, citations, and more.
   *
   * @param conversationId - The conversation containing the message
   * @param exchangeId - The exchange containing the message
   * @param messageId - The message ID to retrieve
   * @returns Promise resolving to the message with helper methods
   *
   * @example
   * ```typescript
   * const message = await conversations.messages.getById(
   *   conversationId,
   *   exchangeId,
   *   messageId
   * );
   *
   * // Get all text content concatenated
   * const text = message.getTextContent();
   *
   * // Get tool calls from the message
   * const toolCalls = message.getToolCalls();
   *
   * // Get citations for verification
   * const citations = message.getCitations();
   * ```
   */
  @track('Messages.GetById')
  async getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId
  ): Promise<MessageWithHelpers> {
    const result = await this.get<Message>(
      MESSAGE_ENDPOINTS.GET(conversationId, exchangeId, messageId)
    );

    return transformMessage(result.data);
  }

  /**
   * Gets a content part by ID
   *
   * Retrieves external content part data. This is used when content is stored
   * externally (e.g., large files or attachments) rather than inline in the message.
   *
   * Note: This API returns 404 for inline content parts (text). Use the message's
   * contentParts directly for inline content.
   *
   * @param conversationId - The conversation containing the content
   * @param exchangeId - The exchange containing the content
   * @param messageId - The message containing the content part
   * @param contentPartId - The content part ID to retrieve
   * @returns Promise resolving to a ContentPartHelper for accessing the data
   * @throws {NetworkError} 404 if the content part is inline (not external)
   *
   * @example
   * ```typescript
   * // Get an external content part (file/attachment)
   * const contentPart = await conversations.messages.getContentPart(
   *   conversationId,
   *   exchangeId,
   *   messageId,
   *   contentPartId
   * );
   *
   * // Check if it's external before fetching
   * if (contentPart.isExternal()) {
   *   const data = contentPart.getData();
   * }
   * ```
   */
  @track('Messages.GetContentPart')
  async getContentPart(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId,
    contentPartId: ContentPartId
  ): Promise<ContentPartHelper> {
    const result = await this.get<ContentPart>(
      MESSAGE_ENDPOINTS.GET_CONTENT_PART(conversationId, exchangeId, messageId, contentPartId)
    );

    return new ContentPartHelper(result.data);
  }
}
