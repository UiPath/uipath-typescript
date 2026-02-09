/**
 * Conversation Service Model
 *
 * This interface defines the HTTP CRUD operations for conversations
 * and real-time WebSocket session management.
 */

import type { ConversationId } from './types/common.types';
import type { RawConversationGetResponse } from './types/core.types';
import type {
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationGetAllOptions,
  CreateConversationOptions,
  UpdateConversationOptions,
  AttachmentCreateResponse,
  AttachmentUploadResponse
} from './conversations.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import type { ConnectionStatus, ConnectionStatusChangedHandler } from '@/core/websocket';
import type { SessionStream } from './events/session.types';

/**
 * Options for starting a session on a conversation object.
 * Unlike SessionStartEventOptions, conversationId is not needed since it's implicit from the conversation.
 */
export interface ConversationSessionOptions {
  /**
   * When set, causes events emitted to also be dispatched to event handlers.
   * This option is useful when the event helper objects are bound to UI components
   * as it allows a single code path for rendering both user and assistant messages.
   */
  echo?: boolean;
}

/**
 * Provider interface for session operations.
 * This allows the conversation object to access session methods without
 * depending on the full ConversationService implementation.
 */
export interface ConversationSessionProvider {
  /**
   * Starts a real-time chat session for a conversation
   */
  startSession(args: { conversationId: ConversationId } & ConversationSessionOptions): SessionStream;

  /**
   * Gets an active session for a conversation
   */
  getSession(conversationId: ConversationId): SessionStream | undefined;

  /**
   * Ends an active session for a conversation
   */
  endSession(conversationId: ConversationId): void;
}

/**
 * Service for creating and managing conversations with UiPath Conversational Agents
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
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
 * ```
 */
export interface ConversationServiceModel {
  /**
   * Creates a new conversation
   *
   * The returned conversation has bound methods for lifecycle management:
   * `update()`, `delete()`, and `startSession()`.
   *
   * @param options - Options for creating a conversation
   * @returns Promise resolving to {@link ConversationCreateResponse} with bound methods
   *
   * @example
   * ```typescript
   * const conversation = await conversations.create({
   *   agentId,
   *   folderId,
   *   label: 'Customer Support Session'
   * });
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
  create(options: CreateConversationOptions): Promise<ConversationCreateResponse>;

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
   * const conversation = await conversations.getById(conversationId);
   *
   * // Resume with a real-time session
   * const session = conversation.startSession();
   * ```
   */
  getById(id: ConversationId): Promise<ConversationGetResponse>;

  /**
   * Gets all conversations with optional filtering and pagination
   *
   * @param options - Options for querying conversations including optional pagination parameters
   * @returns Promise resolving to either an array of conversations NonPaginatedResponse<ConversationGetResponse> or a PaginatedResponse<ConversationGetResponse> when pagination options are used
   *
   * @example Basic usage - get all conversations
   * ```typescript
   * const allConversations = await conversations.getAll();
   *
   * for (const conversation of allConversations.items) {
   *   console.log(`${conversation.label} - created: ${conversation.createdTime}`);
   * }
   * ```
   *
   * @example With pagination
   * ```typescript
   * // First page
   * const firstPage = await conversations.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (firstPage.hasNextPage) {
   *   const nextPage = await conversations.getAll({
   *     cursor: firstPage.nextCursor
   *   });
   * }
   * ```
   *
   * @example Sorted with limit
   * ```typescript
   * const result = await conversations.getAll({
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
   * Updates a conversation by ID
   *
   * @param id - The conversation ID to update
   * @param options - Fields to update
   * @returns Promise resolving to {@link ConversationGetResponse} with bound methods
   * @example
   * ```typescript
   * const updatedConversation = await conversationsService.updateById(conversationId, {
   *   label: 'Updated Name'
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
   * @returns Promise resolving to {@link ConversationDeleteResponse}
   * @example
   * ```typescript
   * await conversations.deleteById(conversationId);
   * ```
   */
  deleteById(id: ConversationId): Promise<ConversationDeleteResponse>;

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
   * @returns Promise resolving to attachment details with upload access
   * {@link AttachmentCreateResponse}
   *
   * @example
   * ```typescript
   * const attachmentEntry = await conversations.createAttachment(conversationId, 'document.pdf');
   * // Handle upload manually using attachmentEntry.fileUploadAccess
   * const { url, verb, headers } = attachmentEntry.fileUploadAccess;
   * ```
   */
  createAttachment(conversationId: ConversationId, fileName: string): Promise<AttachmentCreateResponse>;

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
   *
   * @example
   * ```typescript
   * const attachment = await conversations.uploadAttachment(conversationId, file);
   * console.log(`Uploaded: ${attachment.uri}`);
   * ```
   */
  uploadAttachment(conversationId: ConversationId, file: File): Promise<AttachmentUploadResponse>;

