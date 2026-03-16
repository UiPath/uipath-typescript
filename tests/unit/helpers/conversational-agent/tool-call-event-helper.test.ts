// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';
import { ExchangeEventHelperImpl } from '@/services/conversational-agent/helpers/exchange-event-helper';
import { MessageEventHelperImpl } from '@/services/conversational-agent/helpers/message-event-helper';
import { ToolCallEventHelperImpl } from '@/services/conversational-agent/helpers/tool-call-event-helper';
import {
  ConversationEventInvalidOperationError,
  ConversationEventValidationError,
} from '@/services/conversational-agent/helpers/conversation-event-helper-common';
import { MessageRole } from '@/models/conversational-agent/conversations/types/common.types';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';
const EXCHANGE_ID = 'ex-1';
const MESSAGE_ID = 'msg-1';
const TOOL_CALL_ID = 'tc-1';

// ===== HELPERS =====
const createToolCall = () => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  manager.onUnhandledErrorStart(vi.fn());
  const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
  const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
  const message = exchange.startMessage({ messageId: MESSAGE_ID, role: MessageRole.Assistant }) as MessageEventHelperImpl;
  const toolCall = message.startToolCall({ toolCallId: TOOL_CALL_ID, toolName: 'search' }) as ToolCallEventHelperImpl;
  emitSpy.mockClear();
  return { emitSpy, manager, session, exchange, message, toolCall };
};

