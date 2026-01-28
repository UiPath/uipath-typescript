import type { Conversation } from './core.types';
import type {
  ConversationId,
  ExchangeId,
  MessageId,
  ContentPartId
} from './common.types';
import type {
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationGetResponse,
  ConversationGetAllOptions,
  CreateConversationInput,
  UpdateConversationInput
} from './conversations.types';
import type {
  ExchangeGetAllOptions,
  ExchangeGetByIdOptions,
  CreateFeedbackInput,
  FeedbackCreateResponse
} from './exchanges.types';
import type {
  AttachmentInitializeResponse,
  AttachmentUploadResponse
} from './attachments.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import type { ExchangeWithHelpers, MessageWithHelpers } from '@/services/conversational-agent/helpers';
import type { ContentPartHelper } from '@/services/conversational-agent/helpers/content-part-helper';

/**
 * Service for exchange operations within conversations
 *
 * Exchanges represent individual request-response pairs within a conversation.
 * Each exchange contains messages from the user and assistant.
 *
 * ### Usage
 *
 * ```typescript
 * const conversationExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId);
 * ```
 */
export interface ExchangeServiceModel {
  /**
   * Gets all exchanges for a conversation with optional filtering and pagination
   *
   * @param conversationId - The conversation ID to get exchanges for
   * @param options - Query options including optional pagination parameters
   * @returns Promise resolving to exchanges or paginated result
   * {@link ExchangeWithHelpers}
   * @example
   * ```typescript
   * // Get all exchanges (non-paginated)
   * const conversationExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId);
   *
   * // First page with pagination
   * const firstPageOfExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId, { pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPageOfExchanges.hasNextPage) {
   *   const nextPageOfExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId, {
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
      ? PaginatedResponse<ExchangeWithHelpers>
      : NonPaginatedResponse<ExchangeWithHelpers>
  >;

  /**
   * Gets an exchange by ID with its messages
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange ID to retrieve
   * @param options - Optional parameters for message sorting
   * @returns Promise resolving to the exchange with helper methods
   * {@link ExchangeWithHelpers}
   * @example
   * ```typescript
   * const exchangeDetails = await conversationalAgentService.conversations.exchanges.getById(
   *   conversationId,
   *   exchangeId
   * );
   *
   * // Access messages via helpers
   * const userPrompt = exchangeDetails.getUserMessage();
   * const assistantResponse = exchangeDetails.getAssistantMessage();
   * ```
   */
  getById(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    options?: ExchangeGetByIdOptions
  ): Promise<ExchangeWithHelpers>;

  /**
   * Creates feedback for an exchange
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange to provide feedback for
   * @param input - Feedback data including rating and optional comment
   * @returns Promise resolving to the feedback creation response
   * {@link FeedbackCreateResponse}
   * @example
   * ```typescript
   * await conversationalAgentService.conversations.exchanges.createFeedback(
   *   conversationId,
   *   exchangeId,
   *   { rating: 'positive', comment: 'Very helpful!' }
   * );
   * ```
   */
  createFeedback(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    input: CreateFeedbackInput
  ): Promise<FeedbackCreateResponse>;
}

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
   * {@link MessageWithHelpers}
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
  ): Promise<MessageWithHelpers>;

  /**
   * Gets a content part by ID
   *
   * @param conversationId - The conversation containing the content
   * @param exchangeId - The exchange containing the content
   * @param messageId - The message containing the content part
   * @param contentPartId - The content part ID to retrieve
   * @returns Promise resolving to a ContentPartHelper
   * {@link ContentPartHelper}
   * @example
   * ```typescript
   * const contentPartDetails = await conversationalAgentService.conversations.messages.getContentPart(
   *   conversationId,
   *   exchangeId,
   *   messageId,
   *   contentPartId
   * );
   * ```
   */
  getContentPart(
    conversationId: ConversationId,
    exchangeId: ExchangeId,
    messageId: MessageId,
    contentPartId: ContentPartId
  ): Promise<ContentPartHelper>;
}

/**
 * Service for attachment operations within conversations
 *
 * Attachments allow files to be uploaded and referenced in conversation messages.
 *
 * ### Usage
 *
 * ```typescript
 * const uploadedAttachment = await conversationalAgentService.conversations.attachments.upload(conversationId, file);
 * ```
 */
