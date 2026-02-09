/**
 * ConversationService - Service for conversation management
 *
 * Provides conversation CRUD operations and real-time WebSocket functionality.
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { NetworkError } from '@/core/errors';
import { track } from '@/core/telemetry';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationId,
  AttachmentCreateResponse,
  AttachmentUploadResponse,
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationGetResponse,
  ConversationServiceModel,
  ConversationSessionProvider,
  CreateConversationOptions,
  ConversationGetAllOptions,
  UpdateConversationOptions,
  RawConversationGetResponse,
  SessionStream
} from '@/models/conversational-agent';
import { ConversationMap, createConversationWithMethods } from '@/models/conversational-agent';

// Utils
import { CONVERSATIONAL_PAGINATION, CONVERSATIONAL_TOKEN_PARAMS } from '@/utils/constants/common';
import { CONVERSATION_ENDPOINTS, ATTACHMENT_ENDPOINTS } from '@/utils/constants/endpoints';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';
import { transformData, transformRequest } from '@/utils/transform';

// Local imports
import {
  ConversationEventHelperManagerImpl,
  type ConversationEventHelperManager,
  type SessionStartEventOptions
} from '../helpers';
import { SessionManager } from '../session';

/**
 * Service for creating and managing conversations with UiPath Conversational Agents
 *
 * @example
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgent = new ConversationalAgent(sdk);
 *
 * // Access conversations through the main service
 * const conversation = await conversationalAgent.conversations.create({
 *   agentId,
 *   folderId
 * });
 *
 * // Or through agent objects (agentId/folderId auto-filled)
 * const agents = await conversationalAgent.getAll();
 * const agentConversation = await agents[0].conversations.create({ label: 'My Chat' });
 *
 * // Start a real-time chat session
 * const session = conversation.startSession();
 * session.onExchangeStart((exchange) => {
 *   exchange.onMessageStart((message) => {
 *     if (message.isAssistant) {
 *       message.onContentPartStart((part) => {
 *         if (part.isText) {
 *           part.onChunk((chunk) => console.log(chunk.data));
 *         }
 *       });
 *     }
 *   });
 * });
 *
 * // Send a message
 * const exchange = session.startExchange();
 * exchange.sendMessageWithContentPart({ data: 'Hello!' });
 * ```
 */
export class ConversationService extends BaseService implements ConversationServiceModel, ConversationSessionProvider {
  /** Session manager for WebSocket lifecycle */
  private _sessionManager: SessionManager;

  /** Event helper for conversation events */
  private _eventHelper: ConversationEventHelperManagerImpl | null = null;

  /**
   * Creates an instance of the Conversations service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration for WebSocket behavior
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
    this._sessionManager = new SessionManager(instance);
  }

  // ==================== Conversation CRUD Operations ====================

  /**
   * Creates a new conversation
   *
   * @param options - Options for creating a conversation
   * @returns Promise resolving to the created conversation
   */
  @track('ConversationalAgent.Conversations.Create')
  async create(options: CreateConversationOptions): Promise<ConversationCreateResponse> {
    // Transform SDK field names to API field names (e.g., agentId → agentReleaseId)
    const apiPayload = transformRequest(options, ConversationMap);

    const response = await this.post<RawConversationGetResponse>(CONVERSATION_ENDPOINTS.CREATE, apiPayload);
    const transformedData = transformData(response.data, ConversationMap) as RawConversationGetResponse;
    return createConversationWithMethods(transformedData, this, this);
  }

  /**
   * Gets a conversation by ID
   *
   * @param id - The conversation ID to retrieve
   * @returns Promise resolving to the conversation details
   *
   * @example
   * ```typescript
   * const conversation = await conversationsService.getById(conversationId);
   * console.log(conversation.label, conversation.createdTime);
   * ```
   */
  @track('ConversationalAgent.Conversations.GetById')
  async getById(id: ConversationId): Promise<ConversationGetResponse> {
    const response = await this.get<RawConversationGetResponse>(CONVERSATION_ENDPOINTS.GET(id));
    const transformedData = transformData(response.data, ConversationMap) as RawConversationGetResponse;
    return createConversationWithMethods(transformedData, this, this);
  }