// ===== TEST SUITE =====
describe('ToolCallEventHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have toolCallId set', () => {
      const { toolCall } = createToolCall();
      expect(toolCall.toolCallId).toBe(TOOL_CALL_ID);
    });

    it('should have startEvent accessible with timestamp', () => {
      const { toolCall } = createToolCall();
      expect(toolCall.startEvent).toBeDefined();
      expect(toolCall.startEvent.timestamp).toBeDefined();
      expect(toolCall.startEvent.toolName).toBe('search');
    });

    it('should reference parent message', () => {
      const { toolCall, message } = createToolCall();
      expect(toolCall.message).toBe(message);
    });

    it('should have an empty properties object', () => {
      const { toolCall } = createToolCall();
      expect(toolCall.getProperties()).toEqual({});
    });

    it('should allow storing and retrieving custom properties', () => {
      const { toolCall } = createToolCall();
      toolCall.setProperties({ execution: 'data' });
      expect(toolCall.getProperties<any>().execution).toBe('data');
    });
  });

  describe('emit', () => {
    it('should emit tool call event through message envelope', () => {
      const { emitSpy, toolCall } = createToolCall();

      toolCall.emit({ metaEvent: { key: 'val' } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              toolCall: expect.objectContaining({
                toolCallId: TOOL_CALL_ID,
                metaEvent: { key: 'val' },
              }),
            }),
          }),
        })
      );
    });
  });

  describe('sendMetaEvent', () => {
    it('should emit meta event', () => {
      const { emitSpy, toolCall } = createToolCall();

      toolCall.sendMetaEvent({ key: 'meta' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              toolCall: expect.objectContaining({
                toolCallId: TOOL_CALL_ID,
                metaEvent: { key: 'meta' },
              }),
            }),
          }),
        })
      );
    });

    it('should throw after ended', () => {
      const { toolCall } = createToolCall();
      toolCall.sendToolCallEnd();

      expect(() => toolCall.sendMetaEvent({ k: 'v' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendToolCallEnd', () => {
    it('should mark as ended, emit endToolCall, and delete', () => {
      const { emitSpy, toolCall } = createToolCall();
      const deletedSpy = vi.fn();
      toolCall.onDeleted(deletedSpy);

      toolCall.sendToolCallEnd();

      expect(toolCall.ended).toBe(true);
      expect(toolCall.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              toolCall: expect.objectContaining({
                toolCallId: TOOL_CALL_ID,
                endToolCall: {},
              }),
            }),
          }),
        })
      );
    });

    it('should pass end event data', () => {
      const { emitSpy, toolCall } = createToolCall();

      toolCall.sendToolCallEnd({ output: 'result data', isError: false });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              toolCall: expect.objectContaining({
                endToolCall: expect.objectContaining({
                  output: 'result data',
                  isError: false,
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should emit end event with error flag', () => {
      const { emitSpy, toolCall } = createToolCall();

      toolCall.sendToolCallEnd({ output: 'error output', isError: true });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              toolCall: expect.objectContaining({
                endToolCall: expect.objectContaining({
                  output: 'error output',
                  isError: true,
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should throw if already ended', () => {
      const { toolCall } = createToolCall();
      toolCall.sendToolCallEnd();

      expect(() => toolCall.sendToolCallEnd()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('handler registration and unregistration', () => {
    it('should register and unregister onToolCallEnd handler', () => {
      const { toolCall } = createToolCall();
      const handler = vi.fn();
      const cleanup = toolCall.onToolCallEnd(handler);

      cleanup();
      expect((toolCall as any)._endHandlers).toHaveLength(0);
    });
  });

  describe('dispatch', () => {
    it('should dispatch endToolCall and mark ended', () => {
      const { toolCall } = createToolCall();
      const endSpy = vi.fn();
      toolCall.onToolCallEnd(endSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        endToolCall: { output: 'done' },
      });

      expect(endSpy).toHaveBeenCalledWith({ output: 'done' });
      expect(toolCall.ended).toBe(true);
    });

    it('should dispatch metaEvent', () => {
      const { toolCall } = createToolCall();
      const metaSpy = vi.fn();
      toolCall.onMetaEvent(metaSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        metaEvent: { key: 'val' },
      });

      expect(metaSpy).toHaveBeenCalledWith({ key: 'val' });
    });

    it('should dispatch toolCallError start', () => {
      const { toolCall } = createToolCall();
      const errorSpy = vi.fn();
      toolCall.onErrorStart(errorSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'tc-err-1', startError: { message: 'fail' } },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'tc-err-1' })
      );
    });

    it('should dispatch toolCallError end', () => {
      const { toolCall } = createToolCall();
      const errorEndSpy = vi.fn();
      toolCall.onErrorEnd(errorEndSpy);

      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'tc-err-1', startError: { message: 'fail' } },
      });
      toolCall.dispatch({
        toolCallId: TOOL_CALL_ID,
        toolCallError: { errorId: 'tc-err-1', endError: {} },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'tc-err-1' })
      );
    });

    it('should ignore events for different toolCallId', () => {
      const { toolCall } = createToolCall();
      const metaSpy = vi.fn();
      toolCall.onMetaEvent(metaSpy);

      toolCall.dispatch({
        toolCallId: 'other-tc',
        metaEvent: { key: 'val' },
      });

      expect(metaSpy).not.toHaveBeenCalled();
    });

    it('should buffer events when paused', () => {
      const { toolCall } = createToolCall();
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
    it('should emit tool call error start', () => {
      const { emitSpy, toolCall } = createToolCall();

      toolCall.sendErrorStart({ errorId: 'tce-1', message: 'tc fail' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              toolCall: expect.objectContaining({
                toolCallError: expect.objectContaining({
                  errorId: 'tce-1',
                  startError: expect.objectContaining({ message: 'tc fail' }),
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should emit tool call error end', () => {
      const { emitSpy, toolCall } = createToolCall();
      toolCall.sendErrorStart({ errorId: 'tce-1', message: 'err' });
      emitSpy.mockClear();

      toolCall.sendErrorEnd({ errorId: 'tce-1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              toolCall: expect.objectContaining({
                toolCallError: expect.objectContaining({
                  errorId: 'tce-1',
                  endError: expect.any(Object),
                }),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('replay', () => {
    it('should generate start and end events for tool call with result', () => {
      const events = Array.from(ToolCallEventHelperImpl.replay({
        toolCallId: 'replay-tc',
        name: 'search',
        input: { query: 'test' },
        createdTime: '2024-01-01T00:00:00Z',
        result: {
          output: 'search result',
          isError: false,
          cancelled: false,
          timestamp: '2024-01-01T00:00:01Z',
        },
      } as any));

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(expect.objectContaining({
        toolCallId: 'replay-tc',
        startToolCall: expect.objectContaining({
          toolName: 'search',
          input: { query: 'test' },
        }),
      }));
      expect(events[1]).toEqual(expect.objectContaining({
        toolCallId: 'replay-tc',
        endToolCall: expect.objectContaining({
          output: 'search result',
          isError: false,
        }),
      }));
    });

    it('should generate only start event for tool call without result', () => {
      const events = Array.from(ToolCallEventHelperImpl.replay({
        toolCallId: 'replay-tc-noresult',
        name: 'calc',
        input: {},
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      expect(events).toHaveLength(1);
      expect(events[0].startToolCall).toBeDefined();
    });

    it('should set timestamp, cancelled and isError in end event', () => {
      const events = Array.from(ToolCallEventHelperImpl.replay({
        toolCallId: 'replay-tc-fields',
        name: 'search',
        input: {},
        createdTime: '2024-01-01T00:00:00Z',
        result: {
          output: 'result',
          isError: true,
          cancelled: true,
          timestamp: '2024-01-01T00:00:05Z',
        },
      } as any));

      const endEvent = events.find(e => e.endToolCall);
      expect(endEvent!.endToolCall).toEqual(expect.objectContaining({
        isError: true,
        cancelled: true,
      }));
    });
  });

  describe('startEventMaybe and startEvent', () => {
    it('should throw ConversationEventValidationError when startEventMaybe is undefined', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
      const message = exchange.startMessage({ messageId: MESSAGE_ID }) as MessageEventHelperImpl;

      const tc = new ToolCallEventHelperImpl(message, 'no-start-tc', undefined);

      expect(tc.startEventMaybe).toBeUndefined();
      expect(() => tc.startEvent).toThrow(ConversationEventValidationError);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { toolCall } = createToolCall();
      expect(toolCall.toString()).toBe(`ToolCallEventHelper(${TOOL_CALL_ID})`);
    });
  });

  describe('delete functionality', () => {
    it('should delete toolCall and trigger onDeleted handlers', () => {
      const { toolCall } = createToolCall();
      const deletedSpy = vi.fn();
      toolCall.onDeleted(deletedSpy);

      toolCall.delete();

      expect(toolCall.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should unregister onDeleted handler correctly', () => {
      const { toolCall } = createToolCall();
      const handler = vi.fn();
      const cleanup = toolCall.onDeleted(handler);

      cleanup();
      toolCall.delete();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should automatically delete when receiving end event via dispatch', () => {
      const { toolCall } = createToolCall();
      const deletedSpy = vi.fn();
      toolCall.onDeleted(deletedSpy);

      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, endToolCall: {} });

      expect(toolCall.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should not be paused initially', () => {
      const { toolCall } = createToolCall();
      expect(toolCall.isPaused).toBe(false);
    });

    it('should pause event processing', () => {
      const { toolCall } = createToolCall();
      toolCall.pause();
      expect(toolCall.isPaused).toBe(true);
    });

    it('should process buffered events when resumed', () => {
      const { toolCall } = createToolCall();
      const metaSpy = vi.fn();
      toolCall.onMetaEvent(metaSpy);

      toolCall.pause();
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { key: 'b1' } });
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { key: 'b2' } });

      toolCall.resume();
      expect(metaSpy).toHaveBeenCalledTimes(2);
    });

    it('should buffer tool call end event when paused', () => {
      const { toolCall } = createToolCall();
      const endSpy = vi.fn();
      toolCall.onToolCallEnd(endSpy);

      toolCall.pause();
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, endToolCall: {} });
      expect(endSpy).not.toHaveBeenCalled();

      toolCall.resume();
      expect(endSpy).toHaveBeenCalled();
    });

    it('should allow multiple pause calls without error', () => {
      const { toolCall } = createToolCall();
      toolCall.pause();
      toolCall.pause();
      expect(toolCall.isPaused).toBe(true);
    });

    it('should allow resume when not paused', () => {
      const { toolCall } = createToolCall();
      toolCall.resume();
      expect(toolCall.isPaused).toBe(false);
    });

    it('should maintain event order when buffering', () => {
      const { toolCall } = createToolCall();
      const events: any[] = [];
      toolCall.onMetaEvent((e: any) => events.push(e));

      toolCall.pause();
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { n: 1 } });
      toolCall.dispatch({ toolCallId: TOOL_CALL_ID, metaEvent: { n: 2 } });

      toolCall.resume();

      expect(events).toEqual([{ n: 1 }, { n: 2 }]);
    });
  });
});
