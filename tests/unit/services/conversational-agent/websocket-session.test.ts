// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { io } from 'socket.io-client';
import { WebSocketSession } from '@/services/conversational-agent/conversations/session/websocket-session';
import { SDKInternalsRegistry } from '@/core/internals/registry';
import { ConnectionStatus, LogLevel } from '@/core/websocket/types';
import { WEBSOCKET_QUERY_PARAMS } from '@/utils/constants/headers';
import { TEST_CONSTANTS } from '@tests/utils/mocks';

// ===== MOCKING =====

// Mock socket.io-client
let mockSocketInstance: any;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocketInstance)
}));

// ===== TEST SETUP =====
const mockConfig = {
  baseUrl: TEST_CONSTANTS.BASE_URL,
  orgName: TEST_CONSTANTS.ORGANIZATION_ID,
  tenantName: TEST_CONSTANTS.TENANT_ID
};

const mockContext = {};

const mockTokenManager = {
  getValidToken: vi.fn().mockResolvedValue('test-token')
};

let mockInstance: any;

// ===== TEST SUITE =====
describe('WebSocketSession Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

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

    mockInstance = {};
    SDKInternalsRegistry.set(mockInstance, {
      config: mockConfig as any,
      context: mockContext as any,
      tokenManager: mockTokenManager as any
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Constructor ====================
  describe('constructor', () => {
    it('should create instance from SDKInternalsRegistry', () => {
      const session = new WebSocketSession(mockInstance);

      expect(session).toBeInstanceOf(WebSocketSession);
      expect(session.connectionStatus).toBe(ConnectionStatus.Disconnected);
      expect(session.isConnected).toBe(false);
    });

    it('should use WEBSOCKET_LOGGER_PREFIX and merge logLevel from options', () => {
      const session = new WebSocketSession(mockInstance, {
        logLevel: LogLevel.Debug
      });

      expect(session).toBeInstanceOf(WebSocketSession);
      expect(session.connectionStatus).toBe(ConnectionStatus.Disconnected);
    });
  });

  // ==================== connect() - Query Parameters ====================
  describe('connect()', () => {
    it('should pass orgName and tenantName as query params', () => {
      const session = new WebSocketSession(mockInstance);

      session.connect();

      expect(io).toHaveBeenCalledTimes(1);
      const ioCall = (io as any).mock.calls[0];
      const options = ioCall[1];

      expect(options.query).toEqual({
        [WEBSOCKET_QUERY_PARAMS.ORGANIZATION_ID]: TEST_CONSTANTS.ORGANIZATION_ID,
        [WEBSOCKET_QUERY_PARAMS.TENANT_ID]: TEST_CONSTANTS.TENANT_ID
      });
    });

    it('should include externalUserId when provided in options', () => {
      const session = new WebSocketSession(mockInstance, {
        externalUserId: 'user-123'
      });

      session.connect();

      expect(io).toHaveBeenCalledTimes(1);
      const ioCall = (io as any).mock.calls[0];
      const options = ioCall[1];

      expect(options.query).toEqual({
        [WEBSOCKET_QUERY_PARAMS.ORGANIZATION_ID]: TEST_CONSTANTS.ORGANIZATION_ID,
        [WEBSOCKET_QUERY_PARAMS.TENANT_ID]: TEST_CONSTANTS.TENANT_ID,
        [WEBSOCKET_QUERY_PARAMS.EXTERNAL_USER_ID]: 'user-123'
      });
    });

    it('should omit empty query params when orgName and tenantName are not set', () => {
      const emptyConfig = {
        baseUrl: TEST_CONSTANTS.BASE_URL
      };

      const emptyInstance = {};
      SDKInternalsRegistry.set(emptyInstance, {
        config: emptyConfig as any,
        context: mockContext as any,
        tokenManager: mockTokenManager as any
      });

      const session = new WebSocketSession(emptyInstance as any);

      session.connect();

      expect(io).toHaveBeenCalledTimes(1);
      const ioCall = (io as any).mock.calls[0];
      const options = ioCall[1];

      expect(options.query).toEqual({});
    });
  });

  // ==================== onDisconnectedWhileWaiting ====================
  describe('onDisconnectedWhileWaiting', () => {
    it('should auto-connect when getConnectedSocket is called while disconnected', async () => {
      const session = new WebSocketSession(mockInstance);

      const socketPromise = session.getConnectedSocket();

      expect(io).toHaveBeenCalledTimes(1);
      expect(mockSocketInstance.connect).toHaveBeenCalled();

      // Clean up: disconnect to reject the pending promise
      session.disconnect();

      await expect(socketPromise).rejects.toThrow();
    });

    it('should resolve getConnectedSocket after auto-connect succeeds', async () => {
      const session = new WebSocketSession(mockInstance);

      const socketPromise = session.getConnectedSocket();

      expect(io).toHaveBeenCalledTimes(1);

      // Simulate successful connection
      const onHandlers: Record<string, Function> = {};
      mockSocketInstance.on.mock.calls.forEach(([event, handler]: [string, Function]) => {
        onHandlers[event] = handler;
      });

      mockSocketInstance.connected = true;

      if (onHandlers['connect']) {
        onHandlers['connect']();
      }

      const socket = await socketPromise;
      expect(socket).toBe(mockSocketInstance);
      expect(session.connectionStatus).toBe(ConnectionStatus.Connected);
    });
  });
});
