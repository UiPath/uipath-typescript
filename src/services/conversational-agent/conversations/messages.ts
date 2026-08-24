/**
 * MessageService - Message operations for Conversations
 *
 * Messages are the individual turns within an exchange. Each exchange typically
 * contains a user message (the prompt) and an assistant message (the response).
 * Messages contain content parts which hold the actual text, attachments, or tool calls.
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentOptions,
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
import { buildConversationalAgentHeaders } from '@/services/conversational-agent/helpers/header';

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
   * Creates an instance of the MessageService.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration (e.g. externalUserId for external app auth)
   */
  constructor(instance: IUiPath, options?: ConversationalAgentOptions) {
    super(instance, buildConversationalAgentHeaders(options));
  }

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

    return new ContentPartHelper(result.data);
  }
}
