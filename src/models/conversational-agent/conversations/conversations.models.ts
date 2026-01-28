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
  CreateConversationOptions,
  UpdateConversationOptions
} from './conversations.types';
import type {
  ExchangeGetAllOptions,
  ExchangeGetByIdOptions,
  CreateFeedbackOptions,
  FeedbackCreateResponse,
  ExchangeGetResponse,
  MessageGetResponse,
  ContentPartGetResponse
} from './exchanges.types';
import type {
  AttachmentCreateResponse,
  AttachmentUploadResponse
} from './attachments.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';

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
   * {@link ExchangeGetResponse}
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
      ? PaginatedResponse<ExchangeGetResponse>
      : NonPaginatedResponse<ExchangeGetResponse>
  >;

  /**
   * Gets an exchange by ID with its messages
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange ID to retrieve
   * @param options - Optional parameters for message sorting
   * @returns Promise resolving to the exchange with helper methods
   * {@link ExchangeGetResponse}
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
  ): Promise<ExchangeGetResponse>;

  /**
   * Creates feedback for an exchange
   *
   * @param conversationId - The conversation containing the exchange
   * @param exchangeId - The exchange to provide feedback for
   * @param options - Feedback data including rating and optional comment
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
    options: CreateFeedbackOptions
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
   * Creates an attachment entry for a conversation
   *
   * Creates the attachment entry and returns upload access details.
   * The client must handle the file upload using the returned fileUploadAccess.
   * For most cases, use `upload()` instead which handles both steps.
   *
   * @param conversationId - The conversation to attach the file to
   * @param fileName - The name of the file
   * @returns Promise resolving to attachment details with upload access
   * {@link AttachmentCreateResponse}
   * @example
   * ```typescript
   * const attachmentEntry = await conversationalAgentService.conversations.attachments.create(
   *   conversationId,
   *   'document.pdf'
   * );
   *
   * // Handle upload manually using attachmentEntry.fileUploadAccess
   * const { url, verb, headers } = attachmentEntry.fileUploadAccess;
   * ```
   */
  create(conversationId: ConversationId, fileName: string): Promise<AttachmentCreateResponse>;

  /**
   * Uploads a file attachment to a conversation
   *
   * Convenience method that creates the attachment entry and uploads
   * the file content in one step.
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
   * @param options - Conversation creation options
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
  create(options: CreateConversationOptions): Promise<ConversationCreateResponse>;

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
   * @param options - Fields to update
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
    options: UpdateConversationOptions
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
