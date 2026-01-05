/**
 * SessionManager - Manages WebSocket session lifecycle for conversations
 *
 * Encapsulates all WebSocket-related logic:
 * - WebSocketSession (connection management)
 * - Per-conversation socket tracking
 * - Event emission and dispatch
 * - Connection status and error handling
 */

import type { Socket } from 'socket.io-client';
import type { UiPath } from '@/core/uipath';
import type { ConversationEvent, ConversationId } from '@/models/conversational';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler, LogLevel } from '@/core/websocket';

import { WebSocketSession } from './session';
import { WEBSOCKET_EVENTS } from '@/utils/constants/endpoints';

/**
 * Options for SessionManager
 */
export interface SessionManagerOptions {
  /** External User ID (optional) */
  externalUserId?: string;
  /** Log level for debugging */
  logLevel?: LogLevel;
}

/**
 * Interface for dispatching conversation events
 */
export interface EventDispatcher {
  dispatch(event: ConversationEvent): void;
}

/**
 * SessionManager - Manages WebSocket session lifecycle for conversations
 *
 * @example
 * ```typescript
 * const sessionManager = new SessionManager(sdk, { logLevel: 'debug' });
 *
 * // Set event dispatcher
 * sessionManager.setEventDispatcher(eventHelper);
 *
 * // Emit event (auto-connects if needed)
 * sessionManager.emitEvent(conversationEvent);
 *
 * // Check connection status
 * console.log(sessionManager.connectionStatus);
 *
 * // Disconnect
 * sessionManager.disconnect();
 * ```
 */
export class SessionManager {
  /** Underlying WebSocket session */
  private _session: WebSocketSession;

  /** Per-conversation socket tracking for automatic lifecycle management */
  private _sessionSockets: Map<ConversationId, Socket> = new Map();

  /** Reverse mapping: Socket -> Set of conversation IDs using it */
  private _socketToConversations: WeakMap<Socket, Set<ConversationId>> = new WeakMap();

  /** Event dispatcher for routing events to handlers */
  private _eventDispatcher: EventDispatcher | null = null;

  /**
   * Create a new SessionManager instance
   *
   * @param instance - UiPath SDK instance
   * @param options - Optional configuration (externalUserId, logLevel)
   */
  constructor(instance: UiPath, options?: SessionManagerOptions) {
    this._session = new WebSocketSession(instance, options);
    this._setupEventListeners();
  }

  // ==================== Configuration ====================

  /**
   * Set the event dispatcher for routing incoming events
   */
  setEventDispatcher(dispatcher: EventDispatcher): void {
    this._eventDispatcher = dispatcher;
  }

  /**
   * Set log level for debugging
   */
  setLogLevel(level: LogLevel): void {
    this._session.setLogLevel(level);
  }

  // ==================== Event Handling ====================

  /**
   * Setup WebSocket event listeners
   */
  private _setupEventListeners(): void {
    this._session.addEventListeners({
      [WEBSOCKET_EVENTS.CONVERSATION_EVENT]: (data: ConversationEvent) => {
        // Handle sessionEnding event - deprecate the socket for this conversation
        if (data.sessionEnding) {
          this._deprecateSocketForConversation(data.conversationId);
        }

        // Dispatch the event to registered handlers
        this._eventDispatcher?.dispatch(data);
      }
    });
  }

  /**
   * Emit a conversation event via WebSocket
   * Auto-connects if needed and handles errors
   *
   * @param event - The conversation event to emit
   */
  emitEvent(event: ConversationEvent): void {
    const emitAsync = async () => {
      try {
        const socket = await this._getSocket(event.conversationId);
        socket.emit(WEBSOCKET_EVENTS.CONVERSATION_EVENT, event);

        // Release socket when user sends endSession
        if (event.endSession) {
          this.releaseSocket(event.conversationId);
        }
      } catch (error) {
        this._eventDispatcher?.dispatch({
          conversationId: event.conversationId,
          conversationError: {
            errorId: 'EVENT_SEND_ERROR',
            startError: {
              message: 'Failed to send conversation event.',
              details: { cause: error instanceof Error ? error.message : null }
            }
          }
        });
      }
    };
    emitAsync();
  }

  // ==================== Socket Lifecycle ====================

