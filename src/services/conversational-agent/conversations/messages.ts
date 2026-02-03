/**
 * MessageService - Message operations for Conversations
 *
 * Messages are the individual turns within an exchange. Each exchange typically
 * contains a user message (the prompt) and an assistant message (the response).
 * Messages contain content parts which hold the actual text, attachments, or tool calls.
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ContentPart,
  ContentPartId,
  ContentPartGetResponse,
  ConversationId,
  ExchangeId,
  Message,
  MessageId,
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
 * const messagesService = new Messages(sdk);
 *
 * // Get a specific message
 * const messageDetails = await messagesService.getById(conversationId, exchangeId, messageId);
 *
 * // Access content via helpers
 * const messageText = messageDetails.getTextContent();
 * const messageToolCalls = messageDetails.getToolCalls();
 *
 * // Get external content part data
 * const contentPartDetails = await messagesService.getContentPartById(
 *   conversationId,
 *   exchangeId,
 *   messageId,
 *   contentPartId
 * );
 * ```
 */
export class MessageService extends BaseService implements MessageServiceModel {
  /**
   * Creates a new MessageService instance
   * @param instance - UiPath SDK instance
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
  }

  /**
   * Gets a message by ID
   *
   * Retrieves a specific message including all its content parts.
   * Returns a MessageGetResponse object that provides convenient methods
   * for accessing text content, tool calls, citations, and more.
   *
   * @param conversationId - The conversation containing the message
   * @param exchangeId - The exchange containing the message
   * @param messageId - The message ID to retrieve
   * @returns Promise resolving to the message with helper methods
   *
   * @example
   * ```typescript
   * const messageDetails = await messagesService.getById(conversationId, exchangeId, messageId);
   *
   * // Get all text content concatenated
   * const messageText = messageDetails.getTextContent();
   *
   * // Get tool calls from the message
   * const messageToolCalls = messageDetails.getToolCalls();
   *
   * // Get citations for verification
   * const messageCitations = messageDetails.getCitations();
   * ```
   */
  @track('ConversationalAgent.Messages.GetById')
  async getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId
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
   * @throws {NetworkError} 404 if the content part is inline (not external)
   *
   * @example
   * ```typescript
   * // Get an external content part (file/attachment)
   * const contentPartDetails = await messagesService.getContentPartById(
   *   conversationId,
   *   exchangeId,
   *   messageId,
   *   contentPartId
   * );
   *
   * // Check if it's external before fetching
   * if (contentPartDetails.isExternal()) {
   *   const contentData = contentPartDetails.getData();
   * }
   * ```
   */
  @track('ConversationalAgent.Messages.GetContentPartById')
  async getContentPartById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId,
    contentPartId: ContentPartId
  ): Promise<ContentPartGetResponse> {
    const result = await this.get<ContentPart>(
      MESSAGE_ENDPOINTS.GET_CONTENT_PART(conversationId, exchangeId, messageId, contentPartId)
    );

    return new ContentPartHelper(result.data);
  }
}
