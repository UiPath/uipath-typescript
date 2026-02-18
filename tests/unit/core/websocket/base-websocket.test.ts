// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock socket.io-client BEFORE any imports that use it
let mockSocketInstance: any;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocketInstance)
}));

import { BaseWebSocket } from '@/core/websocket/base';
import { ConnectionStatus, LogLevel } from '@/core/websocket/types';
import type {
  BaseWebSocketConfig,
} from '@/core/websocket/types';
import { NetworkError } from '@/core/errors/network';
import { TEST_CONSTANTS } from '@tests/utils/mocks';

// ===== MOCKING =====

// Concrete subclass for testing the abstract BaseWebSocket
class TestWebSocket extends BaseWebSocket {
  connect(): void {
    this.connectWithOptions({ query: { test: 'value' } });
  }

  protected override onDisconnectedWhileWaiting(): void {
    this.connect();
  }
}

// ===== TEST SETUP =====
const mockConfig: BaseWebSocketConfig = {
  baseUrl: TEST_CONSTANTS.BASE_URL,
  logLevel: LogLevel.Error // suppress logs in tests
};

const mockExecutionContext = {} as any;

let mockTokenManager: any;

function createTestWebSocket(): TestWebSocket {
  return new TestWebSocket(mockConfig, mockExecutionContext, mockTokenManager, 'Test');
}

/**
 * Helper: find a registered socket.on handler by event name
 */
function getSocketHandler(eventName: string): ((...args: any[]) => void) | undefined {
  const call = mockSocketInstance.on.mock.calls.find(
    (c: any[]) => c[0] === eventName
  );
  return call?.[1];
}

/**
 * Helper: simulate a successful socket connection
 */
function simulateConnect(): void {
  const connectHandler = getSocketHandler('connect');
  mockSocketInstance.connected = true;
  connectHandler?.();
}

/**
 * Helper: simulate a connection error
 */
function simulateConnectError(message = 'Connection failed'): void {
  const errorHandler = getSocketHandler('connect_error');
  errorHandler?.(new Error(message));
}