  /**
   * Get or create a socket for a specific conversation.
   * Auto-connects if needed and tracks the socket for this conversation.
   *
   * @param conversationId - The conversation ID
   * @returns Promise that resolves with the connected socket
   */
  private async _getSocket(conversationId: ConversationId): Promise<Socket> {
    let socket = this._sessionSockets.get(conversationId);

    if (!socket) {
      // Get a new connected socket (auto-connects if needed)
      socket = await this._session.getConnectedSocket();
      this._sessionSockets.set(conversationId, socket);

      // Track this conversation in the reverse mapping
      let conversationIds = this._socketToConversations.get(socket);
      const isNewSocket = !conversationIds;

      if (!conversationIds) {
        conversationIds = new Set();
        this._socketToConversations.set(socket, conversationIds);
      }
      conversationIds.add(conversationId);

      // Register disconnect handler only once per socket
      if (isNewSocket) {
        // Capture socket reference for closure (avoids TypeScript narrowing issue)
        const capturedSocket = socket;
        capturedSocket.on('disconnect', (reason: string) => {
          // Get conversations from reverse mapping (O(1) lookup, no Map iteration)
          const affectedConversations = this._socketToConversations.get(capturedSocket);
          if (affectedConversations) {
            // Copy the set to avoid modification during iteration
            for (const convId of [...affectedConversations]) {
              this._eventDispatcher?.dispatch({
                conversationId: convId,
                conversationError: {
                  errorId: 'WEBSOCKET_DISCONNECTED',
                  startError: {
                    message: `WebSocket disconnected: ${reason}`
                  }
                }
              });
            }
          }
        });
      }
    } else if (socket.disconnected) {
      // Socket was disconnected, remove from tracking and throw
      this._removeConversationFromSocket(conversationId, socket);
      this._sessionSockets.delete(conversationId);
      throw new Error('WebSocket disconnected');
    }

    return socket;
  }

  /**
   * Release the socket tracking for a conversation.
   * Called when a session ends (endSession event sent).
   *
   * @param conversationId - The conversation ID to release
   */
  releaseSocket(conversationId: ConversationId): void {
    const socket = this._sessionSockets.get(conversationId);
    if (socket) {
      this._removeConversationFromSocket(conversationId, socket);
    }
    this._sessionSockets.delete(conversationId);
  }

  /**
   * Remove a conversation from the socket's reverse mapping.
   * @param conversationId - The conversation ID to remove
   * @param socket - The socket to remove from
   */
  private _removeConversationFromSocket(conversationId: ConversationId, socket: Socket): void {
    const conversationIds = this._socketToConversations.get(socket);
    if (conversationIds) {
      conversationIds.delete(conversationId);
    }
  }

  /**
   * Deprecate socket for a conversation (mark unusable without disconnecting).
   * Called when server signals sessionEnding.
   *
   * @param conversationId - The conversation ID
   */
  private _deprecateSocketForConversation(conversationId: ConversationId): void {
    const socket = this._sessionSockets.get(conversationId);
    if (socket) {
      this._session.deprecateSocket(socket);
    }
  }

  // ==================== Connection Management ====================

  /**
   * Connect to WebSocket for real-time events.
   *
   * @deprecated WebSocket connection is now managed automatically. The connection
   * is established when needed (e.g., when starting a session or sending events).
   * This method is kept for backwards compatibility but does nothing.
   */
  connect(): void {
    // Connection is now handled automatically when needed via getConnectedSocket()
    // This method is kept for backwards compatibility but does nothing
  }

  /**
   * Disconnect from WebSocket and release all session resources.
   *
   * This will immediately close the WebSocket connection and clear all
   * per-conversation socket tracking. Any active sessions will receive
   * a disconnection error.
   */
  disconnect(): void {
    // Clear all per-conversation socket tracking
    this._sessionSockets.clear();

    // Disconnect the underlying WebSocket
    this._session.disconnect();
  }

  /**
   * Current connection status
   */
  get connectionStatus(): ConnectionStatus {
    return this._session.connectionStatus;
  }

  /**
   * Whether WebSocket is currently connected
   */
  get isConnected(): boolean {
    return this._session.isConnected;
  }

  /**
   * Current connection error, if any
   */
  get connectionError(): Error | null {
    return this._session.connectionError;
  }

  /**
   * Register handler for connection status changes
   * @returns Cleanup function to remove handler
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this._session.onConnectionStatusChanged(handler);
  }
}
