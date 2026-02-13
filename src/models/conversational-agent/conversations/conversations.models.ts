/**
 * Conversation Service Model
 *
 * This interface defines the HTTP CRUD operations for conversations
 * and real-time WebSocket session management.
 */

import type { RawConversationGetResponse } from './types/core.types';
import type {
  ConversationCreateResponse,
  ConversationUpdateResponse,
  ConversationDeleteResponse,
  ConversationGetAllOptions,
  ConversationSessionOptions,
  ConversationCreateOptions,
  ConversationUpdateOptions,
  ConversationAttachmentUploadResponse
} from './conversations.types';
import type { ExchangeServiceModel, ConversationExchangeServiceModel } from './exchanges.models';
import type { ExchangeGetByIdOptions, CreateFeedbackOptions } from './exchanges.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import type { ConnectionStatus, ConnectionStatusChangedHandler } from '@/core/websocket';
import type { SessionStream } from './events/session.types';

/**
 * Provider interface for session operations.
 * This allows the conversation object to access session methods without
 * depending on the full ConversationService implementation.
 */
export interface ConversationSessionProvider {
  /**
   * Starts a real-time chat session for a conversation
   */
  startSession(conversationId: string, options?: ConversationSessionOptions): SessionStream;

  /**
   * Gets an active session for a conversation
   */
  getSession(conversationId: string): SessionStream | undefined;

  /**
   * Ends an active session for a conversation
   */
  endSession(conversationId: string): void;
}

/**
 * Service for creating and managing conversations with UiPath Conversational Agents
 *
 * A conversation represents a chat thread between a user and an AI agent, storing
 * metadata such as id, label, timestamps, agentId, and folderId. To retrieve the
 * conversation history, use the {@link ExchangeServiceModel | Exchanges} service.
 * For real-time chat, see {@link SessionStream | Session}.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
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
 * ```
 */
export interface ConversationServiceModel {
  /**
   * Creates a new conversation
   *
   * The returned conversation has bound methods for lifecycle management:
   * `update()`, `delete()`, and `startSession()`.
   *
   * @param agentId - The agent ID to create the conversation for
   * @param folderId - The folder ID containing the agent
   * @param options - Optional settings for the conversation
   * @returns Promise resolving to {@link ConversationCreateResponse} with bound methods
   *
   * @example
   * ```typescript
   * const conversation = await conversationalAgent.conversations.create(
   *   agentId,
   *   folderId,
   *   { label: 'Customer Support Session' }
   * );
   *
   * // Update the conversation
   * await conversation.update({ label: 'Renamed Chat' });
   *
   * // Start a real-time session
   * const session = conversation.startSession();
   *
   * // Delete the conversation
   * await conversation.delete();
   * ```
   */
  create(agentId: number, folderId: number, options?: ConversationCreateOptions): Promise<ConversationCreateResponse>;

  /**
   * Gets all conversations with optional filtering and pagination
   *
   * @param options - Options for querying conversations including optional pagination parameters
   * @returns Promise resolving to either an array of conversations NonPaginatedResponse<ConversationGetResponse> or a PaginatedResponse<ConversationGetResponse> when pagination options are used
   *
   * @example Basic usage - get all conversations
   * ```typescript
   * const allConversations = await conversationalAgent.conversations.getAll();
   *
   * for (const conversation of allConversations.items) {
   *   console.log(`${conversation.label} - created: ${conversation.createdTime}`);
   * }
   * ```
   *
   * @example With pagination
   * ```typescript
   * // First page
   * const firstPage = await conversationalAgent.conversations.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPage.hasNextPage) {
   *   const nextPage = await conversationalAgent.conversations.getAll({
   *     cursor: firstPage.nextCursor
   *   });
   * }
   * ```
   *
   * @example Sorted with limit
   * ```typescript
   * const result = await conversationalAgent.conversations.getAll({
   *   sort: SortOrder.Descending,
   *   pageSize: 20
   * });
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
   * Gets a conversation by ID
   *
   * The returned conversation has bound methods for lifecycle management:
   * `update()`, `delete()`, and `startSession()`.
   *
   * @param id - The conversation ID to retrieve
   * @returns Promise resolving to {@link ConversationGetResponse} with bound methods
   *
   * @example
   * ```typescript
   * const conversation = await conversationalAgent.conversations.getById(conversationId);
   *
   * // Resume with a real-time session
   * const session = conversation.startSession();
   * ```
   */
  getById(id: string): Promise<ConversationGetResponse>;

