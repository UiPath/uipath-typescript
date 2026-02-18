/**
 * BaseWebSocket - Abstract base class for WebSocket connections
 *
 * Provides common WebSocket infrastructure that services can extend:
 * - Connection management (connect, disconnect, reconnect)
 * - Authentication handling with automatic token refresh
 * - Event listener management
 * - Connection status tracking
 * - Logging
 */

import { io, type Socket } from 'socket.io-client';

import {
  ConnectionStatus,
  LogLevel,
  type ConnectionStatusChangedHandler,
  type SocketEventHandler,
  type BaseWebSocketConfig,
  type WebSocketConnectOptions
} from './types';
import { WebSocketLogger } from './logger';
import { parseWebSocketUrl, DEFAULT_WEBSOCKET_CONFIG } from './utils';
import { NetworkError } from '../errors';
import type { ExecutionContext } from '../context/execution';
import type { TokenManager } from '../auth/token-manager';

/**
 * Abstract base class for WebSocket connections.
 * Services should extend this class and implement service-specific logic.
 *
 * Features:
 * - Automatic token refresh on every connection/reconnection attempt
 * - Connection status tracking and event handling
 * - Per-socket lifecycle management
 *
 * @example
 * ```typescript
 * class WebSocketSession extends BaseWebSocket {
 *   constructor(instance: IUiPath) {
 *     const { config, context, tokenManager } = SDKInternalsRegistry.get(instance);
 *     super(config, context, tokenManager, 'WebSocketSession');
 *   }
 *
 *   connect(): void {
 *     const query: Record<string, string> = {};
 *     if (this._config.orgName) {
 *       query['x-uipath-internal-accountid'] = this._config.orgName;
 *     }
 *     if (this._config.tenantName) {
 *       query['x-uipath-internal-tenantid'] = this._config.tenantName;
 *     }
 *     this.connectWithOptions({ query });
 *   }
 *
 *   protected override onDisconnectedWhileWaiting(): void {
 *     this.connect();
 *   }
 * }
 * ```
 */
export abstract class BaseWebSocket {
  /** Socket.io client instance */
  protected _socket: Socket | null = null;

  /** Current connection status */
  protected _connectionStatus: ConnectionStatus = ConnectionStatus.Disconnected;

  /** Current connection error, if any */
  protected _connectionError: Error | null = null;

  /** Handlers for connection status changes */
  private _connectionStatusHandlers: ConnectionStatusChangedHandler[] = [];

  /** Event handlers by event name */
  private _eventHandlers: Map<string, SocketEventHandler[]> = new Map();

  /** Logger instance */
  protected _logger: WebSocketLogger;

  /** Configuration (merged with defaults) */
  protected _config: BaseWebSocketConfig;

  /** Execution context for accessing token info */
  protected _executionContext: ExecutionContext;

  /** Token manager for token refresh */
  protected _tokenManager: TokenManager;

  /**
   * Create a new BaseWebSocket instance
   * @param config WebSocket configuration
   * @param executionContext Execution context for accessing token info
   * @param tokenManager Token manager for authentication and token refresh
   * @param loggerPrefix Prefix for log messages (e.g., service name)
   */
  constructor(
    config: BaseWebSocketConfig,
    executionContext: ExecutionContext,
    tokenManager: TokenManager,
    loggerPrefix: string = 'WebSocket'
  ) {
    this._config = {
      ...DEFAULT_WEBSOCKET_CONFIG,
      ...config
    };
    this._executionContext = executionContext;
    this._tokenManager = tokenManager;
    this._logger = new WebSocketLogger(loggerPrefix, this._config.logLevel);
  }

  // ==================== Public Properties ====================

