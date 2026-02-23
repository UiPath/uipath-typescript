// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';
import { ConversationEventInvalidOperationError } from '@/services/conversational-agent/helpers/conversation-event-helper-common';
import { MessageRole } from '@/models/conversational-agent/conversations/types/common.types';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';

// ===== HELPERS =====
const createManagerWithSession = (echo = false) => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  const session = manager.startSession({ conversationId: CONVERSATION_ID, echo }) as SessionEventHelperImpl;
  emitSpy.mockClear();
  return { emitSpy, manager, session };
};

// ===== TEST SUITE =====
describe('SessionEventHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have conversationId set', () => {
      const { session } = createManagerWithSession();
      expect(session.conversationId).toBe(CONVERSATION_ID);
    });

    it('should have startEvent accessible', () => {
      const { session } = createManagerWithSession();
      expect(session.startEvent).toBeDefined();
    });

    it('should set echo mode', () => {
      const { session } = createManagerWithSession(true);
      expect(session.echo).toBe(true);
    });

    it('should not be ended initially', () => {
      const { session } = createManagerWithSession();
      expect(session.ended).toBe(false);
    });

    it('should not be paused initially', () => {
      const { session } = createManagerWithSession();
      expect(session.isPaused).toBe(false);
    });

    it('should have an empty properties object', () => {
      const { session } = createManagerWithSession();
      expect(session.getProperties()).toEqual({});
      expect(typeof session.getProperties()).toBe('object');
    });

    it('should allow storing and retrieving custom properties', () => {
      const { session } = createManagerWithSession();
      session.setProperties({ custom: 'val', nested: { a: 1 } });
      expect(session.getProperties<any>().custom).toBe('val');
      expect(session.getProperties<any>().nested.a).toBe(1);
    });
  });

  describe('emit', () => {
    it('should emit events with conversationId through manager', () => {
      const { emitSpy, session } = createManagerWithSession();

      session.emit({ metaEvent: { key: 'value' } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          metaEvent: { key: 'value' },
        })
      );
    });
  });

  describe('sendSessionStarted', () => {
    it('should emit sessionStarted event', () => {
      const { emitSpy, session } = createManagerWithSession();

      session.sendSessionStarted();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          sessionStarted: {},
        })
      );
    });

    it('should throw after session ended', () => {
      const { session } = createManagerWithSession();
      session.sendSessionEnd();

      expect(() => session.sendSessionStarted()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendSessionEnd', () => {
    it('should mark session as ended and emit endSession event', () => {
      const { emitSpy, session } = createManagerWithSession();

      session.sendSessionEnd();

      expect(session.ended).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          endSession: {},
        })
      );
    });

    it('should delete session from manager', () => {
      const { manager, session } = createManagerWithSession();

      session.sendSessionEnd();

      expect(manager.getSession(CONVERSATION_ID)).toBeUndefined();
    });

    it('should throw if already ended', () => {
      const { session } = createManagerWithSession();
      session.sendSessionEnd();

      expect(() => session.sendSessionEnd()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('startExchange', () => {
    it('should create exchange and emit startExchange event', () => {
      const { emitSpy, session } = createManagerWithSession();

      const exchange = session.startExchange({ exchangeId: 'ex-1' });

      expect(exchange).toBeDefined();
      expect(exchange.exchangeId).toBe('ex-1');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          exchange: expect.objectContaining({
            exchangeId: 'ex-1',
            startExchange: expect.any(Object),
          }),
        })
      );
    });

    it('should auto-generate exchangeId when not provided', () => {
      const { session } = createManagerWithSession();

      const exchange = session.startExchange();

      expect(exchange.exchangeId).toBeDefined();
      expect(typeof exchange.exchangeId).toBe('string');
    });

    it('should auto-end exchange when callback is provided', async () => {
      const { emitSpy, session } = createManagerWithSession();

      await session.startExchange({ exchangeId: 'ex-cb' }, async (exchange) => {
        exchange.startMessage({ role: MessageRole.User });
      });

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.endExchange !== undefined
      );
      expect(endCall).toBeDefined();
    });

    it('should set properties on exchange when provided', () => {
      const { session } = createManagerWithSession();

      const exchange = session.startExchange({
        exchangeId: 'ex-p',
        properties: { custom: 'val' },
      });

      expect(exchange.getProperties<{ custom: string }>().custom).toBe('val');
    });

    it('should throw after session ended', () => {
      const { session } = createManagerWithSession();
      session.sendSessionEnd();

      expect(() => session.startExchange()).toThrow(ConversationEventInvalidOperationError);
    });

    it('should support shorthand with just callback (no options)', async () => {
      const { emitSpy, session } = createManagerWithSession();

      await session.startExchange(async (exchange) => {
        expect(exchange).toBeDefined();
        expect(exchange.exchangeId).toBeDefined();
      });

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.endExchange !== undefined
      );
      expect(endCall).toBeDefined();
    });
  });

  describe('exchanges iterator and getExchange', () => {
    it('should iterate over exchanges', () => {
      const { session } = createManagerWithSession();

      session.startExchange({ exchangeId: 'ex-1' });
      session.startExchange({ exchangeId: 'ex-2' });

      const exchanges = Array.from(session.exchanges);
      expect(exchanges).toHaveLength(2);
    });

    it('should get exchange by id', () => {
      const { session } = createManagerWithSession();

      const exchange = session.startExchange({ exchangeId: 'ex-1' });

      expect(session.getExchange('ex-1')).toBe(exchange);
    });

    it('should return undefined for unknown exchange id', () => {
      const { session } = createManagerWithSession();

      expect(session.getExchange('unknown')).toBeUndefined();
    });
  });

  describe('startAsyncInputStream', () => {
    it('should create input stream and emit event', () => {
      const { emitSpy, session } = createManagerWithSession();

      const stream = session.startAsyncInputStream({ streamId: 'stream-1', mimeType: 'audio/wav' });

      expect(stream).toBeDefined();
      expect(stream.streamId).toBe('stream-1');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          asyncInputStream: expect.objectContaining({
            streamId: 'stream-1',
            startAsyncInputStream: expect.any(Object),
          }),
        })
      );
    });

    it('should auto-end input stream when callback is provided', async () => {
      const { emitSpy, session } = createManagerWithSession();

      await session.startAsyncInputStream({ streamId: 'stream-cb', mimeType: 'audio/wav' }, async (stream) => {
        stream.sendChunk({ data: 'test' });
      });

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.asyncInputStream?.endAsyncInputStream !== undefined
      );
      expect(endCall).toBeDefined();
    });

    it('should get input stream by id', () => {
      const { session } = createManagerWithSession();

      const stream = session.startAsyncInputStream({ streamId: 'stream-1', mimeType: 'audio/wav' });

      expect(session.getAsyncInputStream('stream-1')).toBe(stream);
    });

    it('should set properties on input stream when provided', () => {
      const { session } = createManagerWithSession();

      const stream = session.startAsyncInputStream({
        streamId: 'stream-props',
        mimeType: 'audio/wav',
        properties: { format: 'wav', sampleRate: 44100 },
      });

      expect(stream.getProperties<any>().format).toBe('wav');
      expect(stream.getProperties<any>().sampleRate).toBe(44100);
    });

    it('should auto-generate streamId when not provided', () => {
      const { session } = createManagerWithSession();

      const stream = session.startAsyncInputStream({ mimeType: 'audio/wav' });

      expect(stream.streamId).toBeDefined();
      expect(typeof stream.streamId).toBe('string');
    });
  });

  describe('startAsyncToolCall', () => {
    it('should create async tool call and emit event', () => {
      const { emitSpy, session } = createManagerWithSession();

      const toolCall = session.startAsyncToolCall({ toolCallId: 'tc-1', toolName: 'search' });

      expect(toolCall).toBeDefined();
      expect(toolCall.toolCallId).toBe('tc-1');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          asyncToolCall: expect.objectContaining({
            toolCallId: 'tc-1',
            startToolCall: expect.objectContaining({ toolName: 'search' }),
          }),
        })
      );
    });

    it('should auto-end async tool call when callback is provided', async () => {
      const { emitSpy, session } = createManagerWithSession();

      await session.startAsyncToolCall({ toolCallId: 'tc-cb', toolName: 'search' }, async () => {});

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.asyncToolCall?.endToolCall !== undefined
      );
      expect(endCall).toBeDefined();
    });

    it('should get async tool call by id', () => {
      const { session } = createManagerWithSession();

      const toolCall = session.startAsyncToolCall({ toolCallId: 'tc-1', toolName: 'search' });

      expect(session.getAsyncToolCall('tc-1')).toBe(toolCall);
    });

    it('should set properties on async tool call when provided', () => {
      const { session } = createManagerWithSession();

      const toolCall = session.startAsyncToolCall({
        toolCallId: 'tc-props',
        toolName: 'search',
        properties: { retryCount: 3, timeout: 5000 },
      });

      expect(toolCall.getProperties<any>().retryCount).toBe(3);
      expect(toolCall.getProperties<any>().timeout).toBe(5000);
    });

    it('should auto-generate toolCallId when not provided', () => {
      const { session } = createManagerWithSession();

      const toolCall = session.startAsyncToolCall({ toolName: 'search' });

      expect(toolCall.toolCallId).toBeDefined();
      expect(typeof toolCall.toolCallId).toBe('string');
    });
  });

  describe('dispatch', () => {
    it('should dispatch sessionStarted to handlers', () => {
      const { manager, session } = createManagerWithSession();
      const startedSpy = vi.fn();
      session.onSessionStarted(startedSpy);

      manager.dispatch({ conversationId: CONVERSATION_ID, sessionStarted: {} });

      expect(startedSpy).toHaveBeenCalledWith({});
    });

    it('should dispatch sessionEnding to handlers', () => {
      const { manager, session } = createManagerWithSession();
      const endingSpy = vi.fn();
      session.onSessionEnding(endingSpy);

      manager.dispatch({ conversationId: CONVERSATION_ID, sessionEnding: { timeToLiveMS: 30000 } });

      expect(endingSpy).toHaveBeenCalledWith({ timeToLiveMS: 30000 });
    });

    it('should dispatch endSession and mark ended', () => {
      const { manager, session } = createManagerWithSession();
      const endSpy = vi.fn();
      session.onSessionEnd(endSpy);

      manager.dispatch({ conversationId: CONVERSATION_ID, endSession: {} });

      expect(endSpy).toHaveBeenCalled();
      expect(session.ended).toBe(true);
    });

    it('should dispatch exchange events and create exchange helper', () => {
      const { manager, session } = createManagerWithSession();
      const exchangeStartSpy = vi.fn();
      session.onExchangeStart(exchangeStartSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        exchange: {
          exchangeId: 'ex-disp',
          startExchange: {},
        },
      });

      expect(exchangeStartSpy).toHaveBeenCalled();
      expect(session.getExchange('ex-disp')).toBeDefined();
    });

    it('should dispatch asyncInputStream events and create stream helper', () => {
      const { manager, session } = createManagerWithSession();
      const streamStartSpy = vi.fn();
      session.onInputStreamStart(streamStartSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        asyncInputStream: {
          streamId: 'stream-disp',
          startAsyncInputStream: { mimeType: 'audio/wav' },
        },
      });

      expect(streamStartSpy).toHaveBeenCalled();
    });

    it('should dispatch asyncToolCall events and create tool call helper', () => {
      const { manager, session } = createManagerWithSession();
      const toolCallStartSpy = vi.fn();
      session.onAsyncToolCallStart(toolCallStartSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        asyncToolCall: {
          toolCallId: 'tc-disp',
          startToolCall: { toolName: 'calc' },
        },
      });

      expect(toolCallStartSpy).toHaveBeenCalled();
    });

    it('should dispatch metaEvent to handlers', () => {
      const { manager, session } = createManagerWithSession();
      const metaSpy = vi.fn();
      session.onMetaEvent(metaSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        metaEvent: { info: 'test' },
      });

      expect(metaSpy).toHaveBeenCalledWith({ info: 'test' });
    });

    it('should dispatch labelUpdated to handlers', () => {
      const { manager, session } = createManagerWithSession();
      const labelSpy = vi.fn();
      session.onLabelUpdated(labelSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        labelUpdated: { label: 'New Label', autogenerated: false },
      });

      expect(labelSpy).toHaveBeenCalledWith({ label: 'New Label', autogenerated: false });
    });

    it('should dispatch conversationError start to error handlers', () => {
      const { manager, session } = createManagerWithSession();
      const errorSpy = vi.fn();
      session.onErrorStart(errorSpy);
      manager.onUnhandledErrorStart(vi.fn());

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        conversationError: {
          errorId: 'err-1',
          startError: { message: 'fail' },
        },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'err-1', message: 'fail' })
      );
    });

    it('should dispatch conversationError end to error handlers', () => {
      const { manager, session } = createManagerWithSession();
      const errorEndSpy = vi.fn();
      session.onErrorEnd(errorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        conversationError: {
          errorId: 'err-1',
          endError: {},
        },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'err-1' })
      );
    });

    it('should ignore events for different conversationId', () => {
      const { session } = createManagerWithSession();
      const metaSpy = vi.fn();
      session.onMetaEvent(metaSpy);

      session.dispatch({
        conversationId: 'other-conv-id',
        metaEvent: { key: 'val' },
      });

      expect(metaSpy).not.toHaveBeenCalled();
    });
  });

  describe('handler unregistration', () => {
    it('should unregister onSessionStarted handler', () => {
      const { manager, session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onSessionStarted(handler);

      manager.dispatch({ conversationId: CONVERSATION_ID, sessionStarted: {} });
      expect(handler).toHaveBeenCalledTimes(1);

      cleanup();
      manager.dispatch({ conversationId: CONVERSATION_ID, sessionStarted: {} });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should unregister onSessionEnding handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onSessionEnding(handler);

      cleanup();
      expect((session as any)._sessionEndingHandlers).toHaveLength(0);
    });

    it('should unregister onSessionEnd handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onSessionEnd(handler);

      cleanup();
      expect((session as any)._sessionEndHandlers).toHaveLength(0);
    });

    it('should unregister onExchangeStart handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onExchangeStart(handler);

      cleanup();
      expect((session as any)._exchangeStartHandlers).toHaveLength(0);
    });

    it('should unregister onInputStreamStart handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onInputStreamStart(handler);

      cleanup();
      expect((session as any)._inputStreamStartHandlers).toHaveLength(0);
    });

    it('should unregister onAsyncToolCallStart handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onAsyncToolCallStart(handler);

      cleanup();
      expect((session as any)._asyncToolCallStartHandlers).toHaveLength(0);
    });

    it('should unregister onLabelUpdated handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onLabelUpdated(handler);

      cleanup();
      expect((session as any)._labelUpdatedHandlers).toHaveLength(0);
    });

    it('should unregister onAnyErrorStart handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onAnyErrorStart(handler);

      cleanup();
      expect((session as any)._anyErrorStartHandlers).toHaveLength(0);
    });

    it('should unregister onAnyErrorEnd handler', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onAnyErrorEnd(handler);

      cleanup();
      expect((session as any)._anyErrorEndHandlers).toHaveLength(0);
    });

    it('should unregister onDeleted handler correctly', () => {
      const { session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onDeleted(handler);

      cleanup();
      session.delete();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should not be paused initially', () => {
      const { session } = createManagerWithSession();
      expect(session.isPaused).toBe(false);
    });

    it('should buffer events when paused', () => {
      const { manager, session } = createManagerWithSession();
      const metaSpy = vi.fn();
      session.onMetaEvent(metaSpy);

      session.pause();
      expect(session.isPaused).toBe(true);

      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { key: 'buffered' } });
      expect(metaSpy).not.toHaveBeenCalled();

      session.resume();
      expect(session.isPaused).toBe(false);
      expect(metaSpy).toHaveBeenCalledWith({ key: 'buffered' });
    });

    it('should process multiple buffered events on resume', () => {
      const { manager, session } = createManagerWithSession();
      const metaSpy = vi.fn();
      session.onMetaEvent(metaSpy);

      session.pause();
      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { n: 1 } });
      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { n: 2 } });
      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { n: 3 } });

      session.resume();

      expect(metaSpy).toHaveBeenCalledTimes(3);
    });

    it('should buffer session end event when paused', () => {
      const { manager, session } = createManagerWithSession();
      const endSpy = vi.fn();
      session.onSessionEnd(endSpy);

      session.pause();
      manager.dispatch({ conversationId: CONVERSATION_ID, endSession: {} });
      expect(endSpy).not.toHaveBeenCalled();

      session.resume();
      expect(endSpy).toHaveBeenCalled();
    });

    it('should allow multiple pause calls without error', () => {
      const { session } = createManagerWithSession();

      session.pause();
      session.pause();
      session.pause();

      expect(session.isPaused).toBe(true);
    });

    it('should allow resume when not paused', () => {
      const { session } = createManagerWithSession();

      session.resume();

      expect(session.isPaused).toBe(false);
    });

    it('should maintain event order when buffering', () => {
      const { manager, session } = createManagerWithSession();
      const events: any[] = [];
      session.onMetaEvent((e: any) => events.push({ type: 'meta', ...e }));
      session.onSessionStarted(() => events.push({ type: 'started' }));

      session.pause();
      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { n: 1 } });
      manager.dispatch({ conversationId: CONVERSATION_ID, sessionStarted: {} });
      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { n: 2 } });

      session.resume();

      expect(events).toHaveLength(3);
      expect(events[0]).toEqual(expect.objectContaining({ type: 'meta', n: 1 }));
      expect(events[1]).toEqual({ type: 'started' });
      expect(events[2]).toEqual(expect.objectContaining({ type: 'meta', n: 2 }));
    });

    it('should process exchange start events when resumed', () => {
      const { manager, session } = createManagerWithSession();
      const exchangeStartSpy = vi.fn();
      session.onExchangeStart(exchangeStartSpy);

      session.pause();
      manager.dispatch({
        conversationId: CONVERSATION_ID,
        exchange: { exchangeId: 'paused-ex', startExchange: {} },
      });
      expect(exchangeStartSpy).not.toHaveBeenCalled();

      session.resume();
      expect(exchangeStartSpy).toHaveBeenCalled();
    });

    it('should buffer echoed events when paused in echo mode', () => {
      const { session } = createManagerWithSession(true);
      const metaSpy = vi.fn();
      session.onMetaEvent(metaSpy);

      session.pause();
      session.sendMetaEvent({ buffered: true });
      expect(metaSpy).not.toHaveBeenCalled();

      session.resume();
      expect(metaSpy).toHaveBeenCalledTimes(1);
      expect(metaSpy).toHaveBeenCalledWith({ buffered: true });
    });

    it('should process input stream start events when resumed', () => {
      const { manager, session } = createManagerWithSession();
      const streamStartSpy = vi.fn();
      session.onInputStreamStart(streamStartSpy);

      session.pause();
      manager.dispatch({
        conversationId: CONVERSATION_ID,
        asyncInputStream: {
          streamId: 'paused-stream',
          startAsyncInputStream: { mimeType: 'audio/wav' },
        },
      });
      expect(streamStartSpy).not.toHaveBeenCalled();

      session.resume();
      expect(streamStartSpy).toHaveBeenCalledTimes(1);
    });

    it('should process async tool call start events when resumed', () => {
      const { manager, session } = createManagerWithSession();
      const tcStartSpy = vi.fn();
      session.onAsyncToolCallStart(tcStartSpy);

      session.pause();
      manager.dispatch({
        conversationId: CONVERSATION_ID,
        asyncToolCall: {
          toolCallId: 'paused-tc',
          startToolCall: { toolName: 'search' },
        },
      });
      expect(tcStartSpy).not.toHaveBeenCalled();

      session.resume();
      expect(tcStartSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('pauseEmits and resumeEmits', () => {
    it('should buffer emitted events when paused', () => {
      const { emitSpy, session } = createManagerWithSession();

      session.pauseEmits();
      expect(session.isEmitPaused).toBe(true);

      session.sendMetaEvent({ key: 'paused-emit' });
      expect(emitSpy).not.toHaveBeenCalled();

      session.resumeEmits();
      expect(session.isEmitPaused).toBe(false);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          metaEvent: { key: 'paused-emit' },
        })
      );
    });
  });

  describe('echo mode', () => {
    it('should dispatch echoed exchange start events to handlers in echo mode', () => {
      const { session } = createManagerWithSession(true);
      const exchangeStartSpy = vi.fn();
      session.onExchangeStart(exchangeStartSpy);

      session.startExchange({ exchangeId: 'echo-ex' });

      expect(exchangeStartSpy).toHaveBeenCalled();
    });

    it('should not dispatch echoed events when echo is off', () => {
      const { session } = createManagerWithSession(false);
      const exchangeStartSpy = vi.fn();
      session.onExchangeStart(exchangeStartSpy);

      session.startExchange({ exchangeId: 'no-echo-ex' });

      expect(exchangeStartSpy).not.toHaveBeenCalled();
    });

    it('should echo sessionStarted events', () => {
      const { session } = createManagerWithSession(true);
      const startedSpy = vi.fn();
      session.onSessionStarted(startedSpy);

      session.sendSessionStarted();

      expect(startedSpy).toHaveBeenCalledWith({});
    });

    it('should echo meta events', () => {
      const { session } = createManagerWithSession(true);
      const metaSpy = vi.fn();
      session.onMetaEvent(metaSpy);

      session.sendMetaEvent({ key: 'echo-meta' });

      expect(metaSpy).toHaveBeenCalledWith({ key: 'echo-meta' });
    });

    it('should echo session end events', () => {
      const { session } = createManagerWithSession(true);
      const endSpy = vi.fn();
      session.onSessionEnd(endSpy);

      session.sendSessionEnd();

      expect(endSpy).toHaveBeenCalled();
    });

    it('should echo error start events', () => {
      const { session } = createManagerWithSession(true);
      const errorSpy = vi.fn();
      session.onErrorStart(errorSpy);

      session.sendErrorStart({ errorId: 'echo-err', message: 'echo error' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'echo-err' })
      );
    });

    it('should echo error end events', () => {
      const { manager, session } = createManagerWithSession(true);
      const errorEndSpy = vi.fn();
      session.onErrorEnd(errorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());

      session.sendErrorStart({ errorId: 'echo-err', message: 'err' });
      session.sendErrorEnd({ errorId: 'echo-err' });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'echo-err' })
      );
    });

    it('should echo input stream start events', () => {
      const { session } = createManagerWithSession(true);
      const streamStartSpy = vi.fn();
      session.onInputStreamStart(streamStartSpy);

      session.startAsyncInputStream({ streamId: 'echo-stream', mimeType: 'audio/wav' });

      expect(streamStartSpy).toHaveBeenCalled();
    });

    it('should echo async tool call start events', () => {
      const { session } = createManagerWithSession(true);
      const tcStartSpy = vi.fn();
      session.onAsyncToolCallStart(tcStartSpy);

      session.startAsyncToolCall({ toolCallId: 'echo-tc', toolName: 'search' });

      expect(tcStartSpy).toHaveBeenCalled();
    });

    it('should handle deeply nested events with echo enabled', () => {
      const { session } = createManagerWithSession(true);
      const exchangeStartSpy = vi.fn();
      session.onExchangeStart(exchangeStartSpy);

      session.startExchange({ exchangeId: 'deep-ex' });

      expect(exchangeStartSpy).toHaveBeenCalled();
      const echoedExchange = exchangeStartSpy.mock.calls[0][0];
      expect(echoedExchange.exchangeId).toBe('deep-ex');
    });

    it('should properly update errors map when echo dispatches error events', () => {
      const { manager, session } = createManagerWithSession(true);
      manager.onUnhandledErrorStart(vi.fn());

      session.sendErrorStart({ errorId: 'echo-map-err', message: 'test' });

      expect(session.hasError).toBe(true);
      expect(session.errors.has('echo-map-err')).toBe(true);
    });

    it('should emit and dispatch independently in echo mode', () => {
      const { emitSpy, session } = createManagerWithSession(true);
      const metaSpy = vi.fn();
      session.onMetaEvent(metaSpy);

      session.sendMetaEvent({ key: 'independent' });

      // Both emit and dispatch should have been called
      expect(emitSpy).toHaveBeenCalled();
      expect(metaSpy).toHaveBeenCalledWith({ key: 'independent' });
    });

    it('should echo sessionEnding events', () => {
      const { session } = createManagerWithSession(true);
      const endingSpy = vi.fn();
      session.onSessionEnding(endingSpy);

      session.dispatch({
        conversationId: CONVERSATION_ID,
        sessionEnding: { timeToLiveMS: 30000 },
      });

      expect(endingSpy).toHaveBeenCalledWith({ timeToLiveMS: 30000 });
    });
  });

  describe('sendErrorStart and sendErrorEnd', () => {
    it('should emit conversation error start event', () => {
      const { emitSpy, session } = createManagerWithSession();

      session.sendErrorStart({ errorId: 'se-1', message: 'session error' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          conversationError: expect.objectContaining({
            errorId: 'se-1',
            startError: expect.objectContaining({ message: 'session error' }),
          }),
        })
      );
      expect(session.hasError).toBe(true);
    });

    it('should emit conversation error end event and clear error', () => {
      const { emitSpy, session } = createManagerWithSession();

      session.sendErrorStart({ errorId: 'se-1', message: 'session error' });
      emitSpy.mockClear();
      session.sendErrorEnd({ errorId: 'se-1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          conversationError: expect.objectContaining({
            errorId: 'se-1',
            endError: expect.any(Object),
          }),
        })
      );
      expect(session.hasError).toBe(false);
    });
  });

  describe('sendMetaEvent', () => {
    it('should emit meta event', () => {
      const { emitSpy, session } = createManagerWithSession();

      session.sendMetaEvent({ key: 'meta-val' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          metaEvent: { key: 'meta-val' },
        })
      );
    });

    it('should throw after ended', () => {
      const { session } = createManagerWithSession();
      session.sendSessionEnd();

      expect(() => session.sendMetaEvent({ key: 'val' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('deleteChildren', () => {
    it('should delete all child exchanges on session delete', () => {
      const { session } = createManagerWithSession();
      const exchange = session.startExchange({ exchangeId: 'ex-del' });
      const deletedSpy = vi.fn();
      exchange.onDeleted(deletedSpy);

      session.delete();

      expect(deletedSpy).toHaveBeenCalled();
      expect(session.deleted).toBe(true);
    });

    it('should delete all child input streams on session delete', () => {
      const { session } = createManagerWithSession();
      const stream = session.startAsyncInputStream({ streamId: 'stream-del', mimeType: 'audio/wav' });
      const deletedSpy = vi.fn();
      stream.onDeleted(deletedSpy);

      session.delete();

      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should delete all child async tool calls on session delete', () => {
      const { session } = createManagerWithSession();
      const tc = session.startAsyncToolCall({ toolCallId: 'tc-del', toolName: 'search' });
      const deletedSpy = vi.fn();
      tc.onDeleted(deletedSpy);

      session.delete();

      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should delete all children types together', () => {
      const { session } = createManagerWithSession();
      const exchange = session.startExchange({ exchangeId: 'ex-del' });
      const stream = session.startAsyncInputStream({ streamId: 'stream-del', mimeType: 'audio/wav' });
      const tc = session.startAsyncToolCall({ toolCallId: 'tc-del', toolName: 'calc' });
      const spies = [vi.fn(), vi.fn(), vi.fn()];
      exchange.onDeleted(spies[0]);
      stream.onDeleted(spies[1]);
      tc.onDeleted(spies[2]);

      session.delete();

      spies.forEach(spy => expect(spy).toHaveBeenCalled());
    });
  });

  describe('error scope', () => {
    it('should report inErrorScope as false when no errors', () => {
      const { session } = createManagerWithSession();
      expect(session.inErrorScope).toBe(false);
    });

    it('should report inErrorScope as true when has error', () => {
      const { session } = createManagerWithSession();
      session.sendErrorStart({ errorId: 'e1', message: 'err' });
      expect(session.inErrorScope).toBe(true);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { session } = createManagerWithSession();
      expect(session.toString()).toBe(`SessionEventHelper(${CONVERSATION_ID})`);
    });
  });

  describe('replay', () => {
    it('should replay historical exchanges through dispatch', () => {
      const { session } = createManagerWithSession();
      const exchangeStartSpy = vi.fn();
      session.onExchangeStart(exchangeStartSpy);

      session.replay([
        {
          exchangeId: 'replay-ex-1',
          createdTime: '2024-01-01T00:00:00Z',
          messages: [
            {
              messageId: 'replay-msg-1',
              role: MessageRole.User,
              createdTime: '2024-01-01T00:00:01Z',
              contentParts: [
                {
                  contentPartId: 'replay-cp-1',
                  mimeType: 'text/plain',
                  data: { inline: 'Hello' },
                  citations: [],
                  createdTime: '2024-01-01T00:00:01Z',
                },
              ],
              toolCalls: [],
            },
          ],
        } as any,
      ]);

      expect(exchangeStartSpy).toHaveBeenCalled();
    });
  });

  describe('onAnyErrorStart at session level', () => {
    it('should capture session-level errors', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);
      manager.onUnhandledErrorStart(vi.fn());

      session.dispatch({
        conversationId: CONVERSATION_ID,
        conversationError: { errorId: 'se-1', startError: { message: 'session error' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'se-1' })
      );
    });

    it('should capture exchange-level errors', () => {
      const { session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);

      const exchange = session.startExchange({ exchangeId: 'ex-err' });
      (exchange as any).dispatch({
        exchangeId: 'ex-err',
        exchangeError: { errorId: 'exe-1', startError: { message: 'exchange error' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'exe-1' })
      );
    });

    it('should capture message-level errors', () => {
      const { session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      const message = exchange.startMessage({ messageId: 'msg-1', role: MessageRole.User });
      (message as any).dispatch({
        messageId: 'msg-1',
        messageError: { errorId: 'mse-1', startError: { message: 'message error' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'mse-1' })
      );
    });

    it('should support multiple handlers', () => {
      const { session } = createManagerWithSession();
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      session.onAnyErrorStart(spy1);
      session.onAnyErrorStart(spy2);

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      (exchange as any).dispatch({
        exchangeId: 'ex-1',
        exchangeError: { errorId: 'exe-1', startError: { message: 'err' } },
      });

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });

    it('should support cleanup', () => {
      const { manager, session } = createManagerWithSession();
      const spy = vi.fn();
      const cleanup = session.onAnyErrorStart(spy);
      manager.onUnhandledErrorStart(vi.fn());

      cleanup();

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      (exchange as any).dispatch({
        exchangeId: 'ex-1',
        exchangeError: { errorId: 'exe-1', startError: { message: 'err' } },
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should capture content-part-level errors', () => {
      const { session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      const message = exchange.startMessage({ messageId: 'msg-1', role: MessageRole.Assistant });
      const cp = message.startContentPart({ contentPartId: 'cp-1', mimeType: 'text/plain' });
      (cp as any).dispatch({
        contentPartId: 'cp-1',
        contentPartError: { errorId: 'cpe-1', startError: { message: 'cp error' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'cpe-1' })
      );
    });

    it('should capture input-stream-level errors', () => {
      const { session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);

      const stream = session.startAsyncInputStream({ streamId: 'stream-1', mimeType: 'audio/wav' });
      (stream as any).dispatch({
        streamId: 'stream-1',
        asyncInputStreamError: { errorId: 'ise-1', startError: { message: 'stream error' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ise-1' })
      );
    });

    it('should capture async-tool-call-level errors', () => {
      const { session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);

      const tc = session.startAsyncToolCall({ toolCallId: 'tc-1', toolName: 'search' });
      (tc as any).dispatch({
        toolCallId: 'tc-1',
        toolCallError: { errorId: 'atce-1', startError: { message: 'tc error' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'atce-1' })
      );
    });

    it('should not prevent local error handlers from being called', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      const localErrorSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);
      session.onErrorStart(localErrorSpy);
      manager.onUnhandledErrorStart(vi.fn());

      session.dispatch({
        conversationId: CONVERSATION_ID,
        conversationError: { errorId: 'err-both', startError: { message: 'both' } },
      });

      expect(localErrorSpy).toHaveBeenCalledWith(expect.objectContaining({ errorId: 'err-both' }));
      expect(anyErrorSpy).toHaveBeenCalledWith(expect.objectContaining({ errorId: 'err-both' }));
    });

    it('should prevent unhandled error handler when session anyErrorStart is registered', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorSpy = vi.fn();
      const unhandledSpy = vi.fn();
      session.onAnyErrorStart(anyErrorSpy);
      manager.onUnhandledErrorStart(unhandledSpy);
      // NOTE: no local onErrorStart registered

      session.dispatch({
        conversationId: CONVERSATION_ID,
        conversationError: { errorId: 'err-any-handled', startError: { message: 'handled by any' } },
      });

      expect(anyErrorSpy).toHaveBeenCalled();
      expect(unhandledSpy).not.toHaveBeenCalled();
    });
  });

  describe('onAnyErrorEnd at session level', () => {
    it('should capture exchange-level error ends', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorEndSpy = vi.fn();
      session.onAnyErrorEnd(anyErrorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());

      const exchange = session.startExchange({ exchangeId: 'ex-err' });
      (exchange as any).dispatch({
        exchangeId: 'ex-err',
        exchangeError: { errorId: 'exe-1', startError: { message: 'err' } },
      });
      (exchange as any).dispatch({
        exchangeId: 'ex-err',
        exchangeError: { errorId: 'exe-1', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'exe-1' })
      );
    });

    it('should support cleanup', () => {
      const { session } = createManagerWithSession();
      const spy = vi.fn();
      const cleanup = session.onAnyErrorEnd(spy);

      cleanup();

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      (exchange as any).dispatch({
        exchangeId: 'ex-1',
        exchangeError: { errorId: 'exe-1', endError: {} },
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('should capture message-level error ends', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorEndSpy = vi.fn();
      session.onAnyErrorEnd(anyErrorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      const message = exchange.startMessage({ messageId: 'msg-1', role: MessageRole.User });
      (message as any).dispatch({
        messageId: 'msg-1',
        messageError: { errorId: 'mse-1', startError: { message: 'err' } },
      });
      (message as any).dispatch({
        messageId: 'msg-1',
        messageError: { errorId: 'mse-1', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'mse-1' })
      );
    });

    it('should capture input-stream-level error ends', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorEndSpy = vi.fn();
      session.onAnyErrorEnd(anyErrorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());

      const stream = session.startAsyncInputStream({ streamId: 'stream-1', mimeType: 'audio/wav' });
      (stream as any).dispatch({
        streamId: 'stream-1',
        asyncInputStreamError: { errorId: 'ise-1', startError: { message: 'err' } },
      });
      (stream as any).dispatch({
        streamId: 'stream-1',
        asyncInputStreamError: { errorId: 'ise-1', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ise-1' })
      );
    });

    it('should support multiple handlers', () => {
      const { manager, session } = createManagerWithSession();
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      session.onAnyErrorEnd(spy1);
      session.onAnyErrorEnd(spy2);
      manager.onUnhandledErrorStart(vi.fn());

      const exchange = session.startExchange({ exchangeId: 'ex-1' });
      (exchange as any).dispatch({
        exchangeId: 'ex-1',
        exchangeError: { errorId: 'exe-1', startError: { message: 'err' } },
      });
      (exchange as any).dispatch({
        exchangeId: 'ex-1',
        exchangeError: { errorId: 'exe-1', endError: {} },
      });

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
    });

    it('should not prevent local error end handlers from being called', () => {
      const { manager, session } = createManagerWithSession();
      const anyErrorEndSpy = vi.fn();
      const localErrorEndSpy = vi.fn();
      session.onAnyErrorEnd(anyErrorEndSpy);
      session.onErrorEnd(localErrorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());

      session.dispatch({
        conversationId: CONVERSATION_ID,
        conversationError: { errorId: 'err-both-end', startError: { message: 'err' } },
      });
      session.dispatch({
        conversationId: CONVERSATION_ID,
        conversationError: { errorId: 'err-both-end', endError: {} },
      });

      expect(localErrorEndSpy).toHaveBeenCalledWith(expect.objectContaining({ errorId: 'err-both-end' }));
      expect(anyErrorEndSpy).toHaveBeenCalledWith(expect.objectContaining({ errorId: 'err-both-end' }));
    });
  });

  describe('onSessionEnding lifecycle', () => {
    it('should fire onSessionEnding handler', () => {
      const { manager, session } = createManagerWithSession();
      const endingSpy = vi.fn();
      session.onSessionEnding(endingSpy);

      manager.dispatch({ conversationId: CONVERSATION_ID, sessionEnding: { timeToLiveMS: 30000 } });

      expect(endingSpy).toHaveBeenCalledWith({ timeToLiveMS: 30000 });
    });

    it('should support cleanup for onSessionEnding', () => {
      const { manager, session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onSessionEnding(handler);

      cleanup();
      manager.dispatch({ conversationId: CONVERSATION_ID, sessionEnding: { timeToLiveMS: 30000 } });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not fire onSessionEnding when not present in event', () => {
      const { manager, session } = createManagerWithSession();
      const endingSpy = vi.fn();
      session.onSessionEnding(endingSpy);

      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { key: 'val' } });

      expect(endingSpy).not.toHaveBeenCalled();
    });

    it('should buffer sessionEnding when paused', () => {
      const { manager, session } = createManagerWithSession();
      const endingSpy = vi.fn();
      session.onSessionEnding(endingSpy);

      session.pause();
      manager.dispatch({ conversationId: CONVERSATION_ID, sessionEnding: { timeToLiveMS: 30000 } });
      expect(endingSpy).not.toHaveBeenCalled();

      session.resume();
      expect(endingSpy).toHaveBeenCalled();
    });

    it('should only fire for matching conversationId', () => {
      const { session } = createManagerWithSession();
      const endingSpy = vi.fn();
      session.onSessionEnding(endingSpy);

      session.dispatch({
        conversationId: 'different-conv-id',
        sessionEnding: { timeToLiveMS: 30000 },
      });

      expect(endingSpy).not.toHaveBeenCalled();

      session.dispatch({
        conversationId: CONVERSATION_ID,
        sessionEnding: { timeToLiveMS: 30000 },
      });

      expect(endingSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onLabelUpdated lifecycle', () => {
    it('should fire handler when labelUpdated present', () => {
      const { manager, session } = createManagerWithSession();
      const labelSpy = vi.fn();
      session.onLabelUpdated(labelSpy);

      manager.dispatch({
        conversationId: CONVERSATION_ID,
        labelUpdated: { label: 'Test', autogenerated: false },
      });

      expect(labelSpy).toHaveBeenCalledWith({ label: 'Test', autogenerated: false });
    });

    it('should support cleanup for onLabelUpdated', () => {
      const { manager, session } = createManagerWithSession();
      const handler = vi.fn();
      const cleanup = session.onLabelUpdated(handler);

      cleanup();
      manager.dispatch({
        conversationId: CONVERSATION_ID,
        labelUpdated: { label: 'Test', autogenerated: false },
      });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should not fire when labelUpdated not present', () => {
      const { manager, session } = createManagerWithSession();
      const labelSpy = vi.fn();
      session.onLabelUpdated(labelSpy);

      manager.dispatch({ conversationId: CONVERSATION_ID, metaEvent: { key: 'val' } });

      expect(labelSpy).not.toHaveBeenCalled();
    });

    it('should only fire for matching conversationId', () => {
      const { session } = createManagerWithSession();
      const labelSpy = vi.fn();
      session.onLabelUpdated(labelSpy);

      session.dispatch({
        conversationId: 'other-conv',
        labelUpdated: { label: 'Other', autogenerated: false },
      });

      expect(labelSpy).not.toHaveBeenCalled();
    });
  });

  describe('error start/end lifecycle', () => {
    it('should track error lifecycle through start and end', () => {
      const { manager, session } = createManagerWithSession(true);
      const startSpy = vi.fn();
      const endSpy = vi.fn();
      session.onAnyErrorStart(startSpy);
      session.onAnyErrorEnd(endSpy);
      manager.onUnhandledErrorStart(vi.fn());

      const exchange = session.startExchange({ exchangeId: 'lifecycle-ex' });
      exchange.sendErrorStart({ errorId: 'lifecycle-err', message: 'started' });

      expect(startSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'lifecycle-err' })
      );

      exchange.sendErrorEnd({ errorId: 'lifecycle-err' });

      expect(endSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'lifecycle-err' })
      );
    });
  });
});
