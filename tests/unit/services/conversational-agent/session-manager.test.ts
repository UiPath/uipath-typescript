// ===== IMPORTS =====
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SDKInternalsRegistry } from '@/core/internals/registry';
import { ConnectionStatus } from '@/core/websocket/types';
import { WEBSOCKET_EVENTS } from '@/services/conversational-agent/constants';
import { TEST_CONSTANTS } from '@tests/utils/mocks';

// ===== MOCKING =====

// Mutable state for mock session property getters
let mockConnectionStatus: string = 'Disconnected';
let mockIsConnected: boolean = false;
let mockConnectionError: Error | null = null;

const mockSession = {
  addEventListeners: vi.fn(),
  removeEventListeners: vi.fn(),
  clearEventListeners: vi.fn(),
  getConnectedSocket: vi.fn(),
  deprecateSocket: vi.fn(),
  disconnect: vi.fn(),
  setLogLevel: vi.fn(),
  onConnectionStatusChanged: vi.fn().mockReturnValue(vi.fn()),
  get connectionStatus() {
    return mockConnectionStatus;
  },
  get isConnected() {
    return mockIsConnected;
  },
  get connectionError() {
    return mockConnectionError;
  }
};

vi.mock(
  '@/services/conversational-agent/conversations/session/websocket-session',
  () => ({
    WebSocketSession: vi.fn().mockImplementation(() => mockSession)
  })
);

// Import after mock declaration so the mock takes effect
import { SessionManager } from '@/services/conversational-agent/conversations/session/session-manager';
import type { EventDispatcher } from '@/services/conversational-agent/conversations/session/session-manager';
import { WebSocketSession } from '@/services/conversational-agent/conversations/session/websocket-session';

// ===== TEST SETUP =====

/** Flush the microtask/promise queue so fire-and-forget emitEvent internals complete */
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

/** Create a minimal mock socket */
function createMockSocket(overrides: Record<string, any> = {}) {
  return {
    id: 'socket-1',
    connected: true,
    disconnected: false,
    emit: vi.fn(),
    on: vi.fn(),
    disconnect: vi.fn(),
    ...overrides
  };
}

