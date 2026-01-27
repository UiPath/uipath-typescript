/**
 * WebSocket Utilities
 */

import { LogLevel, ParsedWebSocketUrl } from './types';

const CLOUD_WEBSOCKET_PATH = '/autopilotforeveryone_/websocket_/socket.io';

/**
 * Parse a base URL into WebSocket host and path.
 * Converts HTTPS to WSS, HTTP to WS.
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
 * Default WebSocket configuration.
 * Uses exponential backoff for reconnection (200ms initial, 30s max, infinite retries).
 */
export const DEFAULT_WEBSOCKET_CONFIG = {
  logLevel: LogLevel.Info,
  timeout: 5000,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 200,
  reconnectionDelayMax: 30000
};
