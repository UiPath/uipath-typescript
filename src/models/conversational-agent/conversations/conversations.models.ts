/**
 * Conversation Service Model
 *
 * This interface defines the HTTP CRUD operations for conversations
 * and real-time WebSocket session management.
 */

import type { ConversationId } from './common.types';
import type { RawConversationGetResponse } from './core.types';
import type {
  ConversationCreateResponse,
  ConversationDeleteResponse,
  ConversationGetAllOptions,
  CreateConversationOptions,
  UpdateConversationOptions
} from './conversations.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import type { ConnectionStatus, ConnectionStatusChangedHandler } from '@/core/websocket';

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
  startSession(args: { conversationId: ConversationId } & ConversationSessionOptions): unknown;

  /**
   * Gets an active session for a conversation
   */
  getSession(conversationId: ConversationId): unknown | undefined;
}

/**
 * Service for managing UiPath Conversations
 *
 * Conversations are the main interaction container for conversational agents.
 * This service provides CRUD operations and real-time WebSocket sessions.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { Conversations } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversations = new Conversations(sdk);
 *
 * // Create a conversation
 * const conversation = await conversations.create({
 *   agentReleaseId: 123,
 *   folderId: 456
 * });
 *
 * // Start real-time chat session
 * const session = conversation.startSession();
 * session.sendPrompt({ text: 'Hello!' });
 * ```
 */
export interface ConversationServiceModel {
  /**
   * Creates a new conversation
   *
   * Returns the conversation with helper methods attached via `createConversationWithMethods()`.
   * The returned conversation has methods like `startSession()`, `update()`, `delete()` etc.
   * that can be called directly on the conversation object.
   *
   * @param options - Options for creating a conversation
   * @returns Promise resolving to the created conversation with helper methods
   * {@link ConversationCreateResponse}
   *
   * @example Basic usage
   * ```typescript
   * const conversation = await conversations.create({
   *   agentReleaseId: 123,
   *   folderId: 456
   * });
   * ```
   *
   * @example Complete workflow - create and start real-time chat
   * ```typescript
   * // Create a conversation with a label
   * const conversation = await conversations.create({
   *   agentReleaseId: 123,
   *   folderId: 456,
   *   label: 'Customer Support Session'
   * });
   *
   * // Start real-time session (method attached to conversation object)
   * const session = conversation.startSession();
   *
   * // Listen for AI responses using helper methods
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     // Use message.isAssistant to filter AI responses
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         // Use part.isText to check content type
   *         if (part.isText) {
   *           part.onChunk((chunk) => {
   *             process.stdout.write(chunk.data ?? '');
   *           });
   *         }
   *       });
   *     }
   *   });
   * });
   *
   * // Send user prompt
   * session.sendPrompt({ text: 'Hello, I need help with my order' });
   * ```
   *
   * @example Using conversation helper methods
   * ```typescript
   * const conversation = await conversations.create({
   *   agentReleaseId: 123,
   *   folderId: 456
   * });
   *
   * // Update the conversation label
   * await conversation.update({ label: 'Renamed Chat' });
   *
   * // Start a session
   * const session = conversation.startSession();
   *
   * // Get the active session
   * const activeSession = conversation.getSession();
   *
   * // End the session
   * conversation.endSession();
   *
   * // Delete the conversation
   * await conversation.delete();
   * ```
   */
  create(options: CreateConversationOptions): Promise<ConversationCreateResponse>;

  /**
   * Gets a conversation by ID
   *
   * Returns the conversation with helper methods attached via `createConversationWithMethods()`.
   * The returned conversation has methods like `startSession()`, `update()`, `delete()` etc.
   *
   * @param id - The conversation ID to retrieve
   * @returns Promise resolving to the conversation with helper methods
   * {@link ConversationGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * const conversation = await conversations.getById(conversationId);
   * console.log(conversation.label, conversation.createdAt);
   * ```
   *
   * @example Resume a conversation with real-time chat
   * ```typescript
   * // Get an existing conversation
   * const conversation = await conversations.getById('conv-123');
   *
   * // Start a new session for this conversation
   * const session = conversation.startSession();
   *
   * // Listen for AI responses using helper methods
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
   * // Continue the conversation
   * session.sendPrompt({ text: 'What was my last question?' });
   * ```
   */
  getById(id: ConversationId): Promise<ConversationGetResponse>;

