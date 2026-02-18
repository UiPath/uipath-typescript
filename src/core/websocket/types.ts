/**
 * WebSocket Types - Common types for WebSocket infrastructure
 */

/**
 * Connection status for WebSocket clients
 */
export enum ConnectionStatus {
  Disconnected = 'Disconnected',
  Connecting = 'Connecting',
  Connected = 'Connected'
}

/**
 * Handler for connection status changes
 */
export type ConnectionStatusChangedHandler = (
  status: ConnectionStatus,
  error: Error | null
) => void;

/**
 * Log levels for WebSocket debugging
 */
export enum LogLevel {
  Debug = 'debug',
  Info = 'info',
  Warn = 'warn',
  Error = 'error'
}

/**
 * Generic event handler for WebSocket events
 */
export type SocketEventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * Configuration for BaseWebSocket
 * Accepts full SDK config via spread - extra properties are stored and accessible
 */
export interface BaseWebSocketConfig {
  /** Base URL for WebSocket connection (required) */
  baseUrl: string;
  /**
   * Log level for debugging output
   * @default LogLevel.Info
   */
  logLevel?: LogLevel;
  /**
   * Connection timeout in milliseconds - how long to wait for initial connection
   * @default 5000
   */
  timeout?: number;
  /**
   * Enable automatic reconnection when connection is lost
   * @default true
   */
  reconnection?: boolean;
  /**
   * Maximum number of reconnection attempts before giving up
   * @default Infinity
   */
  reconnectionAttempts?: number;
  /**
   * Initial delay between reconnection attempts in milliseconds.
   * Uses exponential backoff, so delay increases after each failed attempt.
   * @default 200
   */
  reconnectionDelay?: number;
  /**
   * Maximum delay between reconnection attempts in milliseconds.
   * Caps the exponential backoff to prevent excessively long wait times.
   * @default 30000
   */
  reconnectionDelayMax?: number;
  /** Organization ID (passed from SDK config) */
  organizationId?: string;
  /** Tenant ID (passed from SDK config) */
  tenantId?: string;
}

/**
 * WebSocket connection options passed during connect
 *
 * Note: Authentication is handled automatically by BaseWebSocket.getValidToken()
 * which is called on every connection/reconnection attempt.
 */
export interface WebSocketConnectOptions {
  /** Query parameters to send with connection */
  query?: Record<string, string>;
  /** Custom path for socket.io */
  path?: string;
}

/**
 * Result of parsing a WebSocket URL
 */
export interface ParsedWebSocketUrl {
  /** WebSocket host (wss:// or ws://) */
  host: string;
  /** Socket.io path */
  path: string;
}
