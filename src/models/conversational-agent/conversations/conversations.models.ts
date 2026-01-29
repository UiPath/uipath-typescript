/**
 * Conversation Service Model
 */

import type { ConversationId } from './common.types';
import type { ConversationGetResponse } from './core.types';
import type {
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationGetAllOptions,
  CreateConversationOptions,
  UpdateConversationOptions
} from './conversations.types';
import type { ExchangeServiceModel } from './exchanges.models';
import type { MessageServiceModel } from './messages.models';
import type { AttachmentServiceModel } from './attachments.models';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';

/**
 * Service for managing UiPath Conversations
 *
 * Conversations are the main interaction container for conversational agents.
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
   * @param options - Options for creating a conversation
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
   * @param options - Options for querying conversations including optional pagination parameters
   * @returns Promise resolving to either an array of conversations {@link NonPaginatedResponse}<{@link ConversationGetResponse}> or a {@link PaginatedResponse}<{@link ConversationGetResponse}> when pagination options are used
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
      ? PaginatedResponse<ConversationGetResponse>
      : NonPaginatedResponse<ConversationGetResponse>
  >;

  /**
   * Updates a conversation by ID
   *
   * @param id - The conversation ID to update
   * @param options - Fields to update
   * @returns Promise resolving to the updated conversation
   * {@link ConversationGetResponse}
   * @example
   * ```typescript
   * const updatedConversation = await conversationalAgentService.conversations.updateById(conversationId, {
   *   name: 'Updated Name'
   * });
   * ```
   */
  updateById(
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