  /**
   * Updates a conversation by ID
   *
   * @param id - The conversation ID to update
   * @param options - Fields to update
   * @returns Promise resolving to {@link ConversationGetResponse} with bound methods
   * @example
   * ```typescript
   * const updatedConversation = await conversationalAgent.conversations.updateById(conversationId, {
   *   label: 'Updated Name'
   * });
   * ```
   */
  updateById(
    id: string,
    options: ConversationUpdateOptions
  ): Promise<ConversationUpdateResponse>;

  /**
   * Deletes a conversation by ID
   *
   * @param id - The conversation ID to delete
   * @returns Promise resolving to {@link ConversationDeleteResponse}
   * @example
   * ```typescript
   * await conversationalAgent.conversations.deleteById(conversationId);
   * ```
   */
  deleteById(id: string): Promise<ConversationDeleteResponse>;

  // ==================== Attachments ====================

  /**
   * Uploads a file attachment to a conversation
   *
   * Uploads a file attachment to a conversation
   *
   * @param conversationId - The conversation to attach the file to
   * @param file - The file to upload
   * @returns Promise resolving to attachment metadata with URI
   * {@link ConversationAttachmentUploadResponse}
   *
   * @example
   * ```typescript
   * const attachment = await conversationalAgent.conversations.uploadAttachment(conversationId, file);
   * console.log(`Uploaded: ${attachment.uri}`);
   * ```
   */
  uploadAttachment(conversationId: string, file: File): Promise<ConversationAttachmentUploadResponse>;

  // ==================== Real-time Event Handling ====================

  /**
   * Starts a real-time chat session for a conversation
   *
   * Creates a WebSocket session and returns a SessionStream for sending
   * and receiving messages in real-time.
   *
   * @param conversationId - The conversation ID to start the session for
   * @param options - Optional session configuration
   * @returns SessionStream for managing the session
   *
   * @example
   * ```typescript
   * const session = conversationalAgent.conversations.startSession(conversation.id);
   *
   * // Listen for responses using helper methods
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     // Use message.isAssistant to filter AI responses
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         // Use part.isMarkdown to handle text content
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
   *
   * // End the session when done
   * conversationalAgent.conversations.endSession(conversation.id);
   * ```
   */
  startSession(conversationId: string, options?: ConversationSessionOptions): SessionStream;

  /**
   * Retrieves an active session by conversation ID
   *
   * @param conversationId - The conversation ID to get the session for
   * @returns The session helper if active, undefined otherwise
   *
   * @example
   * ```typescript
   * const session = conversationalAgent.conversations.getSession(conversationId);
   * if (session) {
   *   const exchange = session.startExchange();
   *   await exchange.sendMessageWithContentPart({ data: 'Hello!' });
   * }
   * ```
   */
  getSession(conversationId: string): SessionStream | undefined;

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
   * conversationalAgent.conversations.endSession(conversationId);
   * ```
   */
  endSession(conversationId: string): void;

  /**
   * Iterator over all active sessions
   * @internal
   */
  readonly sessions: Iterable<SessionStream>;

  // ==================== Connection Management ====================

  /**
   * Current connection status
   * @internal
   */
  readonly connectionStatus: ConnectionStatus;

  /**
   * Whether WebSocket is connected
   * @internal
   */
  readonly isConnected: boolean;

  /**
   * Current connection error, if any
   * @internal
   */
  readonly connectionError: Error | null;

  /**
   * Registers a handler for connection status changes
   * @internal
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void;
}

/**
 * Methods interface that will be added to conversation objects
 */
export interface ConversationMethods {
  /** Scoped exchange operations for this conversation */
  readonly exchanges: ConversationExchangeServiceModel;

  /**
   * Updates this conversation
   *
   * @param options - Fields to update
   * @returns Promise resolving to the updated conversation
   */
  update(options: ConversationUpdateOptions): Promise<ConversationUpdateResponse>;

  /**
   * Deletes this conversation
   *
   * @returns Promise resolving to the deletion response
   */
  delete(): Promise<ConversationDeleteResponse>;

  /**
   * Starts a real-time chat session for this conversation
   *
   * Creates a WebSocket session and returns a SessionStream for sending
   * and receiving messages in real-time.
   *
   * @param options - Optional session options
   * @returns SessionStream for managing the session
   *
   * @example
   * ```typescript
   * const conversation = await conversationalAgent.conversations.create(agentId, folderId);
   *
   * // Start a real-time session
   * const session = conversation.startSession();
   *
   * // Listen for responses using helper methods
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     // Filter for assistant messages
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         // Handle text content
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
  startSession(options?: ConversationSessionOptions): SessionStream;

