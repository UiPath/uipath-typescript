/**
 * WebSocket Utilities - Helper functions and default configuration
 */

/**
 * Result of parsing a WebSocket URL
 */
export interface ParsedWebSocketUrl {
  /** WebSocket host (wss:// or ws://) */
  host: string;
  /** Socket.io path */
  path: string;
}

/** Default WebSocket path for UiPath Cloud */
const CLOUD_WEBSOCKET_PATH = '/autopilotforeveryone_/websocket_/socket.io';

/**
 * Parse a base URL into WebSocket host and path.
 *
 * Automatically converts HTTPS to WSS and HTTP to WS.
 * For localhost URLs, uses default socket.io path.
 * For cloud URLs, uses the UiPath Cloud WebSocket path.
 *
 * @example
 * ```typescript
 * const { host, path } = parseWebSocketUrl('https://alpha.uipath.com');
 * // host: 'wss://alpha.uipath.com'
 * // path: '/autopilotforeveryone_/websocket_/socket.io'
 *
 * const { host, path } = parseWebSocketUrl('http://localhost:3000');
 * // host: 'ws://localhost:3000'
 * // path: '/socket.io'
 *
 * const { host, path } = parseWebSocketUrl('http://localhost:3000', '/custom-path');
 * // host: 'ws://localhost:3000'
 * // path: '/custom-path'
 * ```
 */
export function parseWebSocketUrl(baseUrl: string, path?: string): ParsedWebSocketUrl {
  const url = new URL(baseUrl);
  const isSecure = url.protocol === 'https:';
  const wsProtocol = isSecure ? 'wss:' : 'ws:';
  const host = `${wsProtocol}//${url.host}`;

  // If a custom path is provided, use it
  if (path) {
    return { host, path };
  }

  // For localhost, use default socket.io path
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return { host, path: '/socket.io' };
  }

  // For cloud URLs, use the UiPath Cloud WebSocket path
  return { host, path: CLOUD_WEBSOCKET_PATH };
}

/**
 * Default WebSocket configuration values (excludes baseUrl which must be provided)
 */
export const DEFAULT_WEBSOCKET_CONFIG = {
  logLevel: 'info' as const,
  timeout: 5000,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 200,
  reconnectionDelayMax: 30000
};
