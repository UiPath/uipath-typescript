// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';
const CONVERSATION_ID_2 = 'test-conv-id-2';

// ===== HELPERS =====
const createManager = () => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  return { emitSpy, manager };
};

const createManagerWithSession = () => {
  const { emitSpy, manager } = createManager();
  const session = manager.startSession({ conversationId: CONVERSATION_ID });
  emitSpy.mockClear();
  return { emitSpy, manager, session: session as SessionEventHelperImpl };
};

// ===== TEST SUITE =====
describe('ConversationEventHelperManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startSession', () => {
    it('should create a session and emit startSession event', () => {
      const { emitSpy, manager } = createManager();

      const session = manager.startSession({ conversationId: CONVERSATION_ID });

      expect(session).toBeDefined();
      expect(session.conversationId).toBe(CONVERSATION_ID);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          startSession: expect.any(Object),
        })
      );
    });

    it('should replace existing session for same conversationId', () => {
      const { manager } = createManager();

      const session1 = manager.startSession({ conversationId: CONVERSATION_ID });
      const deletedSpy = vi.fn();
      session1.onDeleted(deletedSpy);

      const session2 = manager.startSession({ conversationId: CONVERSATION_ID });

      expect(deletedSpy).toHaveBeenCalled();
      expect(session2).not.toBe(session1);
      expect(manager.getSession(CONVERSATION_ID)).toBe(session2);
    });

    it('should set properties on session when provided', () => {
      const { manager } = createManager();

      const session = manager.startSession({
        conversationId: CONVERSATION_ID,
        properties: { myProp: 'value' },
      });

      expect(session.getProperties<{ myProp: string }>().myProp).toBe('value');
    });

    it('should auto-end session when callback is provided', async () => {
      const { emitSpy, manager } = createManager();

      await manager.startSession(
        { conversationId: CONVERSATION_ID },
        async (session) => {
          session.startExchange();
        }
      );

      const endSessionCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.endSession !== undefined
      );
      expect(endSessionCall).toBeDefined();
    });

    it('should return a promise when callback is provided', () => {
      const { manager } = createManager();

      const result = manager.startSession(
        { conversationId: CONVERSATION_ID },
        async () => {}
      );

      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('sessions and getSession', () => {
    it('should return session by conversationId', () => {
      const { manager, session } = createManagerWithSession();

      expect(manager.getSession(CONVERSATION_ID)).toBe(session);
    });

    it('should return undefined for unknown conversationId', () => {
      const { manager } = createManagerWithSession();

      expect(manager.getSession('non-existent')).toBeUndefined();
    });

    it('should iterate over all sessions', () => {
      const { manager } = createManager();

      manager.startSession({ conversationId: CONVERSATION_ID });
      manager.startSession({ conversationId: CONVERSATION_ID_2 });

      const sessions = Array.from(manager.sessions);
      expect(sessions).toHaveLength(2);
    });
  });

  describe('emitAny', () => {
    it('should emit event through config', () => {
      const { emitSpy, manager } = createManager();

      const event = { conversationId: CONVERSATION_ID, metaEvent: { key: 'value' } };
      manager.emitAny(event);

      expect(emitSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('dispatch', () => {
    it('should route events to correct session', () => {
      const { manager, session } = createManagerWithSession();
      const startedSpy = vi.fn();
      session.onSessionStarted(startedSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        sessionStarted: {},
      });

      expect(startedSpy).toHaveBeenCalled();
    });

    it('should create session on first event if not exists', () => {
      const { manager } = createManager();
      const sessionStartSpy = vi.fn();
      manager.onSessionStart(sessionStartSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        sessionStarted: {},
      });

      expect(sessionStartSpy).toHaveBeenCalled();
      expect(manager.getSession(CONVERSATION_ID)).toBeDefined();
    });

    it('should fire onAny handlers for all events', () => {
      const { manager } = createManagerWithSession();
      const anySpy = vi.fn();
      manager.onAny(anySpy);

      const event = { conversationId: CONVERSATION_ID, metaEvent: { key: 'val' } };
      manager.dispatch(event);

      expect(anySpy).toHaveBeenCalledWith(event);
    });

    it('should not create duplicate sessions for same conversationId', () => {
      const { manager } = createManagerWithSession();

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        metaEvent: { key: 'val' },
      });

      const sessions = Array.from(manager.sessions);
      expect(sessions).toHaveLength(1);
    });
  });

  describe('handler registration and unregistration', () => {
    it('should register and unregister onAny handler', () => {
      const { manager } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = manager.onAny(handler);

      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { key: '1' } });
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { key: '2' } });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should register and unregister onSessionStart handler', () => {
      const { manager } = createManager();
      const handler = vi.fn();
      const cleanup = manager.onSessionStart(handler);

      manager.dispatch({ conversationId: CONVERSATION_ID, sessionStarted: {} });
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
      manager.dispatch({ conversationId: CONVERSATION_ID_2, sessionStarted: {} });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendErrorStart and sendErrorEnd', () => {
    it('should emit conversation error start event', () => {
      const { emitSpy, manager } = createManager();

      manager.sendErrorStart({
        conversationId: CONVERSATION_ID,
        errorId: 'err-1',
        message: 'Something failed',
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          conversationError: expect.objectContaining({
            errorId: 'err-1',
            startError: expect.objectContaining({ message: 'Something failed' }),
          }),
        })
      );
    });

    it('should emit conversation error end event', () => {
      const { emitSpy, manager } = createManager();

      manager.sendErrorEnd({
        conversationId: CONVERSATION_ID,
        errorId: 'err-1',
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          conversationError: expect.objectContaining({
            errorId: 'err-1',
            endError: expect.any(Object),
          }),
        })
      );
    });

    it('should auto-generate errorId when not provided', () => {
      const { emitSpy, manager } = createManager();

      manager.sendErrorStart({
        conversationId: CONVERSATION_ID,
        message: 'auto-id error',
      });

      const call = emitSpy.mock.calls[0][0];
      expect(call.conversationError.errorId).toBeDefined();
      expect(typeof call.conversationError.errorId).toBe('string');
    });
  });

  describe('error propagation handlers', () => {
    it('should call onAnyErrorStart handler when error dispatched', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      manager.onAnyErrorStart(anyErrorSpy);

      // Register unhandled error handler to prevent async throw
      manager.onUnhandledErrorStart(vi.fn());

      // Need to dispatch an exchange with error to trigger base class error propagation
      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      exchange.onErrorStart(vi.fn()); // local handler
      (exchange as any).dispatchErrorStart('err-1', { message: 'test error' });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'err-1' })
      );
    });

    it('should call onUnhandledErrorStart when no local or any handler', () => {
      const { manager, session } = createManagerWithSession();
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      (exchange as any).dispatchErrorStart('err-1', { message: 'unhandled' });

      expect(unhandledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'err-1' })
      );
    });

    it('should unregister onAnyErrorStart handler', () => {
      const { manager, session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = manager.onAnyErrorStart(handler);
      manager.onUnhandledErrorStart(vi.fn());

      const exchange = session.startExchange({ exchangeId: 'ex-1' });

      (exchange as any).dispatchErrorStart('err-1', { message: 'test' });
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
      const exchange2 = session.startExchange({ exchangeId: 'ex-2' });
      (exchange2 as any).dispatchErrorStart('err-2', { message: 'test2' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister onUnhandledErrorStart handler', () => {
      const { manager } = createManager();
      const handler = vi.fn();
      const cleanup = manager.onUnhandledErrorStart(handler);

      cleanup();

      // After unregistration the handler array should be empty
      expect((manager as any)._unhandledErrorStartHandlers).toHaveLength(0);
    });

    it('should call onAnyErrorEnd handler when error end dispatched', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorEndSpy = vi.fn();
      manager.onAnyErrorEnd(anyErrorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      (exchange as any).dispatchErrorEnd('err-1', {});

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'err-1' })
      );
    });

    it('should unregister onAnyErrorEnd handler', () => {
      const { manager } = createManager();
      const handler = vi.fn();
      const cleanup = manager.onAnyErrorEnd(handler);

      cleanup();

      expect((manager as any)._anyErrorEndHandlers).toHaveLength(0);
    });

    it('should unregister onUnhandledErrorEnd handler', () => {
      const { manager } = createManager();
      const handler = vi.fn();
      const cleanup = manager.onUnhandledErrorEnd(handler);

      cleanup();

      expect((manager as any)._unhandledErrorEndHandlers).toHaveLength(0);
    });
  });

  describe('removeSession', () => {
    it('should remove session from map after endSession', () => {
      const { manager, session } = createManagerWithSession();

      session.sendSessionEnd();

      expect(manager.getSession(CONVERSATION_ID)).toBeUndefined();
    });
  });

  describe('makeId', () => {
    it('should generate unique uppercase UUIDs', () => {
      const { manager } = createManager();

      const id1 = manager.makeId();
      const id2 = manager.makeId();

      expect(id1).not.toBe(id2);
      expect(id1).toBe(id1.toUpperCase());
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { manager } = createManager();

      expect(manager.toString()).toBe('ConversationEventHelperManager()');
    });
  });
});