  /**
   * Gets all conversations with optional filtering and pagination
   *
   * Returns conversations with helper methods attached via `createConversationWithMethods()`.
   * Each conversation has methods like `startSession()`, `update()`, `delete()` etc.
   *
   * @param options - Options for querying conversations including optional pagination parameters
   * @returns Promise resolving to either an array of conversations {@link NonPaginatedResponse}<{@link ConversationGetResponse}> or a {@link PaginatedResponse}<{@link ConversationGetResponse}> when pagination options are used
   *
   * @example Basic usage - get all conversations
   * ```typescript
   * const allConversations = await conversations.getAll();
   *
   * for (const conversation of allConversations.items) {
   *   console.log(`${conversation.label} - created: ${conversation.createdAt}`);
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
   * @example Resume any conversation with real-time chat
   * ```typescript
   * // Get all conversations
   * const result = await conversations.getAll();
   *
   * // Pick the most recent conversation
   * const conversation = result.items[0];
   *
   * // Start a session (method attached to conversation object)
   * const session = conversation.startSession();
   *
   * // Send a message
   * session.sendPrompt({ text: 'Continue our discussion' });
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
   * @returns Promise resolving to the deletion response
   * {@link ConversationDeleteResponse}
   * @example
   * ```typescript
   * await conversations.deleteById(conversationId);
   * ```
   */
  deleteById(id: ConversationId): Promise<ConversationDeleteResponse>;

  // ==================== Real-time Event Handling ====================

  /**
   * Starts a real-time chat session for a conversation
   *
   * Creates a WebSocket session and returns a SessionEventHelper for sending
   * and receiving messages in real-time.
   *
   * @param args - Session start options including conversationId
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
  startSession(args: { conversationId: ConversationId } & ConversationSessionOptions): unknown;

  /**
   * Registers a handler for session start events
   *
   * @internal
   * @param handler - Callback function to handle session start
   * @returns Cleanup function to remove handler
   */
  onSessionStart(handler: (session: unknown) => void): () => void;

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
   *   session.sendPrompt({ text: 'Hello!' });
   * }
   * ```
   */
  getSession(conversationId: ConversationId): unknown | undefined;

  /**
   * Iterator over all active sessions
   * @internal
   */
  readonly sessions: Iterable<unknown>;

  // ==================== Connection Management ====================

  /**
   * Disconnects from WebSocket and releases all session resources
   * @internal
   */
  disconnectAll(): void;

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
   * Creates a WebSocket session and returns a SessionEventHelper for sending
   * and receiving messages in real-time.
   *
   * @param options - Optional session options
   * @returns SessionEventHelper for managing the session
   *
   * @example
   * ```typescript
   * const conversation = await conversations.create({ agentReleaseId: 123, folderId: 456 });
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
   * session.sendPrompt({ text: 'Hello!' });
   * ```
   */
  startSession(options?: ConversationSessionOptions): unknown;

  /**
   * Gets the active session for this conversation
   *
   * @returns The session helper if active, undefined otherwise
   *
   * @example
   * ```typescript
   * const session = conversation.getSession();
   * if (session) {
   *   session.sendPrompt({ text: 'Hello!' });
   * }
   * ```
   */
  getSession(): unknown | undefined;

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
}

/**
 * Combined type for conversation data with methods
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

    startSession(options?: ConversationSessionOptions): unknown {
      if (!conversationData.id) throw new Error('Conversation ID is undefined');
      if (!sessionProvider) {
        throw new Error('Session methods are not available. Use ConversationService to create conversations with session support.');
      }

      return sessionProvider.startSession({
        conversationId: conversationData.id,
        ...options
      });
    },

    getSession(): unknown | undefined {
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

      const session = sessionProvider.getSession(conversationData.id);
      if (session && typeof (session as any).sendSessionEnd === 'function') {
        (session as any).sendSessionEnd();
      }
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
