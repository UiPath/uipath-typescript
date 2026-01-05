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
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Generic event handler for WebSocket events
 */
export type SocketEventHandler<T = any> = (data: T) => void | Promise<void>;

/**
 * Configuration for BaseWebSocket
 * Accepts full SDK config via spread - extra properties are stored and accessible
 */
export interface BaseWebSocketConfig {
  /** Base URL for WebSocket connection */
  baseUrl: string;
  /** Log level for debugging */
  logLevel?: LogLevel;
  /** Connection timeout in milliseconds */
  timeout?: number;
  /** Enable automatic reconnection */
  reconnection?: boolean;
  /** Maximum reconnection attempts */
  reconnectionAttempts?: number;
  /** Initial delay between reconnection attempts (ms) */
  reconnectionDelay?: number;
  /** Maximum delay between reconnection attempts (ms) */
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
