/**
 * ConversationService - Service for conversation management
 *
 * Provides conversation CRUD operations and access to related services:
 * - exchanges: Exchange operations (list, get, feedback)
 * - messages: Message operations (get message, get content part)
 * - attachments: Attachment operations (initialize, upload)
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { ValidationError } from '@/core/errors';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  Conversation,
  ConversationId,
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationGetResponse,
  ConversationServiceModel,
  CreateConversationInput,
  ConversationGetAllOptions,
  UpdateConversationInput
} from '@/models/conversational-agent';

// Utils
import { CONVERSATIONAL_PAGINATION, CONVERSATIONAL_TOKEN_PARAMS } from '@/utils/constants/common';
import { CONVERSATION_ENDPOINTS } from '@/utils/constants/endpoints';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';

// Local imports
import { AttachmentService } from './attachments';
import { ExchangeService } from './exchanges';
import { MessageService } from './messages';

/**
 * Service for managing conversations and related operations
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 *
 * // Create a new conversation
 * const newConversation = await conversationalAgentService.conversations.create({
 *   agentReleaseId: 123,
 *   folderId: 456
 * });
 *
 * // Get all conversations with pagination
 * const firstPageOfConversations = await conversationalAgentService.conversations.getAll({ pageSize: 10 });
 * if (firstPageOfConversations.hasNextPage) {
 *   const nextPageOfConversations = await conversationalAgentService.conversations.getAll({ cursor: firstPageOfConversations.nextCursor });
 * }
 *
 * // Get exchanges for a conversation
 * const conversationExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId);
 *
 * // Get a message
 * const messageDetails = await conversationalAgentService.conversations.messages.getById(
 *   conversationId, exchangeId, messageId
 * );
 *
 * // Upload an attachment
 * const uploadedAttachment = await conversationalAgentService.conversations.attachments.upload(conversationId, file);
 * ```
 */
export class ConversationService extends BaseService implements ConversationServiceModel {
  /** Exchange operations for conversations */
  public readonly exchanges: ExchangeService;

  /** Message operations for conversations */
  public readonly messages: MessageService;

  /** Attachment operations for conversations */
  public readonly attachments: AttachmentService;

  constructor(instance: IUiPathSDK) {
    super(instance);
    this.exchanges = new ExchangeService(instance);
    this.messages = new MessageService(instance);
    this.attachments = new AttachmentService(instance);
  }

  // ==================== Conversation CRUD Operations ====================

  /**
   * Creates a new conversation
   */
  async create(input: CreateConversationInput): Promise<ConversationCreateResponse>;
  /**
   * Creates a new conversation with agent release and folder IDs
   */
  async create(agentReleaseId: number, folderId: number): Promise<ConversationCreateResponse>;
  @track('Conversations.Create')
  async create(
    inputOrAgentReleaseId: CreateConversationInput | number,
    folderId?: number
  ): Promise<ConversationCreateResponse> {
    let body: CreateConversationInput;

    if (typeof inputOrAgentReleaseId === 'object') {
      body = inputOrAgentReleaseId;
    } else {
      if (folderId === undefined) {
        throw new ValidationError({ message: 'folderId is required when not using options object' });
      }
      body = { agentReleaseId: inputOrAgentReleaseId, folderId };
    }

    const response = await this.post<ConversationCreateResponse>(CONVERSATION_ENDPOINTS.CREATE, body);
    return response.data;
  }

  /**
   * Gets a conversation by ID
   */
  @track('Conversations.GetById')
  async getById(conversationId: ConversationId): Promise<ConversationGetResponse> {
    const response = await this.get<ConversationGetResponse>(CONVERSATION_ENDPOINTS.GET(conversationId));
    return response.data;
  }

  /**
   * Gets all conversations with optional filtering and pagination
   *
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   *
   * @param options - Query options including optional pagination parameters
   * @returns Promise resolving to conversations or paginated result
   *
   * @example
   * ```typescript
   * // Get all conversations (non-paginated)
   * const allConversations = await conversationalAgentService.conversations.getAll();
   *
   * // Get conversations with sorting
   * const sortedConversations = await conversationalAgentService.conversations.getAll({ sort: 'desc' });
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
  @track('Conversations.GetAll')
  async getAll<T extends ConversationGetAllOptions = ConversationGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<Conversation>
      : NonPaginatedResponse<Conversation>
  > {
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => CONVERSATION_ENDPOINTS.LIST,
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
   * Updates a conversation
   */
  @track('Conversations.Update')
  async update(
    conversationId: ConversationId,
    input: UpdateConversationInput
  ): Promise<ConversationGetResponse> {
    const response = await this.patch<ConversationGetResponse>(
      CONVERSATION_ENDPOINTS.UPDATE(conversationId),
      input
    );
    return response.data;
  }

  /**
   * Deletes a conversation
   */
  @track('Conversations.Remove')
  async remove(conversationId: ConversationId): Promise<ConversationDeleteResponse> {
    const response = await super.delete<ConversationDeleteResponse>(
      CONVERSATION_ENDPOINTS.DELETE(conversationId)
    );
    return response.data;
  }
}