  /**
   * Current connection status
   */
  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }

  /**
   * Current connection error, if any
   */
  get connectionError(): Error | null {
    return this._connectionError;
  }

  /**
   * Whether the WebSocket is currently connected
   */
  get isConnected(): boolean {
    return this._connectionStatus === ConnectionStatus.Connected &&
           this._socket?.connected === true;
  }

  // ==================== Configuration ====================

  /**
   * Set log level for debugging
   */
  setLogLevel(level: LogLevel): void {
    this._config.logLevel = level;
    this._logger.setLevel(level);
  }

  // ==================== Authentication ====================

  /**
   * Gets a valid authentication token, refreshing if necessary.
   * This is called on every connection/reconnection attempt to ensure fresh tokens.
   *
   * @returns The valid token
   * @throws AuthenticationError if no token available or refresh fails
   */
  public async getValidToken(): Promise<string> {
    return this._tokenManager.getValidToken();
  }

  // ==================== Connection Management ====================

  /**
   * Connect to WebSocket with the provided options.
   * Subclasses should call this method with service-specific options.
   *
   * Authentication is handled automatically via getValidToken() which is called
   * on every connection/reconnection attempt to ensure fresh tokens.
   */
  protected connectWithOptions(options: WebSocketConnectOptions): void {
    this._logger.debug('Connecting WebSocket...');

    // Disconnect any existing connection
    this.disconnect();
    this._setConnectionStatus(ConnectionStatus.Connecting);

    const { host, path } = parseWebSocketUrl(this._config.baseUrl, options.path);

    // Dynamic auth function - called on EVERY connection/reconnection attempt
    // This ensures fresh tokens are used after expiry/refresh
    const auth = (cb: (data: { token: string }) => void) => {
      this.getValidToken()
        .then(token => cb({ token }))
        .catch(error => {
          this._logger.error('Failed to get token for WebSocket auth:', error);
          // Pass empty token - server will reject and trigger connect_error
          cb({ token: '' });
        });
    };

    const socket = io(host, {
      path,
      auth,
      query: options.query || {},
      transports: ['websocket'],
      withCredentials: true,
      timeout: this._config.timeout,
      reconnection: this._config.reconnection,
      reconnectionAttempts: this._config.reconnectionAttempts,
      reconnectionDelay: this._config.reconnectionDelay,
      reconnectionDelayMax: this._config.reconnectionDelayMax
    });

    // Debug logging for outgoing events
    socket.onAnyOutgoing((event, data) => {
      this._logger.debug('Outgoing:', { socketId: socket.id, event, data });
    });

    // Handle incoming events and dispatch to registered handlers
    socket.onAny((event, data) => {
      this._logger.debug('Incoming:', { socketId: socket.id, event, data });
      const handlers = this._eventHandlers.get(event);
      if (handlers) {
        // Use slice() for safe iteration if handler adds/removes handlers
        for (const handler of handlers.slice()) {
          try {
            const result = handler(data);
            // If handler returns a promise, catch any async errors
            if (result instanceof Promise) {
              result.catch((error) => {
                this._logger.error(`Error in async ${event} callback:`, error);
              });
            }
          } catch (error) {
            this._logger.error(`Error in ${event} callback:`, error);
          }
        }
      }
    });

    // Handle successful connection
    socket.on('connect', () => {
      this._logger.debug('Connected', { socketId: socket.id });

      // Check if disconnect was called while connecting
      if (this._connectionStatus === ConnectionStatus.Disconnected) {
        this._logger.debug('Disconnecting abandoned socket');
        socket.disconnect();
      } else {
        this._socket = socket;
        this._setConnectionStatus(ConnectionStatus.Connected);
      }
    });

    // Handle connection errors
    socket.on('connect_error', (error) => {
      this._logger.error('Connection error:', error);

      // Check if disconnect was called while connecting
      if (this._connectionStatus === ConnectionStatus.Disconnected) {
        this._logger.debug('Disconnecting abandoned socket');
        socket.disconnect();
      } else {
        const connectionError = new NetworkError({
          message: `WebSocket connection failed: ${error.message}`
        });
        this._setConnectionStatus(ConnectionStatus.Connecting, connectionError);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this._logger.debug('Disconnected:', { socketId: socket.id, reason });
    });

    // Initiate connection
    socket.connect();
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    switch (this._connectionStatus) {
      case ConnectionStatus.Connecting:
        this._logger.debug('Disconnect called while connecting, abandoning connection attempt');
        this._setConnectionStatus(ConnectionStatus.Disconnected);
        break;

      case ConnectionStatus.Connected:
        if (this._socket?.connected) {
          this._logger.debug('Disconnecting socket', { socketId: this._socket.id });
          this._socket.disconnect();
        }
        this._socket = null;
        this._setConnectionStatus(ConnectionStatus.Disconnected);
        break;

      case ConnectionStatus.Disconnected:
        this._logger.debug('Disconnect called but already disconnected');
        break;
    }
  }

  /**
   * Mark a socket as deprecated without immediately disconnecting it.
   *
   * This is used when the server signals that a session is ending (via sessionEnding event).
   * The socket is marked as unusable so that getConnectedSocket() will create a new one,
   * but the existing socket stays connected to allow any in-flight messages to complete.
   *
   * @param socket - The socket to deprecate
   */
  deprecateSocket(socket: Socket): void {
    if (this._socket === socket) {
      this._logger.debug('Deprecating socket', { socketId: socket.id });
      this._socket = null;
      // Note: We intentionally do NOT call socket.disconnect() here
      // The socket will close naturally when the server closes it
      this._setConnectionStatus(ConnectionStatus.Disconnected);
    }
  }

  /**
   * Get connected WebSocket, waiting for connection if necessary.
   * Automatically initiates connection if disconnected.
   *
   * @returns Promise that resolves with the connected socket
   * @throws Error if connection fails or is closed while waiting
   */
  async getConnectedSocket(): Promise<Socket> {
    if (this._connectionStatus === ConnectionStatus.Connected) {
      if (this._socket?.connected) {
        return this._socket;
      }
      throw new NetworkError({ message: 'Connection status is Connected but socket is not connected' });
    }

    return new Promise((resolve, reject) => {
      const removeHandler = this.onConnectionStatusChanged((status) => {
        if (status === ConnectionStatus.Connected) {
          removeHandler();
          if (!this._socket?.connected) {
            reject(new NetworkError({ message: 'Connection status is Connected but socket is not connected' }));
          } else {
            resolve(this._socket);
          }
        } else if (status === ConnectionStatus.Disconnected) {
          removeHandler();
          reject(new NetworkError({ message: 'WebSocket closed while waiting for connection' }));
        }
      });

      // If disconnected, subclass should handle initiating connection
      if (this._connectionStatus === ConnectionStatus.Disconnected) {
        this.onDisconnectedWhileWaiting();
      }
    });
  }

  /**
   * Called when getConnectedSocket is called while disconnected.
   * Subclasses should override to initiate connection.
   */
  protected onDisconnectedWhileWaiting(): void {
    // Subclasses should override to call connect with appropriate options
    this._logger.warn('getConnectedSocket called while disconnected. Subclass should override onDisconnectedWhileWaiting.');
  }

  // ==================== Event Handling ====================

  /**
   * Register a handler for connection status changes
   * @returns Cleanup function to remove the handler
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    this._connectionStatusHandlers.push(handler);
    return () => {
      const index = this._connectionStatusHandlers.indexOf(handler);
      if (index !== -1) {
        this._connectionStatusHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Add event listeners for WebSocket events
   * @param listeners Object mapping event names to handlers
   */
  addEventListeners(listeners: Record<string, SocketEventHandler | SocketEventHandler[]>): void {
    for (const [event, handlers] of Object.entries(listeners)) {
      const callbacks = Array.isArray(handlers) ? handlers : [handlers];
      const existing = this._eventHandlers.get(event) || [];
      this._eventHandlers.set(event, [...existing, ...callbacks]);
    }
  }

  /**
   * Remove event listeners for WebSocket events
   * @param listeners Object mapping event names to handlers to remove
   */
  removeEventListeners(listeners: Record<string, SocketEventHandler | SocketEventHandler[]>): void {
    for (const [event, handlers] of Object.entries(listeners)) {
      const existing = this._eventHandlers.get(event);
      if (existing) {
        const toRemove = Array.isArray(handlers) ? handlers : [handlers];
        const filtered = existing.filter(h => !toRemove.includes(h));
        if (filtered.length > 0) {
          this._eventHandlers.set(event, filtered);
        } else {
          this._eventHandlers.delete(event);
        }
      }
    }
  }

  /**
   * Clear all event listeners
   */
  clearEventListeners(): void {
    this._eventHandlers.clear();
  }

  // ==================== Protected Methods ====================

  /**
   * Update connection status and notify handlers
   */
  protected _setConnectionStatus(status: ConnectionStatus, error: Error | null = null): void {
    this._connectionStatus = status;
    this._connectionError = error;

    this._connectionStatusHandlers.forEach(handler => {
      try {
        handler(status, error);
      } catch (err) {
        this._logger.error('Error in connection status handler:', err);
      }
    });
  }
}