// ===== TEST SUITE =====
describe('BaseWebSocket Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    mockSocketInstance = {
      id: 'socket-123',
      connected: false,
      connect: vi.fn(),
      disconnect: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
      onAny: vi.fn(),
      onAnyOutgoing: vi.fn()
    };

    mockTokenManager = {
      getValidToken: vi.fn().mockResolvedValue('test-token')
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Connection Status Management ====================
  describe('Connection Status Management', () => {
    it('should have initial status as Disconnected', () => {
      const ws = createTestWebSocket();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Disconnected);
    });

    it('should change status to Connecting when connect is called', () => {
      const ws = createTestWebSocket();
      ws.connect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connecting);
    });

    it('should change status to Connected when connection succeeds', () => {
      const ws = createTestWebSocket();
      ws.connect();
      simulateConnect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connected);
    });

    it('should change status to Disconnected when disconnect is called', () => {
      const ws = createTestWebSocket();
      ws.connect();
      simulateConnect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connected);

      ws.disconnect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Disconnected);
    });
  });

  // ==================== Connection Status Change Handlers ====================
  describe('Connection Status Change Handlers', () => {
    it('should register and call status change handlers', () => {
      const ws = createTestWebSocket();
      const handler = vi.fn();
      ws.onConnectionStatusChanged(handler);

      ws.connect();
      expect(handler).toHaveBeenCalledWith(ConnectionStatus.Connecting, null);

      simulateConnect();
      expect(handler).toHaveBeenCalledWith(ConnectionStatus.Connected, null);
    });

    it('should support multiple handlers', () => {
      const ws = createTestWebSocket();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      ws.onConnectionStatusChanged(handler1);
      ws.onConnectionStatusChanged(handler2);

      ws.connect();
      simulateConnect();

      expect(handler1).toHaveBeenCalledWith(ConnectionStatus.Connected, null);
      expect(handler2).toHaveBeenCalledWith(ConnectionStatus.Connected, null);
    });

    it('should remove handler when unregister function is called', () => {
      const ws = createTestWebSocket();
      const handler = vi.fn();
      const unregister = ws.onConnectionStatusChanged(handler);

      ws.connect();
      const callCountAfterConnect = handler.mock.calls.length;

      unregister();

      simulateConnect();
      expect(handler.mock.calls.length).toBe(callCountAfterConnect);
    });
  });

  // ==================== getConnectedSocket Method ====================
  describe('getConnectedSocket Method', () => {
    it('should return existing socket when already connected', async () => {
      const ws = createTestWebSocket();
      ws.connect();
      simulateConnect();

      const socket = await ws.getConnectedSocket();
      expect(socket).toBe(mockSocketInstance);
    });

    it('should initiate connection when disconnected (calls onDisconnectedWhileWaiting)', async () => {
      const ws = createTestWebSocket();

      const promise = ws.getConnectedSocket();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(ws.connectionStatus).toBe(ConnectionStatus.Connecting);

      simulateConnect();

      const socket = await promise;
      expect(socket).toBe(mockSocketInstance);
    });

    it('should reject when disconnected while waiting', async () => {
      const ws = createTestWebSocket();
      ws.connect();

      const promise = ws.getConnectedSocket();

      ws.disconnect();

      await expect(promise).rejects.toThrow(NetworkError);
      await expect(promise).rejects.toThrow('WebSocket closed while waiting for connection');
    });

    it('should NOT reject on connection error (stays pending, resolves when eventually connected)', async () => {
      const ws = createTestWebSocket();
      ws.connect();

      const promise = ws.getConnectedSocket();
      let resolved = false;
      let rejected = false;

      promise.then(() => { resolved = true; }).catch(() => { rejected = true; });

      simulateConnectError('Temporary failure');
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(resolved).toBe(false);
      expect(rejected).toBe(false);
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connecting);

      simulateConnect();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(resolved).toBe(true);
      expect(rejected).toBe(false);
    });
  });

  // ==================== WebSocket Listener Management ====================
  describe('WebSocket Listener Management', () => {
    it('should add event listeners and dispatch events via onAny', () => {
      const ws = createTestWebSocket();
      const handler = vi.fn();

      ws.addEventListeners({ 'test-event': handler });
      ws.connect();
      simulateConnect();

      const onAnyCallback = mockSocketInstance.onAny.mock.calls[0]?.[1]
        ?? mockSocketInstance.onAny.mock.calls[0]?.[0];

      onAnyCallback('test-event', { message: 'hello' });

      expect(handler).toHaveBeenCalledWith({ message: 'hello' });
    });

    it('should handle multiple listeners for same event', () => {
      const ws = createTestWebSocket();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      ws.addEventListeners({ 'test-event': [handler1, handler2] });
      ws.connect();
      simulateConnect();

      const onAnyCallback = mockSocketInstance.onAny.mock.calls[0]?.[1]
        ?? mockSocketInstance.onAny.mock.calls[0]?.[0];

      onAnyCallback('test-event', { data: 'payload' });

      expect(handler1).toHaveBeenCalledWith({ data: 'payload' });
      expect(handler2).toHaveBeenCalledWith({ data: 'payload' });
    });

    it('should remove event listeners', () => {
      const ws = createTestWebSocket();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      ws.addEventListeners({ 'test-event': [handler1, handler2] });
      ws.removeEventListeners({ 'test-event': handler1 });

      ws.connect();
      simulateConnect();

      const onAnyCallback = mockSocketInstance.onAny.mock.calls[0]?.[1]
        ?? mockSocketInstance.onAny.mock.calls[0]?.[0];

      onAnyCallback('test-event', { data: 'payload' });

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith({ data: 'payload' });
    });

    it('should clear all event listeners', () => {
      const ws = createTestWebSocket();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      ws.addEventListeners({
        'event-a': handler1,
        'event-b': handler2
      });

      ws.clearEventListeners();

      ws.connect();
      simulateConnect();

      const onAnyCallback = mockSocketInstance.onAny.mock.calls[0]?.[1]
        ?? mockSocketInstance.onAny.mock.calls[0]?.[0];

      onAnyCallback('event-a', {});
      onAnyCallback('event-b', {});

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  // ==================== Connection Error Handling ====================
  describe('Connection Error Handling', () => {
    it('should set connection error when connect_error occurs (NetworkError, status stays Connecting)', () => {
      const ws = createTestWebSocket();
      ws.connect();

      simulateConnectError('Connection failed');

      expect(ws.connectionStatus).toBe(ConnectionStatus.Connecting);
      expect(ws.connectionError).toBeInstanceOf(NetworkError);
      expect(ws.connectionError?.message).toContain('Connection failed');
    });

    it('should pass error to status change handlers', () => {
      const ws = createTestWebSocket();
      const handler = vi.fn();
      ws.onConnectionStatusChanged(handler);

      ws.connect();
      handler.mockClear();

      simulateConnectError('Auth failed');

      expect(handler).toHaveBeenCalledWith(
        ConnectionStatus.Connecting,
        expect.any(NetworkError)
      );
      const errorArg = handler.mock.calls[0][1] as NetworkError;
      expect(errorArg.message).toContain('Auth failed');
    });

    it('should clear error when connection succeeds', () => {
      const ws = createTestWebSocket();
      ws.connect();

      simulateConnectError('Temporary failure');
      expect(ws.connectionError).toBeInstanceOf(NetworkError);

      simulateConnect();
      expect(ws.connectionError).toBeNull();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connected);
    });

    it('should abandon connection when disconnected during connect attempt (connect event fires after disconnect)', () => {
      const ws = createTestWebSocket();
      ws.connect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connecting);

      ws.disconnect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Disconnected);

      simulateConnect();

      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Disconnected);
    });

    it('should abandon connection when disconnected during error (connect_error fires after disconnect)', () => {
      const ws = createTestWebSocket();
      ws.connect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connecting);

      ws.disconnect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Disconnected);

      simulateConnectError('Late error');

      expect(mockSocketInstance.disconnect).toHaveBeenCalled();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Disconnected);
    });
  });

  // ==================== deprecateSocket ====================
  describe('deprecateSocket', () => {
    it('should deprecate matching socket (nulls _socket, sets Disconnected, does NOT call socket.disconnect())', () => {
      const ws = createTestWebSocket();
      ws.connect();
      simulateConnect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connected);

      mockSocketInstance.disconnect.mockClear();

      ws.deprecateSocket(mockSocketInstance);

      expect(ws.connectionStatus).toBe(ConnectionStatus.Disconnected);
      expect(mockSocketInstance.disconnect).not.toHaveBeenCalled();
      expect(ws.isConnected).toBe(false);
    });

    it('should ignore non-matching socket', () => {
      const ws = createTestWebSocket();
      ws.connect();
      simulateConnect();
      expect(ws.connectionStatus).toBe(ConnectionStatus.Connected);

      const differentSocket = { id: 'different-socket' } as any;
      ws.deprecateSocket(differentSocket);

      expect(ws.connectionStatus).toBe(ConnectionStatus.Connected);
    });
  });

  // ==================== isConnected property ====================
  describe('isConnected property', () => {
    it('should return true only when Connected and socket.connected is true', () => {
      const ws = createTestWebSocket();

      expect(ws.isConnected).toBe(false);

      ws.connect();
      expect(ws.isConnected).toBe(false);

      simulateConnect();
      expect(ws.isConnected).toBe(true);

      mockSocketInstance.connected = false;
      expect(ws.isConnected).toBe(false);

      mockSocketInstance.connected = true;
      ws.disconnect();
      expect(ws.isConnected).toBe(false);
    });
  });

  // ==================== setLogLevel ====================
  describe('setLogLevel', () => {
    it('should set log level on config and logger', () => {
      const ws = createTestWebSocket();

      expect(() => ws.setLogLevel(LogLevel.Debug)).not.toThrow();
      expect(() => ws.setLogLevel(LogLevel.Warn)).not.toThrow();
      expect(() => ws.setLogLevel(LogLevel.Info)).not.toThrow();
      expect(() => ws.setLogLevel(LogLevel.Error)).not.toThrow();
    });
  });
});
