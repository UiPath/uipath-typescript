// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';
import { AsyncToolCallEventHelperImpl } from '@/services/conversational-agent/helpers/session-tool-call-event-helper';
import {
  ConversationEventInvalidOperationError,
  ConversationEventValidationError,
} from '@/services/conversational-agent/helpers/conversation-event-helper-common';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';
const TOOL_CALL_ID = 'async-tc-1';

// ===== HELPERS =====
const createAsyncToolCall = () => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  manager.onUnhandledErrorStart(vi.fn());
  const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
  const toolCall = session.startAsyncToolCall({ toolCallId: TOOL_CALL_ID, toolName: 'search' }) as AsyncToolCallEventHelperImpl;
  emitSpy.mockClear();
  return { emitSpy, manager, session, toolCall };
};

// ===== TEST SUITE =====
describe('AsyncToolCallEventHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have toolCallId set', () => {
      const { toolCall } = createAsyncToolCall();
      expect(toolCall.toolCallId).toBe(TOOL_CALL_ID);
    });

    it('should have startEvent accessible', () => {
      const { toolCall } = createAsyncToolCall();
      expect(toolCall.startEvent).toBeDefined();
      expect(toolCall.startEvent.toolName).toBe('search');
    });

    it('should reference parent session', () => {
      const { toolCall, session } = createAsyncToolCall();
      expect(toolCall.session).toBe(session);
    });

    it('should have an empty properties object', () => {
      const { toolCall } = createAsyncToolCall();
      expect(toolCall.getProperties()).toEqual({});
    });

    it('should allow storing and retrieving custom properties', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.setProperties({ executionId: 'abc', retryCount: 3 });
      expect(toolCall.getProperties<any>().executionId).toBe('abc');
      expect(toolCall.getProperties<any>().retryCount).toBe(3);
    });
  });

  describe('emit', () => {
    it('should emit async tool call event through session', () => {
      const { emitSpy, toolCall } = createAsyncToolCall();

      toolCall.emit({ metaEvent: { key: 'val' } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          asyncToolCall: expect.objectContaining({
            toolCallId: TOOL_CALL_ID,
            metaEvent: { key: 'val' },
          }),
        })
      );
    });
  });

  describe('sendToolCallEnd', () => {
    it('should mark as ended, emit endToolCall, and delete', () => {
      const { emitSpy, toolCall } = createAsyncToolCall();
      const deletedSpy = vi.fn();
      toolCall.onDeleted(deletedSpy);

      toolCall.sendToolCallEnd();

      expect(toolCall.ended).toBe(true);
      expect(toolCall.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncToolCall: expect.objectContaining({
            toolCallId: TOOL_CALL_ID,
            endToolCall: {},
          }),
        })
      );
    });

    it('should emit end event with result', () => {
      const { emitSpy, toolCall } = createAsyncToolCall();

      toolCall.sendToolCallEnd({ output: 'async result' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncToolCall: expect.objectContaining({
            endToolCall: expect.objectContaining({ output: 'async result' }),
          }),
        })
      );
    });

    it('should emit end event with error flag', () => {
      const { emitSpy, toolCall } = createAsyncToolCall();

      toolCall.sendToolCallEnd({ output: 'error', isError: true });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncToolCall: expect.objectContaining({
            endToolCall: expect.objectContaining({ isError: true }),
          }),
        })
      );
    });

    it('should throw if already ended', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.sendToolCallEnd();

      expect(() => toolCall.sendToolCallEnd()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendMetaEvent', () => {
    it('should emit meta event', () => {
      const { emitSpy, toolCall } = createAsyncToolCall();

      toolCall.sendMetaEvent({ key: 'meta' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncToolCall: expect.objectContaining({
            toolCallId: TOOL_CALL_ID,
            metaEvent: { key: 'meta' },
          }),
        })
      );
    });

    it('should throw after ended', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.sendToolCallEnd();

      expect(() => toolCall.sendMetaEvent({ k: 'v' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('onToolCallEnd handler', () => {
    it('should register and call handler on end', () => {
      const { toolCall } = createAsyncToolCall();
      const endSpy = vi.fn();
      toolCall.onToolCallEnd(endSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        endToolCall: { output: 'async result' },
      });

      expect(endSpy).toHaveBeenCalledWith({ output: 'async result' });
    });

    it('should unregister handler', () => {
      const { toolCall } = createAsyncToolCall();
      const handler = vi.fn();
      const cleanup = toolCall.onToolCallEnd(handler);

      cleanup();
      expect((toolCall as any)._endHandlers).toHaveLength(0);
    });
  });

  describe('dispatch', () => {
    it('should dispatch endToolCall and mark ended', () => {
      const { toolCall } = createAsyncToolCall();
      const endSpy = vi.fn();
      toolCall.onToolCallEnd(endSpy);

      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, endToolCall: {} });

      expect(endSpy).toHaveBeenCalled();
      expect(toolCall.ended).toBe(true);
      expect(toolCall.deleted).toBe(true);
    });

    it('should dispatch metaEvent', () => {
      const { toolCall } = createAsyncToolCall();
      const metaSpy = vi.fn();
      toolCall.onMetaEvent(metaSpy);

      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { key: 'val' } });

      expect(metaSpy).toHaveBeenCalledWith({ key: 'val' });
    });

    it('should dispatch toolCallError start', () => {
      const { toolCall } = createAsyncToolCall();
      const errorSpy = vi.fn();
      toolCall.onErrorStart(errorSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atc-err-1', startError: { message: 'fail' } },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'atc-err-1' })
      );
    });

    it('should ignore events for different toolCallId', () => {
      const { toolCall } = createAsyncToolCall();
      const metaSpy = vi.fn();
      toolCall.onMetaEvent(metaSpy);

      toolCall.dispatch({ toolCallId: 'other-tc', metaEvent: { key: 'val' } });

      expect(metaSpy).not.toHaveBeenCalled();
    });

    it('should buffer events when paused', () => {
      const { toolCall } = createAsyncToolCall();
      const metaSpy = vi.fn();
      toolCall.onMetaEvent(metaSpy);

      toolCall.pause();
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { key: 'buffered' } });
      expect(metaSpy).not.toHaveBeenCalled();

      toolCall.resume();
      expect(metaSpy).toHaveBeenCalledWith({ key: 'buffered' });
    });
  });

  describe('sendErrorStart and sendErrorEnd', () => {
    it('should emit async tool call error start', () => {
      const { emitSpy, toolCall } = createAsyncToolCall();

      toolCall.sendErrorStart({ errorId: 'atce-1', message: 'async fail' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncToolCall: expect.objectContaining({
            toolCallError: expect.objectContaining({
              errorId: 'atce-1',
              startError: expect.objectContaining({ message: 'async fail' }),
            }),
          }),
        })
      );
    });

    it('should emit async tool call error end', () => {
      const { emitSpy, toolCall } = createAsyncToolCall();
      toolCall.sendErrorStart({ errorId: 'atce-1', message: 'err' });
      emitSpy.mockClear();

      toolCall.sendErrorEnd({ errorId: 'atce-1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncToolCall: expect.objectContaining({
            toolCallError: expect.objectContaining({
              errorId: 'atce-1',
              endError: expect.any(Object),
            }),
          }),
        })
      );
    });
  });

  describe('startEventMaybe and startEvent', () => {
    it('should throw ConversationEventValidationError when startEventMaybe is undefined', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;

      const tc = new AsyncToolCallEventHelperImpl(session, 'no-start-atc', undefined);

      expect(tc.startEventMaybe).toBeUndefined();
      expect(() => tc.startEvent).toThrow(ConversationEventValidationError);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { toolCall } = createAsyncToolCall();
      expect(toolCall.toString()).toBe(`AsyncToolCallEventHelper(${TOOL_CALL_ID})`);
    });
  });

  describe('delete functionality', () => {
    it('should delete asyncToolCall and trigger onDeleted handlers', () => {
      const { toolCall } = createAsyncToolCall();
      const deletedSpy = vi.fn();
      toolCall.onDeleted(deletedSpy);

      toolCall.delete();

      expect(toolCall.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should unregister onDeleted handler correctly', () => {
      const { toolCall } = createAsyncToolCall();
      const handler = vi.fn();
      const cleanup = toolCall.onDeleted(handler);

      cleanup();
      toolCall.delete();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should automatically delete when receiving end event via dispatch', () => {
      const { toolCall } = createAsyncToolCall();
      const deletedSpy = vi.fn();
      toolCall.onDeleted(deletedSpy);

      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, endToolCall: {} });

      expect(toolCall.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should not be paused initially', () => {
      const { toolCall } = createAsyncToolCall();
      expect(toolCall.isPaused).toBe(false);
    });

    it('should pause event processing', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.pause();
      expect(toolCall.isPaused).toBe(true);
    });

    it('should process buffered events when resumed', () => {
      const { toolCall } = createAsyncToolCall();
      const metaSpy = vi.fn();
      toolCall.onMetaEvent(metaSpy);

      toolCall.pause();
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { key: 'b1' } });
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { key: 'b2' } });

      toolCall.resume();
      expect(metaSpy).toHaveBeenCalledTimes(2);
    });

    it('should buffer async tool call end event when paused', () => {
      const { toolCall } = createAsyncToolCall();
      const endSpy = vi.fn();
      toolCall.onToolCallEnd(endSpy);

      toolCall.pause();
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, endToolCall: {} });
      expect(endSpy).not.toHaveBeenCalled();

      toolCall.resume();
      expect(endSpy).toHaveBeenCalled();
    });

    it('should allow multiple pause calls without error', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.pause();
      toolCall.pause();
      expect(toolCall.isPaused).toBe(true);
    });

    it('should allow resume when not paused', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.resume();
      expect(toolCall.isPaused).toBe(false);
    });

    it('should maintain event order when buffering', () => {
      const { toolCall } = createAsyncToolCall();
      const events: any[] = [];
      toolCall.onMetaEvent((e: any) => events.push(e));

      toolCall.pause();
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { n: 1 } });
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { n: 2 } });

      toolCall.resume();

      expect(events).toEqual([{ n: 1 }, { n: 2 }]);
    });
  });

  describe('error propagation', () => {
    it('should dispatch error to manager anyErrorStart when local handler exists', () => {
      const { manager, toolCall } = createAsyncToolCall();
      const anyErrorSpy = vi.fn();
      manager.onAnyErrorStart(anyErrorSpy);
      manager.onUnhandledErrorStart(vi.fn());
      toolCall.onErrorStart(vi.fn());

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-1', startError: { message: 'err' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'atce-1' })
      );
    });

    it('should dispatch to unhandled when no local handler exists', () => {
      const { manager, toolCall } = createAsyncToolCall();
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-1', startError: { message: 'unhandled' } },
      });

      expect(unhandledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'atce-1' })
      );
    });

    it('should store errors in errors map on error start', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.onErrorStart(vi.fn());

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-1', startError: { message: 'mapped' } },
      });

      expect(toolCall.hasError).toBe(true);
      expect(toolCall.errors.has('atce-1')).toBe(true);
    });

    it('should remove errors from errors map on error end', () => {
      const { toolCall } = createAsyncToolCall();
      toolCall.onErrorStart(vi.fn());

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-1', startError: { message: 'mapped' } },
      });
      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-1', endError: {} },
      });

      expect(toolCall.hasError).toBe(false);
    });

    it('should unregister error handlers correctly', () => {
      const { manager, toolCall } = createAsyncToolCall();
      const errorSpy = vi.fn();
      const cleanup = toolCall.onErrorStart(errorSpy);
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      cleanup();

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-1', startError: { message: 'after cleanup' } },
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(unhandledSpy).toHaveBeenCalled();
    });

    it('should dispatch error end to local onErrorEnd handler', () => {
      const { toolCall } = createAsyncToolCall();
      const errorEndSpy = vi.fn();
      toolCall.onErrorEnd(errorEndSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-end-1', endError: {} },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'atce-end-1' })
      );
    });

    it('should dispatch error end to manager anyErrorEnd', () => {
      const { manager, toolCall } = createAsyncToolCall();
      const anyErrorEndSpy = vi.fn();
      manager.onAnyErrorEnd(anyErrorEndSpy);
      toolCall.onErrorEnd(vi.fn());

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'atce-any-end', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'atce-any-end' })
      );
    });

    it('should not throw when error end occurs without any handler', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const toolCall = session.startAsyncToolCall({ toolCallId: 'no-handler-tc', toolName: 'search' }) as AsyncToolCallEventHelperImpl;

      expect(() => {
        toolCall.dispatch({
          toolCallId: 'no-handler-tc',
          toolCallError: { errorId: 'atce-nothrow', endError: {} },
        });
      }).not.toThrow();
    });
  });
});
