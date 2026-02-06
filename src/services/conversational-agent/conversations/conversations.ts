/**
 * ConversationService - Service for conversation management
 *
 * Provides conversation CRUD operations and real-time WebSocket functionality.
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationId,
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationGetResponse,
  ConversationServiceModel,
  ConversationSessionProvider,
  CreateConversationOptions,
  ConversationGetAllOptions,
  UpdateConversationOptions,
  RawConversationGetResponse,
  ConversationalAgentOptions
} from '@/models/conversational-agent';
import { ConversationMap, createConversationWithMethods } from '@/models/conversational-agent';

// Utils
import { CONVERSATIONAL_PAGINATION, CONVERSATIONAL_TOKEN_PARAMS } from '@/utils/constants/common';
import { CONVERSATION_ENDPOINTS } from '@/utils/constants/endpoints';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';
import { transformData, transformRequest } from '@/utils/transform';

// Local imports
import {
  ConversationEventHelperManagerImpl,
  type ConversationEventHelperManager,
  type SessionEventHelper,
  type SessionStartEventOptions
} from '../helpers';
import { SessionManager } from '../session';

/**
 * Service for managing conversations with HTTP CRUD and real-time WebSocket support
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Conversations } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const conversations = new Conversations(sdk);
 *
 * // Create a new conversation
 * const conversation = await conversations.create({
 *   agentId: 123,
 *   folderId: 456
 * });
 *
 * // Start a real-time chat session
 * const session = conversations.startSession({ conversationId: conversation.id });
 * session.onExchangeStart((exchange) => {
 *   exchange.onMessageStart((message) => {
 *     // Use helper methods to filter message types
 *     if (message.isAssistant) {
 *       message.onContentPartStart((part) => {
 *         // Use helper methods to check content type
 *         if (part.isText) {
 *           part.onChunk((chunk) => console.log(chunk.data));
 *         }
 *       });
 *     }
 *   });
 * });
 *
 * // Send a message
 * session.sendPrompt({ text: 'Hello!' });
 *
 * // Get all conversations with pagination
 * const firstPage = await conversations.getAll({ pageSize: 10 });
 * if (firstPage.hasNextPage) {
 *   const nextPage = await conversations.getAll({ cursor: firstPage.nextCursor });
 * }
 *
 * // Disconnect when done
 * conversations.disconnect();
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
  constructor(instance: IUiPathSDK, options?: ConversationalAgentOptions) {
    super(instance);
    this._sessionManager = new SessionManager(instance, options);
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
   * console.log(conversation.label, conversation.createdAt);
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
   * const sortedConversations = await conversationsService.getAll({ sort: 'desc' });
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
   * Creates a WebSocket session and returns a SessionEventHelper for sending
   * and receiving messages in real-time.
   *
   * @param options - Session start options including conversationId
   * @returns SessionEventHelper for managing the session
   *
   * @example
   * ```typescript
   * const session = conversations.startSession({ conversationId: conversation.id });
   *
   * // Listen for responses using helper methods
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     // Use message.isAssistant to filter AI responses
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         // Use part.isText to handle text content
   *         if (part.isText) {
   *           part.onChunk((chunk) => console.log(chunk.data));
   *         }
   *       });
   *     }
   *   });
   * });
   *
   * // Send a message
   * session.sendPrompt({ text: 'Hello!' });
   *
   * // End the session when done
   * session.sendSessionEnd();
   * ```
   */
  startSession(args: SessionStartEventOptions): SessionEventHelper {
    return this._getEvents().startSession(args);
  }

  /**
   * Registers a handler for session start events
   *
   * @param handler - Callback function to handle session start
   * @returns Cleanup function to remove handler
   */
  onSessionStart(...args: Parameters<ConversationEventHelperManager['onSessionStart']>) {
    return this._getEvents().onSessionStart(...args);
  }

  /**
   * Retrieves an active session by conversation ID
   *
   * @param conversationId - The conversation ID to get the session for
   * @returns The session helper if active, undefined otherwise
   */
  getSession(conversationId: ConversationId) {
    return this._getEvents().getSession(conversationId);
  }

  /**
   * Iterator over all active sessions
   */
  get sessions() {
    return this._getEvents().sessions;
  }

  // ==================== Connection Management ====================

  /**
   * Disconnects from WebSocket and releases all session resources
   *
   * Immediately closes the WebSocket connection and clears all per-conversation
   * socket tracking. Any active sessions will receive a disconnection error.
   *
   * Note: Sessions are automatically cleaned up when they end. Use this only
   * when you need to force a full disconnection (e.g., on app shutdown or logout).
   */
  disconnectAll(): void {
    this._sessionManager.disconnect();
  }

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
