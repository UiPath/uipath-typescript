/**
 * WebSocket Infrastructure
 *
 * Provides WebSocket functionality for the SDK via BaseWebSocket abstract class.
 */

// Base class for WebSocket connections
export { BaseWebSocket } from './base';

// Public types
export { ConnectionStatus, LogLevel } from './types';
export type {
  ConnectionStatusChangedHandler,
  SocketEventHandler
} from './types';