  /**
   * Gets the active session for this conversation
   *
   * @returns The session helper if active, undefined otherwise
   *
   * @example
   * ```typescript
   * const session = conversation.getSession();
   * if (session) {
   *   const exchange = session.startExchange();
   *   await exchange.sendMessageWithContentPart({ data: 'Hello!' });
   * }
   * ```
   */
  getSession(): SessionStream | undefined;

  /**
   * Ends the active session for this conversation
   *
   * Sends a session end event and cleans up the session resources.
   *
   * @example
   * ```typescript
   * // End the session when done
   * conversation.endSession();
   * ```
   */
  endSession(): void;

  /**
   * Uploads a file attachment to this conversation
   *
   * Uploads a file attachment to a conversation
   *
   * @param file - The file to upload
   * @returns Promise resolving to attachment metadata with URI
   * {@link ConversationAttachmentUploadResponse}
   *
   * @example
   * ```typescript
   * const attachment = await conversation.uploadAttachment(file);
   * console.log(`Uploaded: ${attachment.uri}`);
   * ```
   */
  uploadAttachment(file: File): Promise<ConversationAttachmentUploadResponse>;
}

/**
 * Conversation combining {@link RawConversationGetResponse} metadata with {@link ConversationMethods} for lifecycle management
 */
export type ConversationGetResponse = RawConversationGetResponse & ConversationMethods;

/**
 * Creates methods for a conversation
 *
 * @param conversationData - The conversation data (response from API)
 * @param service - The conversation service instance
 * @param sessionProvider - Optional session provider for WebSocket session methods
 * @param exchangeService - Optional exchange service for scoped exchange methods
 * @returns Object containing conversation methods
 */
function createConversationMethods(
  conversationData: RawConversationGetResponse,
  service: ConversationServiceModel,
  sessionProvider?: ConversationSessionProvider,
  exchangeService?: ExchangeServiceModel
): ConversationMethods {
  return {
    exchanges: {
      getAll(options?) {
        if (!conversationData.id) throw new Error('Conversation ID is undefined');
        if (!exchangeService) throw new Error('Exchange methods are not available.');
        return exchangeService.getAll(conversationData.id, options);
      },
      getById(exchangeId: string, options?: ExchangeGetByIdOptions) {
        if (!conversationData.id) throw new Error('Conversation ID is undefined');
        if (!exchangeService) throw new Error('Exchange methods are not available.');
        return exchangeService.getById(conversationData.id, exchangeId, options);
      },
      createFeedback(exchangeId: string, options: CreateFeedbackOptions) {
        if (!conversationData.id) throw new Error('Conversation ID is undefined');
        if (!exchangeService) throw new Error('Exchange methods are not available.');
        return exchangeService.createFeedback(conversationData.id, exchangeId, options);
      }
    },

    async update(options: ConversationUpdateOptions): Promise<ConversationUpdateResponse> {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');

      return service.updateById(conversationData.id, options);
    },

    async delete(): Promise<ConversationDeleteResponse> {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');

      return service.deleteById(conversationData.id);
    },

    startSession(options?: ConversationSessionOptions): SessionStream {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');
      if (!sessionProvider) {
        throw new Error('Session methods are not available. Use ConversationService to create conversations with session support.');
      }

      return sessionProvider.startSession(conversationData.id, options);
    },

    getSession(): SessionStream | undefined {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');
      if (!sessionProvider) {
        throw new Error('Session methods are not available. Use ConversationService to create conversations with session support.');
      }

      return sessionProvider.getSession(conversationData.id);
    },

    endSession(): void {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');
      if (!sessionProvider) {
        throw new Error('Session methods are not available. Use ConversationService to create conversations with session support.');
      }

      sessionProvider.endSession(conversationData.id);
    },

    async uploadAttachment(file: File): Promise<ConversationAttachmentUploadResponse> {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');
      return service.uploadAttachment(conversationData.id, file);
    }
  };
}

/**
 * Creates an actionable conversation by combining API conversation data with operational methods.
 *
 * @param conversationData - The conversation data from API
 * @param service - The conversation service instance
 * @param sessionProvider - Optional session provider for WebSocket session methods
 * @param exchangeService - Optional exchange service for scoped exchange methods
 * @returns A conversation object with added methods
 */
export function createConversationWithMethods(
  conversationData: RawConversationGetResponse,
  service: ConversationServiceModel,
  sessionProvider?: ConversationSessionProvider,
  exchangeService?: ExchangeServiceModel
): ConversationGetResponse {
  const methods = createConversationMethods(conversationData, service, sessionProvider, exchangeService);
  return Object.assign({}, conversationData, methods) as ConversationGetResponse;
}
