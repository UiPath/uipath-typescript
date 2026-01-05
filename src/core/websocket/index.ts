/**
 * WebSocket Infrastructure
 *
 * Provides WebSocket functionality for the SDK via BaseWebSocket abstract class.
 */

// Base class for WebSocket connections
export { BaseWebSocket } from './websocket';

// Public types
export { ConnectionStatus } from './types';
export type {
  ConnectionStatusChangedHandler,
  LogLevel,
  SocketEventHandler
} from './types';
