/**
 * ConversationService - Service for conversation management
 *
 * Provides conversation CRUD operations and real-time WebSocket functionality.
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import { NetworkError } from '@/core/errors';
import { track } from '@/core/telemetry';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentOptions,
  ConversationAttachmentCreateResponse,
  ConversationAttachmentUploadResponse,
  ConversationCreateResponse,
  ConversationUpdateResponse,
  ConversationDeleteResponse,
  ConversationGetResponse,
  ConversationServiceModel,
  ConversationSessionOptions,
  ConversationSessionMethods,
  ConversationCreateOptions,
  ConversationGetAllOptions,
  ConversationUpdateOptions,
  RawConversationGetResponse,
  SessionStream
} from '@/models/conversational-agent';
import { ConversationGetAllFilterMap, ConversationMap, createConversationWithMethods } from '@/models/conversational-agent';

// Utils
import { CONVERSATIONAL_PAGINATION, CONVERSATIONAL_TOKEN_PARAMS } from '@/utils/constants/common';
import { CONVERSATION_ENDPOINTS, ATTACHMENT_ENDPOINTS } from '@/utils/constants/endpoints';
import { PaginatedResponse } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';
import { transformData, transformRequest, arrayDictionaryToRecord } from '@/utils/transform';

// Local imports
import {
  ConversationEventHelperManagerImpl,
  type ConversationEventHelperManager
} from '../helpers';
import { buildConversationalAgentHeaders } from '../helpers/header';
import { ExchangeService } from './exchanges';
import { SessionManager } from './session';

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
 * const conversation = await conversationalAgent.conversations.create(agentId, folderId);
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
 *         if (part.isMarkdown) {
 *           part.onChunk((chunk) => console.log(chunk.data));
 *         }
 *       });
 *     }
 *   });
 * });
 *
 * // Send a message
 * const exchange = session.startExchange();
 * await exchange.sendMessageWithContentPart({ data: 'Hello!' });
 * ```
 */
export class ConversationService extends BaseService implements ConversationServiceModel, ConversationSessionMethods {
  /** Session manager for WebSocket lifecycle */
  private _sessionManager: SessionManager;

  /** Exchange service for scoped exchange methods on conversation objects */
  private _exchangeService: ExchangeService;

  /** Event helper for conversation events */
  private _eventHelper: ConversationEventHelperManagerImpl | null = null;

  /**
   * Creates an instance of the Conversations service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration (e.g. externalUserId for external app auth)
   */
  constructor(instance: IUiPath, options?: ConversationalAgentOptions) {
    super(instance, buildConversationalAgentHeaders(options));

    this._sessionManager = new SessionManager(instance, options);
    this._exchangeService = new ExchangeService(instance, options);
  }

  // ==================== Conversation CRUD Operations ====================

  @track('ConversationalAgent.Conversations.Create')
  async create(agentId: number, folderId: number, options?: ConversationCreateOptions): Promise<ConversationCreateResponse> {
    // Transform SDK field names to API field names (e.g., agentId → agentReleaseId)
    const apiPayload = transformRequest({ agentId, folderId, ...options }, ConversationMap);

    const response = await this.post<RawConversationGetResponse>(CONVERSATION_ENDPOINTS.CREATE, apiPayload);
    const transformedData = transformData(response.data, ConversationMap) as RawConversationGetResponse;
    return createConversationWithMethods(transformedData, this, this, this._exchangeService);
  }

  @track('ConversationalAgent.Conversations.GetById')
  async getById(id: string): Promise<ConversationGetResponse> {
    const response = await this.get<RawConversationGetResponse>(CONVERSATION_ENDPOINTS.GET(id));
    const transformedData = transformData(response.data, ConversationMap) as RawConversationGetResponse;
    return createConversationWithMethods(transformedData, this, this, this._exchangeService);
  }