  /**
   * Gets all conversations with optional filtering and pagination
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param options - Options for querying conversations including optional pagination parameters
   * @returns Promise resolving to either an array of conversations {@link NonPaginatedResponse}<{@link ConversationGetResponse}> or a {@link PaginatedResponse}<{@link ConversationGetResponse}> when pagination options are used
   *
   * @example
   * ```typescript
   * // Get all conversations (non-paginated)
   * const allConversations = await conversationsService.getAll();
   *
   * // Get conversations with sorting
   * const sortedConversations = await conversationsService.getAll({ sort: SortOrder.Descending });
   *
   * // First page with pagination
   * const firstPageOfConversations = await conversationsService.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPageOfConversations.hasNextPage) {
   *   const nextPageOfConversations = await conversationsService.getAll({
   *     cursor: firstPageOfConversations.nextCursor
   *   });
   * }
   * ```
   */
  @track('ConversationalAgent.Conversations.GetAll')
  async getAll<T extends ConversationGetAllOptions = ConversationGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ConversationGetResponse>
      : NonPaginatedResponse<ConversationGetResponse>
  > {
    // Transform function to convert API timestamps to SDK naming convention and add methods
    const transformFn = (conversation: RawConversationGetResponse) => {
      const transformedData = transformData(conversation, ConversationMap) as RawConversationGetResponse;
      return createConversationWithMethods(transformedData, this, this);
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => CONVERSATION_ENDPOINTS.LIST,
      transformFn,
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: CONVERSATIONAL_PAGINATION.ITEMS_FIELD,
        continuationTokenField: CONVERSATIONAL_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: CONVERSATIONAL_TOKEN_PARAMS.PAGE_SIZE_PARAM,
          tokenParam: CONVERSATIONAL_TOKEN_PARAMS.TOKEN_PARAM
        }
      },
      excludeFromPrefix: Object.keys(options || {}) // Conversational params are not OData
    }, options) as any;
  }

  /**
   * Updates a conversation by ID
   *
   * @param id - The conversation ID to update
   * @param options - Update fields (label)
   * @returns Promise resolving to the updated conversation
   *
   * @example
   * ```typescript
   * const updatedConversation = await conversationsService.updateById(conversationId, {
   *   label: 'New conversation title'
   * });
   * ```
   */
  @track('ConversationalAgent.Conversations.UpdateById')
  async updateById(
    id: ConversationId,
    options: UpdateConversationOptions
  ): Promise<ConversationGetResponse> {
    const response = await this.patch<RawConversationGetResponse>(
      CONVERSATION_ENDPOINTS.UPDATE(id),
      options
    );
    const transformedData = transformData(response.data, ConversationMap) as RawConversationGetResponse;
    return createConversationWithMethods(transformedData, this, this);
  }

  /**
   * Deletes a conversation by ID
   *
   * @param id - The conversation ID to delete
   * @returns Promise resolving to the delete response
   *
   * @example
   * ```typescript
   * await conversationsService.deleteById(conversationId);
   * ```
   */
  @track('ConversationalAgent.Conversations.DeleteById')
  async deleteById(id: ConversationId): Promise<ConversationDeleteResponse> {
    const response = await this.delete<ConversationDeleteResponse>(
      CONVERSATION_ENDPOINTS.DELETE(id)
    );
    return response.data;
  }

  // ==================== Attachments ====================

  /**
   * Creates an attachment entry for a conversation
   *
   * Creates the attachment entry and returns upload access details.
   * The client must handle the file upload using the returned fileUploadAccess.
   * For most cases, use `uploadAttachment()` instead which handles both steps.
   *
   * @param conversationId - The conversation to attach the file to
   * @param fileName - The name of the file
   * @returns Promise resolving to the attachment creation response
   *
   * @example
   * ```typescript
   * const attachmentEntry = await conversationalAgent.conversations.createAttachment(
   *   conversationId, 'document.pdf'
   * );
   * const { url, verb, headers } = attachmentEntry.fileUploadAccess;
   * ```
   */
  @track('ConversationalAgent.Conversations.CreateAttachment')
  async createAttachment(
    conversationId: ConversationId,
    fileName: string
  ): Promise<AttachmentCreateResponse> {
    const response = await this.post<AttachmentCreateResponse>(
      ATTACHMENT_ENDPOINTS.CREATE(conversationId),
      { name: fileName }
    );
    return response.data;
  }

  /**
   * Uploads a file attachment to a conversation
   *
   * Convenience method that creates the attachment entry and uploads
   * the file content in one step.
   *
   * @param conversationId - The conversation to attach the file to
   * @param file - The file to upload
   * @returns Promise resolving to the attachment metadata with URI
   *
   * @example
   * ```typescript
   * const attachment = await conversationalAgent.conversations.uploadAttachment(
   *   conversationId, file
   * );
   * console.log(`Uploaded: ${attachment.uri}`);
   * ```
   */
  @track('ConversationalAgent.Conversations.UploadAttachment')
  async uploadAttachment(
    conversationId: ConversationId,
    file: File
  ): Promise<AttachmentUploadResponse> {
    // Step 1: Create attachment entry and get upload URL
    const { fileUploadAccess, uri, name } = await this.createAttachment(conversationId, file.name);

    // Step 2: Upload file to blob storage
    const uploadHeaders: Record<string, string> = {
      'Content-Type': file.type
    };

    // Add custom headers from API response
    fileUploadAccess.headers.keys.forEach((key, index) => {
      uploadHeaders[key] = fileUploadAccess.headers.values[index];
    });

    // Add auth header if required by the storage endpoint
    if (fileUploadAccess.requiresAuth) {
      const token = await this.getValidAuthToken();
      uploadHeaders['Authorization'] = `Bearer ${token}`;
    }

    const uploadResponse = await fetch(fileUploadAccess.url, {
      method: fileUploadAccess.verb,
      body: file,
      headers: uploadHeaders
    });

    if (!uploadResponse.ok) {
      throw new NetworkError({
        message: `Failed to upload to file storage: ${uploadResponse.status} ${uploadResponse.statusText}`,
        statusCode: uploadResponse.status
      });
    }

    return {
      uri,
      name,
      mimeType: file.type
    };
  }

  // ==================== Real-time Event Handling ====================

  /**
   * Gets or creates the event helper manager (lazy initialization)
   * @internal
   */
  private _getEvents(): ConversationEventHelperManager {
    if (this._eventHelper === null) {
      this._eventHelper = new ConversationEventHelperManagerImpl({
        emit: (event) => {
          this._sessionManager.emitEvent(event);
        }
      });

      // Connect event dispatcher to session manager
      this._sessionManager.setEventDispatcher(this._eventHelper);
    }
    return this._eventHelper;
  }

  /**
   * Starts a real-time chat session for a conversation
   *
   * @param options - Session start options including conversationId
   * @returns {@link SessionStream} for managing the session
   *
   * @example
   * ```typescript
   * const session = conversations.startSession({ conversationId: conversation.id });
   *
   * // Listen for responses
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         if (part.isText) {
   *           part.onChunk((chunk) => console.log(chunk.data));
   *         }
   *       });
   *     }
   *   });
   * });
   *
   * // Send a message
   * const exchange = session.startExchange();
   * exchange.sendMessageWithContentPart({ data: 'Hello!' });
   *
   * // End the session when done
   * session.sendSessionEnd();
   * ```
   */
  startSession(args: SessionStartEventOptions): SessionStream {
    return this._getEvents().startSession(args);
  }

  /**
   * Retrieves an active session by conversation ID
   *
   * @param conversationId - The conversation ID to get the session for
   * @returns The {@link SessionStream} if active, undefined otherwise
   */
  getSession(conversationId: ConversationId) {
    return this._getEvents().getSession(conversationId);
  }

  /**
   * Ends an active session for a conversation
   *
   * Sends a session end event and releases the socket for the conversation.
   * If no active session exists for the given conversation, this is a no-op.
   *
   * @param conversationId - The conversation ID to end the session for
   *
   * @example
   * ```typescript
   * // End session for a specific conversation
   * conversations.endSession(conversationId);
   * ```
   */
  endSession(conversationId: ConversationId): void {
    const session = this._getEvents().getSession(conversationId);
    if (session) {
      session.sendSessionEnd();
    }
  }

  /**
   * Iterator over all active sessions
   */
  get sessions() {
    return this._getEvents().sessions;
  }

  // ==================== Connection Management ====================

  /**
   * Current connection status
   */
  get connectionStatus(): ConnectionStatus {
    return this._sessionManager.connectionStatus;
  }

  /**
   * Whether WebSocket is connected
   */
  get isConnected(): boolean {
    return this._sessionManager.isConnected;
  }

  /**
   * Current connection error, if any
   */
  get connectionError(): Error | null {
    return this._sessionManager.connectionError;
  }

  /**
   * Registers a handler for connection status changes
   *
   * @param handler - Callback function to handle status changes
   * @returns Cleanup function to remove handler
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this._sessionManager.onConnectionStatusChanged(handler);
  }
}