  // ==================== Real-time Event Handling ====================

  /**
   * Starts a real-time chat session for a conversation
   *
   * Creates a WebSocket session and returns a SessionStream for sending
   * and receiving messages in real-time.
   *
   * @param args - Session start options including conversationId
   * @returns SessionStream for managing the session
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
   * const exchange = session.startExchange();
   * exchange.sendMessageWithContentPart({ data: 'Hello!' });
   *
   * // End the session when done
   * session.sendSessionEnd();
   * ```
   */
  startSession(args: { conversationId: ConversationId } & ConversationSessionOptions): SessionStream;

  /**
   * Retrieves an active session by conversation ID
   *
   * @param conversationId - The conversation ID to get the session for
   * @returns The session helper if active, undefined otherwise
   *
   * @example
   * ```typescript
   * const session = conversations.getSession(conversationId);
   * if (session) {
   *   const exchange = session.startExchange();
   *   exchange.sendMessageWithContentPart({ data: 'Hello!' });
   * }
   * ```
   */
  getSession(conversationId: ConversationId): SessionStream | undefined;

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
  endSession(conversationId: ConversationId): void;

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
  /**
   * Updates this conversation
   *
   * @param options - Fields to update
   * @returns Promise resolving to the updated conversation
   */
  update(options: UpdateConversationOptions): Promise<ConversationGetResponse>;

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
   * const conversation = await conversations.create({ agentId, folderId });
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
   *   exchange.sendMessageWithContentPart({ data: 'Hello!' });
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
   * Creates an attachment entry for this conversation
   *
   * Creates the attachment entry and returns upload access details.
   * For most cases, use `uploadAttachment()` instead which handles both steps.
   *
   * @param fileName - The name of the file
   * @returns Promise resolving to attachment details with upload access
   * {@link AttachmentCreateResponse}
   *
   * @example
   * ```typescript
   * const attachmentEntry = await conversation.createAttachment('document.pdf');
   * const { url, verb, headers } = attachmentEntry.fileUploadAccess;
   * ```
   */
  createAttachment(fileName: string): Promise<AttachmentCreateResponse>;

  /**
   * Uploads a file attachment to this conversation
   *
   * Convenience method that creates the attachment entry and uploads
   * the file content in one step.
   *
   * @param file - The file to upload
   * @returns Promise resolving to attachment metadata with URI
   * {@link AttachmentUploadResponse}
   *
   * @example
   * ```typescript
   * const attachment = await conversation.uploadAttachment(file);
   * console.log(`Uploaded: ${attachment.uri}`);
   * ```
   */
  uploadAttachment(file: File): Promise<AttachmentUploadResponse>;
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
 * @returns Object containing conversation methods
 */
function createConversationMethods(
  conversationData: RawConversationGetResponse,
  service: ConversationServiceModel,
  sessionProvider?: ConversationSessionProvider
): ConversationMethods {
  return {
    async update(options: UpdateConversationOptions): Promise<ConversationGetResponse> {
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

      return sessionProvider.startSession({
        conversationId: conversationData.id,
        ...options
      });
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

    async createAttachment(fileName: string): Promise<AttachmentCreateResponse> {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');
      return service.createAttachment(conversationData.id, fileName);
    },

    async uploadAttachment(file: File): Promise<AttachmentUploadResponse> {
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
 * @returns A conversation object with added methods
 */
export function createConversationWithMethods(
  conversationData: RawConversationGetResponse,
  service: ConversationServiceModel,
  sessionProvider?: ConversationSessionProvider
): ConversationGetResponse {
  const methods = createConversationMethods(conversationData, service, sessionProvider);
  return Object.assign({}, conversationData, methods) as ConversationGetResponse;
}
