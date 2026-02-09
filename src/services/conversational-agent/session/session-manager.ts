/**
 * SessionManager - Manages WebSocket session lifecycle for conversations
 */

import type { Socket } from 'socket.io-client';
import type { IUiPathSDK } from '@/core/types';
import type {
  ConversationalAgentOptions,
  ConversationEvent,
  ConversationId
} from '@/models/conversational-agent';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler, LogLevel } from '@/core/websocket';

import { WebSocketSession } from './session';
import { WEBSOCKET_EVENTS } from '../constants';

/**
 * Interface for dispatching conversation events
 */
export interface EventDispatcher {
  dispatch(event: ConversationEvent): void;
}

/**
 * Manages WebSocket session lifecycle for conversations
 */
export class SessionManager {
  /** Underlying WebSocket session */
  private _session: WebSocketSession;

  /** Per-conversation socket tracking for automatic lifecycle management */
  private _sessionSockets: Map<ConversationId, Socket> = new Map();

  /** Reverse mapping: Socket -> Set of conversation IDs using it */
  private _socketToConversations: Map<Socket, Set<ConversationId>> = new Map();

  /** Event dispatcher for routing events to handlers */
  private _eventDispatcher: EventDispatcher | null = null;

  /**
   * Creates an instance of the SessionManager.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration
   */
  constructor(instance: IUiPathSDK, options?: ConversationalAgentOptions) {
    this._session = new WebSocketSession(instance, options);
    this._setupEventListeners();
  }

  // ==================== Configuration ====================

  /**
   * Sets the event dispatcher for routing incoming events
   *
   * @param dispatcher - Event dispatcher instance
   */
  setEventDispatcher(dispatcher: EventDispatcher): void {
    this._eventDispatcher = dispatcher;
  }

  /**
   * Sets the log level for debugging
   *
   * @param level - Log level to set
   */
  setLogLevel(level: LogLevel): void {
    this._session.setLogLevel(level);
  }

  // ==================== Event Handling ====================

  /**
   * Sets up WebSocket event listeners
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
   * Emits a conversation event via WebSocket
   *
   * Auto-connects if needed and handles errors.
   *
   * @param event - Conversation event to emit
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
   * Gets or creates a socket for a specific conversation
   *
   * Auto-connects if needed and tracks the socket for this conversation.
   *
   * @param conversationId - Conversation ID
   * @returns Promise resolving to the connected socket
   */
  private async _getSocket(conversationId: ConversationId): Promise<Socket> {
    let socket: Socket | undefined = this._sessionSockets.get(conversationId);

    // Check if existing socket is stale (disconnected)
    // If so, clean up and clear so we get a fresh socket below
    if (socket?.disconnected) {
      this._removeConversationFromSocket(conversationId, socket);
      this._sessionSockets.delete(conversationId);
      socket = undefined; // Fall through to get new socket
    }

    // Get or create a connected socket
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
          // Clean up the reverse mapping to prevent memory leaks
          this._socketToConversations.delete(capturedSocket);
        });
      }
    }

    return socket;
  }

  /**
   * Releases socket tracking for a conversation
   *
   * Called when a session ends (endSession event sent).
   *
   * @param conversationId - Conversation ID to release
   */
  releaseSocket(conversationId: ConversationId): void {
    const socket = this._sessionSockets.get(conversationId);
    if (socket) {
      this._removeConversationFromSocket(conversationId, socket);
    }
    this._sessionSockets.delete(conversationId);
  }

  /**
   * Removes a conversation from the socket's reverse mapping
   *
   * @param conversationId - Conversation ID to remove
   * @param socket - Socket to remove from
   */
  private _removeConversationFromSocket(conversationId: ConversationId, socket: Socket): void {
    const conversationIds = this._socketToConversations.get(socket);
    if (conversationIds) {
      conversationIds.delete(conversationId);
    }
  }

  /**
   * Deprecates socket for a conversation (marks unusable without disconnecting)
   *
   * Called when server signals sessionEnding.
   *
   * @param conversationId - Conversation ID
   */
  private _deprecateSocketForConversation(conversationId: ConversationId): void {
    const socket = this._sessionSockets.get(conversationId);
    if (socket) {
      this._session.deprecateSocket(socket);
    }
  }

  // ==================== Connection Management ====================

  /**
   * Disconnects from WebSocket and releases all session resources
   *
   * Immediately closes the WebSocket connection and clears all per-conversation
   * socket tracking. Any active sessions will receive a disconnection error.
   */
  disconnect(): void {
    // Clear all per-conversation socket tracking
    this._sessionSockets.clear();
    this._socketToConversations.clear();

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
   * Registers a handler for connection status changes
   *
   * @param handler - Callback function to handle status changes
   * @returns Cleanup function to remove handler
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this._session.onConnectionStatusChanged(handler);
  }
}