export interface AttachmentServiceModel {
  /**
   * Initialize a file attachment for the conversation
   *
   * @param conversationId - The conversation to attach the file to
   * @param fileName - The name of the file to initialize
   * @returns Promise resolving to attachment details with upload access
   * {@link AttachmentInitializeResponse}
   * @example
   * ```typescript
   * const attachmentInitResult = await conversationalAgentService.conversations.attachments.initialize(
   *   conversationId,
   *   'document.pdf'
   * );
   *
   * // Handle upload manually using attachmentInitResult.fileUploadAccess
   * const { url, verb, headers } = attachmentInitResult.fileUploadAccess;
   * ```
   */
  initialize(conversationId: ConversationId, fileName: string): Promise<AttachmentInitializeResponse>;

  /**
   * Creates an attachment by uploading a file to a conversation
   *
   * @param conversationId - The conversation to attach the file to
   * @param file - The file to upload
   * @returns Promise resolving to attachment metadata with URI
   * {@link AttachmentUploadResponse}
   * @example
   * ```typescript
   * const uploadedAttachment = await conversationalAgentService.conversations.attachments.upload(
   *   conversationId,
   *   file
   * );
   * console.log(`Uploaded: ${uploadedAttachment.uri}`);
   * ```
   */
  upload(conversationId: ConversationId, file: File): Promise<AttachmentUploadResponse>;
}

/**
 * Service for managing UiPath Conversations
 *
 * Conversations are the main interaction container for conversational agents.
 * Each conversation can have multiple exchanges (request-response pairs).
 * [UiPath Conversational Agents Guide](https://docs.uipath.com/automation-cloud/docs/conversational-agents)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 * const newConversation = await conversationalAgentService.conversations.create({
 *   agentReleaseId: 123,
 *   folderId: 456
 * });
 * ```
 */
export interface ConversationServiceModel {
  /** Exchange operations for conversations */
  readonly exchanges: ExchangeServiceModel;

  /** Message operations for conversations */
  readonly messages: MessageServiceModel;

  /** Attachment operations for conversations */
  readonly attachments: AttachmentServiceModel;

  /**
   * Creates a new conversation
   *
   * @param input - Conversation creation options
   * @returns Promise resolving to the created conversation
   * {@link ConversationCreateResponse}
   * @example
   * ```typescript
   * const newConversation = await conversationalAgentService.conversations.create({
   *   agentReleaseId: 123,
   *   folderId: 456
   * });
   * ```
   */
  create(input: CreateConversationInput): Promise<ConversationCreateResponse>;

  /**
   * Gets a conversation by ID
   *
   * @param id - The conversation ID to retrieve
   * @returns Promise resolving to the conversation details
   * {@link ConversationGetResponse}
   * @example
   * ```typescript
   * const conversationDetails = await conversationalAgentService.conversations.getById(conversationId);
   * ```
   */
  getById(id: ConversationId): Promise<ConversationGetResponse>;

  /**
   * Gets all conversations with optional filtering and pagination
   *
   * @param options - Query options including optional pagination parameters
   * @returns Promise resolving to conversations or paginated result
   * {@link Conversation}
   * @example
   * ```typescript
   * // Get all conversations (non-paginated)
   * const allConversations = await conversationalAgentService.conversations.getAll();
   *
   * // First page with pagination
   * const firstPageOfConversations = await conversationalAgentService.conversations.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPageOfConversations.hasNextPage) {
   *   const nextPageOfConversations = await conversationalAgentService.conversations.getAll({ cursor: firstPageOfConversations.nextCursor });
   * }
   * ```
   */
  getAll<T extends ConversationGetAllOptions = ConversationGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<Conversation>
      : NonPaginatedResponse<Conversation>
  >;

  /**
   * Updates a conversation
   *
   * @param id - The conversation ID to update
   * @param input - Fields to update
   * @returns Promise resolving to the updated conversation
   * {@link ConversationGetResponse}
   * @example
   * ```typescript
   * const updatedConversation = await conversationalAgentService.conversations.update(conversationId, {
   *   name: 'Updated Name'
   * });
   * ```
   */
  update(
    id: ConversationId,
    input: UpdateConversationInput
  ): Promise<ConversationGetResponse>;

  /**
   * Deletes a conversation
   *
   * @param id - The conversation ID to delete
   * @returns Promise resolving to the deletion response
   * {@link ConversationDeleteResponse}
   * @example
   * ```typescript
   * await conversationalAgentService.conversations.deleteById(conversationId);
   * ```
   */
  deleteById(id: ConversationId): Promise<ConversationDeleteResponse>;
}