  @track('ConversationalAgent.Conversations.GetAll')
  async getAll(options?: ConversationGetAllOptions): Promise<PaginatedResponse<ConversationGetResponse>> {
    const transformFn = (conversation: RawConversationGetResponse) => {
      const transformedData = transformData(conversation, ConversationMap) as RawConversationGetResponse;
      return createConversationWithMethods(transformedData, this, this, this._exchangeService);
    };

    const { pageSize, cursor, jumpToPage, ...filterOptions } = options ?? {};
    // Translate SDK filter names (agentKey/agentId/label) to backend names before forwarding
    const additionalParams = transformRequest(filterOptions, ConversationGetAllFilterMap);
    const paginationParams = cursor ? { cursor, pageSize } : jumpToPage ? { jumpToPage, pageSize } : { pageSize };

    return PaginationHelpers.getAllPaginated<RawConversationGetResponse, ConversationGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => CONVERSATION_ENDPOINTS.LIST,
      paginationParams,
      additionalParams,
      transformFn,
      options: {
        paginationType: PaginationType.TOKEN,
        itemsField: CONVERSATIONAL_PAGINATION.ITEMS_FIELD,
        continuationTokenField: CONVERSATIONAL_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: CONVERSATIONAL_TOKEN_PARAMS.PAGE_SIZE_PARAM,
          tokenParam: CONVERSATIONAL_TOKEN_PARAMS.TOKEN_PARAM
        }
      }
    });
  }

  @track('ConversationalAgent.Conversations.UpdateById')
  async updateById(
    id: string,
    options: ConversationUpdateOptions
  ): Promise<ConversationUpdateResponse> {
    const response = await this.patch<RawConversationGetResponse>(
      CONVERSATION_ENDPOINTS.UPDATE(id),
      options
    );
    const transformedData = transformData(response.data, ConversationMap) as RawConversationGetResponse;
    return createConversationWithMethods(transformedData, this, this, this._exchangeService);
  }

  @track('ConversationalAgent.Conversations.DeleteById')
  async deleteById(id: string): Promise<ConversationDeleteResponse> {
    const response = await this.delete<RawConversationGetResponse>(
      CONVERSATION_ENDPOINTS.DELETE(id)
    );
    return transformData(response.data, ConversationMap) as ConversationDeleteResponse;
  }

  // ==================== Attachments ====================

  @track('ConversationalAgent.Conversations.UploadAttachment')
  async uploadAttachment(
    id: string,
    file: File
  ): Promise<ConversationAttachmentUploadResponse> {
    // Step 1: Create attachment entry and get upload URL
    const { fileUploadAccess, uri, name } = await this.getAttachmentUploadUri(id, file.name);

    // Step 2: Upload file to blob storage
    const uploadHeaders: Record<string, string> = {
      'Content-Type': file.type,
      'x-ms-blob-type': 'BlockBlob',
      ...arrayDictionaryToRecord(fileUploadAccess.headers)
    };

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

  @track('ConversationalAgent.Conversations.CreateAttachment')
  public async getAttachmentUploadUri(
    conversationId: string,
    fileName: string
  ): Promise<ConversationAttachmentCreateResponse> {
    const response = await this.post<ConversationAttachmentCreateResponse>(
      ATTACHMENT_ENDPOINTS.CREATE(conversationId),
      { name: fileName }
    );
    return response.data;
  }

  // ==================== Real-time Event Handling ====================

  startSession(conversationId: string, options?: ConversationSessionOptions): SessionStream {
    if (options?.logLevel) {
      this._sessionManager.setLogLevel(options.logLevel);
    }
    const { logLevel: _, ...sessionOptions } = options || {};
    return this._getEvents().startSession({ conversationId, ...sessionOptions });
  }

  getSession(conversationId: string): SessionStream | undefined {
    return this._getEvents().getSession(conversationId);
  }

  endSession(conversationId: string): void {
    const session = this._getEvents().getSession(conversationId);
    if (session) {
      session.sendSessionEnd();
    }
  }

  /**
   * Iterator over all active sessions
   */
  get sessions(): Iterable<SessionStream> {
    return this._getEvents().sessions;
  }

  /**
   * @internal
   */
  get events(): ConversationEventHelperManager {
    return this._getEvents();
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

  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this._sessionManager.onConnectionStatusChanged(handler);
  }

  @track('ConversationalAgent.Conversations.Disconnect')
  disconnect(): void {
    this._sessionManager.disconnect();
  }

  // ==================== Private Methods ====================

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

}