// ===== TEST SUITE =====
describe('SessionManager Unit Tests', () => {
  let mockInstance: any;

  beforeEach(() => {
    mockInstance = {};
    SDKInternalsRegistry.set(mockInstance, {
      config: { baseUrl: TEST_CONSTANTS.BASE_URL } as any,
      context: {} as any,
      tokenManager: {
        getValidToken: vi.fn().mockResolvedValue('test-token')
      } as any
    });

    // Reset mutable mock state
    mockConnectionStatus = 'Disconnected';
    mockIsConnected = false;
    mockConnectionError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Constructor and Setup ====================
  describe('Constructor and Setup', () => {
    it('should create WebSocketSession with instance and options', () => {
      const options = { logLevel: 'debug' as any };
      const manager = new SessionManager(mockInstance, options);

      expect(WebSocketSession).toHaveBeenCalledWith(mockInstance, options);
      expect(manager).toBeDefined();
    });

    it('should register ConversationEvent listener on construction', () => {
      const _manager = new SessionManager(mockInstance);

      expect(mockSession.addEventListeners).toHaveBeenCalledTimes(1);
      const listenerMap = mockSession.addEventListeners.mock.calls[0][0];
      expect(listenerMap).toHaveProperty(WEBSOCKET_EVENTS.CONVERSATION_EVENT);
      expect(typeof listenerMap[WEBSOCKET_EVENTS.CONVERSATION_EVENT]).toBe('function');
    });
  });

  // ==================== setEventDispatcher ====================
  describe('setEventDispatcher', () => {
    it('should set event dispatcher for routing events', () => {
      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };

      manager.setEventDispatcher(dispatcher);

      // Verify by triggering an incoming event and checking it dispatches
      const listenerMap = mockSession.addEventListeners.mock.calls[0][0];
      const conversationEventHandler = listenerMap[WEBSOCKET_EVENTS.CONVERSATION_EVENT];

      const event = { conversationId: 'conv-1' };
      conversationEventHandler(event);

      expect(dispatcher.dispatch).toHaveBeenCalledWith(event);
    });
  });

  // ==================== emitEvent ====================
  describe('emitEvent', () => {
    it('should get socket and emit ConversationEvent', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);
      const event = {
        conversationId: 'conv-1',
        startSession: { capabilities: {} }
      };

      manager.emitEvent(event);
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        WEBSOCKET_EVENTS.CONVERSATION_EVENT,
        event
      );
    });

    it('should release socket when event has endSession', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);

      // First emit to establish the socket mapping
      const startEvent = { conversationId: 'conv-1', startSession: { capabilities: {} } };
      manager.emitEvent(startEvent);
      await flushPromises();

      mockSession.getConnectedSocket.mockClear();

      // Emit endSession - this should release the socket
      const endEvent = { conversationId: 'conv-1', endSession: {} };
      manager.emitEvent(endEvent);
      await flushPromises();

      // After endSession, emitting again should request a new socket
      const newMockSocket = createMockSocket({ id: 'socket-2' });
      mockSession.getConnectedSocket.mockResolvedValue(newMockSocket);

      const nextEvent = { conversationId: 'conv-1', startSession: { capabilities: {} } };
      manager.emitEvent(nextEvent);
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalled();
    });

    it('should dispatch error when getConnectedSocket fails', async () => {
      mockSession.getConnectedSocket.mockRejectedValue(new Error(TEST_CONSTANTS.ERROR_MESSAGE));

      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };
      manager.setEventDispatcher(dispatcher);

      const event = { conversationId: 'conv-1', startSession: { capabilities: {} } };
      manager.emitEvent(event);
      await flushPromises();

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          conversationError: expect.objectContaining({
            errorId: 'EVENT_SEND_ERROR',
            startError: expect.objectContaining({
              message: 'Failed to send conversation event.',
              details: { cause: TEST_CONSTANTS.ERROR_MESSAGE }
            })
          })
        })
      );
    });

    it('should dispatch error with EVENT_SEND_ERROR errorId and null cause for non-Error exceptions', async () => {
      mockSession.getConnectedSocket.mockRejectedValue('some string error');

      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };
      manager.setEventDispatcher(dispatcher);

      const event = { conversationId: 'conv-2', startSession: { capabilities: {} } };
      manager.emitEvent(event);
      await flushPromises();

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-2',
          conversationError: expect.objectContaining({
            errorId: 'EVENT_SEND_ERROR',
            startError: expect.objectContaining({
              message: 'Failed to send conversation event.',
              details: { cause: null }
            })
          })
        })
      );
    });
  });

  // ==================== Event Dispatching ====================
  describe('Event Dispatching', () => {
    it('should dispatch incoming ConversationEvent to event dispatcher', () => {
      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };
      manager.setEventDispatcher(dispatcher);

      const listenerMap = mockSession.addEventListeners.mock.calls[0][0];
      const conversationEventHandler = listenerMap[WEBSOCKET_EVENTS.CONVERSATION_EVENT];

      const incomingEvent = {
        conversationId: 'conv-1',
        exchange: { exchangeId: 'ex-1', startExchange: {} }
      };
      conversationEventHandler(incomingEvent);

      expect(dispatcher.dispatch).toHaveBeenCalledWith(incomingEvent);
    });

    it('should handle sessionEnding by deprecating socket for conversation', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };
      manager.setEventDispatcher(dispatcher);

      // Establish a socket mapping by emitting an event
      const startEvent = { conversationId: 'conv-1', startSession: { capabilities: {} } };
      manager.emitEvent(startEvent);
      await flushPromises();

      // Simulate an incoming sessionEnding event from server
      const listenerMap = mockSession.addEventListeners.mock.calls[0][0];
      const conversationEventHandler = listenerMap[WEBSOCKET_EVENTS.CONVERSATION_EVENT];

      const sessionEndingEvent = {
        conversationId: 'conv-1',
        sessionEnding: { timeToLiveMS: 5000 }
      };
      conversationEventHandler(sessionEndingEvent);

      expect(mockSession.deprecateSocket).toHaveBeenCalledWith(mockSocket);
      expect(dispatcher.dispatch).toHaveBeenCalledWith(sessionEndingEvent);
    });

    it('should not throw if no dispatcher is set when receiving events', () => {
      const _manager = new SessionManager(mockInstance);

      const listenerMap = mockSession.addEventListeners.mock.calls[0][0];
      const conversationEventHandler = listenerMap[WEBSOCKET_EVENTS.CONVERSATION_EVENT];

      expect(() => {
        conversationEventHandler({ conversationId: 'conv-1' });
      }).not.toThrow();
    });
  });

  // ==================== Socket Lifecycle (_getSocket) ====================
  describe('Socket Lifecycle', () => {
    it('should reuse existing socket for same conversation', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);

      const event1 = { conversationId: 'conv-1', exchange: { exchangeId: 'ex-1' } };
      manager.emitEvent(event1);
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalledTimes(1);

      const event2 = { conversationId: 'conv-1', exchange: { exchangeId: 'ex-2' } };
      manager.emitEvent(event2);
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalledTimes(1);
      expect(mockSocket.emit).toHaveBeenCalledTimes(2);
    });

    it('should get new socket when existing socket is disconnected (stale)', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);

      const event1 = { conversationId: 'conv-1', exchange: { exchangeId: 'ex-1' } };
      manager.emitEvent(event1);
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalledTimes(1);

      // Simulate the socket becoming stale
      mockSocket.disconnected = true;

      const freshSocket = createMockSocket({ id: 'socket-2' });
      mockSession.getConnectedSocket.mockResolvedValue(freshSocket);

      const event2 = { conversationId: 'conv-1', exchange: { exchangeId: 'ex-2' } };
      manager.emitEvent(event2);
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalledTimes(2);
      expect(freshSocket.emit).toHaveBeenCalledWith(
        WEBSOCKET_EVENTS.CONVERSATION_EVENT,
        event2
      );
    });

    it('should register disconnect handler on new socket', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);

      const event = { conversationId: 'conv-1', startSession: { capabilities: {} } };
      manager.emitEvent(event);
      await flushPromises();

      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should register disconnect handler only once per socket even for multiple conversations', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);

      const event1 = { conversationId: 'conv-1', startSession: { capabilities: {} } };
      manager.emitEvent(event1);
      await flushPromises();

      const event2 = { conversationId: 'conv-2', startSession: { capabilities: {} } };
      manager.emitEvent(event2);
      await flushPromises();

      const disconnectCalls = mockSocket.on.mock.calls.filter(
        (call: any[]) => call[0] === 'disconnect'
      );
      expect(disconnectCalls).toHaveLength(1);
    });
  });

  // ==================== Disconnect Handler ====================
  describe('Disconnect Handler', () => {
    it('should dispatch error for all conversations when socket disconnects', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };
      manager.setEventDispatcher(dispatcher);

      // Establish two conversations on the same socket
      manager.emitEvent({ conversationId: 'conv-1', startSession: { capabilities: {} } });
      await flushPromises();

      manager.emitEvent({ conversationId: 'conv-2', startSession: { capabilities: {} } });
      await flushPromises();

      // Capture the disconnect handler
      const disconnectCall = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect'
      );
      expect(disconnectCall).toBeDefined();
      const disconnectHandler = disconnectCall![1];

      // Clear previous dispatch calls
      dispatcher.dispatch = vi.fn();

      // Simulate socket disconnect
      disconnectHandler('transport close');

      expect(dispatcher.dispatch).toHaveBeenCalledTimes(2);

      const dispatchedEvents = (dispatcher.dispatch as any).mock.calls.map(
        (call: any[]) => call[0]
      );

      const conv1Error = dispatchedEvents.find(
        (e: any) => e.conversationId === 'conv-1'
      );
      const conv2Error = dispatchedEvents.find(
        (e: any) => e.conversationId === 'conv-2'
      );

      expect(conv1Error).toBeDefined();
      expect(conv2Error).toBeDefined();
    });

    it('should dispatch WEBSOCKET_DISCONNECTED error with reason', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };
      manager.setEventDispatcher(dispatcher);

      manager.emitEvent({ conversationId: 'conv-1', startSession: { capabilities: {} } });
      await flushPromises();

      const disconnectCall = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect'
      );
      const disconnectHandler = disconnectCall![1];

      dispatcher.dispatch = vi.fn();

      disconnectHandler('io server disconnect');

      expect(dispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'conv-1',
          conversationError: expect.objectContaining({
            errorId: 'WEBSOCKET_DISCONNECTED',
            startError: expect.objectContaining({
              message: 'WebSocket disconnected: io server disconnect'
            })
          })
        })
      );
    });
  });

  // ==================== releaseSocket ====================
  describe('releaseSocket', () => {
    it('should remove conversation from socket tracking', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);

      manager.emitEvent({ conversationId: 'conv-1', startSession: { capabilities: {} } });
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalledTimes(1);

      manager.releaseSocket('conv-1');

      const freshSocket = createMockSocket({ id: 'socket-fresh' });
      mockSession.getConnectedSocket.mockResolvedValue(freshSocket);

      manager.emitEvent({ conversationId: 'conv-1', startSession: { capabilities: {} } });
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalledTimes(2);
    });

    it('should not throw when releasing a conversation that was never tracked', () => {
      const manager = new SessionManager(mockInstance);

      expect(() => {
        manager.releaseSocket('unknown-conv');
      }).not.toThrow();
    });
  });

  // ==================== disconnect ====================
  describe('disconnect', () => {
    it('should call session.disconnect and clear tracking maps', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);

      manager.emitEvent({ conversationId: 'conv-1', startSession: { capabilities: {} } });
      await flushPromises();

      manager.disconnect();

      expect(mockSession.disconnect).toHaveBeenCalled();

      // After disconnect, all tracking should be cleared
      mockSession.getConnectedSocket.mockClear();
      const newSocket = createMockSocket({ id: 'socket-new' });
      mockSession.getConnectedSocket.mockResolvedValue(newSocket);

      manager.emitEvent({ conversationId: 'conv-1', startSession: { capabilities: {} } });
      await flushPromises();

      expect(mockSession.getConnectedSocket).toHaveBeenCalledTimes(1);
    });

    it('should disconnect deprecated sockets still in the reverse map', async () => {
      const mockSocket = createMockSocket();
      mockSession.getConnectedSocket.mockResolvedValue(mockSocket);

      const manager = new SessionManager(mockInstance);
      const dispatcher: EventDispatcher = { dispatch: vi.fn() };
      manager.setEventDispatcher(dispatcher);

      manager.emitEvent({ conversationId: 'conv-1', startSession: { capabilities: {} } });
      await flushPromises();

      // Simulate sessionEnding which deprecates the socket
      const listenerMap = mockSession.addEventListeners.mock.calls[0][0];
      const conversationEventHandler = listenerMap[WEBSOCKET_EVENTS.CONVERSATION_EVENT];
      conversationEventHandler({
        conversationId: 'conv-1',
        sessionEnding: { timeToLiveMS: 5000 }
      });

      manager.disconnect();

      expect(mockSession.disconnect).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  // ==================== Connection Property Proxying ====================
  describe('Connection Property Proxying', () => {
    it('should proxy connectionStatus from session', () => {
      const manager = new SessionManager(mockInstance);

      mockConnectionStatus = ConnectionStatus.Disconnected;
      expect(manager.connectionStatus).toBe(ConnectionStatus.Disconnected);

      mockConnectionStatus = ConnectionStatus.Connecting;
      expect(manager.connectionStatus).toBe(ConnectionStatus.Connecting);

      mockConnectionStatus = ConnectionStatus.Connected;
      expect(manager.connectionStatus).toBe(ConnectionStatus.Connected);
    });

    it('should proxy isConnected from session', () => {
      const manager = new SessionManager(mockInstance);

      mockIsConnected = false;
      expect(manager.isConnected).toBe(false);

      mockIsConnected = true;
      expect(manager.isConnected).toBe(true);
    });

    it('should proxy connectionError from session', () => {
      const manager = new SessionManager(mockInstance);

      mockConnectionError = null;
      expect(manager.connectionError).toBeNull();

      const error = new Error(TEST_CONSTANTS.ERROR_MESSAGE);
      mockConnectionError = error;
      expect(manager.connectionError).toBe(error);
    });

    it('should proxy onConnectionStatusChanged from session', () => {
      const manager = new SessionManager(mockInstance);
      const handler = vi.fn();
      const cleanup = vi.fn();
      mockSession.onConnectionStatusChanged.mockReturnValue(cleanup);

      const result = manager.onConnectionStatusChanged(handler);

      expect(mockSession.onConnectionStatusChanged).toHaveBeenCalledWith(handler);
      expect(result).toBe(cleanup);
    });
  });

  // ==================== setLogLevel ====================
  describe('setLogLevel', () => {
    it('should proxy setLogLevel to session', () => {
      const manager = new SessionManager(mockInstance);

      manager.setLogLevel('debug' as any);

      expect(mockSession.setLogLevel).toHaveBeenCalledWith('debug');
    });
  });
});
