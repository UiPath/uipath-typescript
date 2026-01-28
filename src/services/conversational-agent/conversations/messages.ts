/**
 * MessageService - Message operations for Conversations
 *
 * Messages are the individual turns within an exchange. Each exchange typically
 * contains a user message (the prompt) and an assistant message (the response).
 * Messages contain content parts which hold the actual text, attachments, or tool calls.
 */

// Core SDK imports
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ContentPart,
  ContentPartGetResponse,
  Message,
  MessageServiceModel,
  MessageGetResponse
} from '@/models/conversational-agent';

// Utils
import { MESSAGE_ENDPOINTS } from '@/utils/constants/endpoints';

// Local imports
import { transformMessage, ContentPartHelper } from '@/services/conversational-agent/helpers';

/**
 * Service for message operations within a conversation
 *
 * Provides methods to retrieve individual messages and their content parts.
 * Content parts can contain text, attachments, citations, or tool calls.
 *
 * @example
 * ```typescript
 * import { Messages } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const messages = new Messages(sdk);
 *
 * // Get a specific message
 * const messageDetails = await messages.getById(conversationId, exchangeId, messageId);
 *
 * // Access message properties
 * console.log(messageDetails.role);
 * console.log(messageDetails.contentParts);
 * console.log(messageDetails.toolCalls);
 *
 * // Get external content part data
 * const contentPartDetails = await messages.getContentPartById(
 *   conversationId,
 *   exchangeId,
 *   messageId,
 *   contentPartId
 * );
 * ```
 */
export class MessageService extends BaseService implements MessageServiceModel {
  /**
   * Gets a message by ID
   *
   * @param conversationId - The conversation containing the message
   * @param exchangeId - The exchange containing the message
   * @param messageId - The message ID to retrieve
   * @returns Promise resolving to {@link MessageGetResponse}
   *
   * @example
   * ```typescript
   * const message = await messages.getById(conversationId, exchangeId, messageId);
   *
   * console.log(message.role);
   * console.log(message.contentParts);
   * console.log(message.toolCalls);
   * ```
   */
  @track('ConversationalAgent.Messages.GetById')
  async getById(
    conversationId: string,
    exchangeId: string,
    messageId: string
  ): Promise<MessageGetResponse> {
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
   * @returns Promise resolving to a ContentPartGetResponse for accessing the data
   *
   * @example
   * ```typescript
   * // Get an external content part (file/attachment)
   * const contentPartDetails = await messages.getContentPartById(
   *   conversationId,
   *   exchangeId,
   *   messageId,
   *   contentPartId
   * );
   * ```
   */
  @track('ConversationalAgent.Messages.GetContentPartById')
  async getContentPartById(
    conversationId: string,
    exchangeId: string,
    messageId: string,
    contentPartId: string
  ): Promise<ContentPartGetResponse> {
    const result = await this.get<ContentPart>(
      MESSAGE_ENDPOINTS.GET_CONTENT_PART(conversationId, exchangeId, messageId, contentPartId)
    );

    return new ContentPartGetResponse(result.data);
  }
}
