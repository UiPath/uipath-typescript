// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';
import { ExchangeEventHelperImpl } from '@/services/conversational-agent/helpers/exchange-event-helper';
import {
  ConversationEventInvalidOperationError,
  ConversationEventValidationError,
} from '@/services/conversational-agent/helpers/conversation-event-helper-common';
import { MessageRole } from '@/models/conversational-agent/conversations/types/common.types';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';
const EXCHANGE_ID = 'ex-1';

// ===== HELPERS =====
const createExchange = () => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  manager.onUnhandledErrorStart(vi.fn());
  const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
  const exchange = session.startExchange({ exchangeId: EXCHANGE_ID });
  emitSpy.mockClear();
  return { emitSpy, manager, session, exchange: exchange as ExchangeEventHelperImpl };
};

// ===== TEST SUITE =====
describe('ExchangeEventHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have exchangeId set', () => {
      const { exchange } = createExchange();
      expect(exchange.exchangeId).toBe(EXCHANGE_ID);
    });

    it('should have startEvent accessible', () => {
      const { exchange } = createExchange();
      expect(exchange.startEvent).toBeDefined();
      expect(exchange.startEvent.timestamp).toBeDefined();
    });

    it('should reference parent session', () => {
      const { exchange, session } = createExchange();
      expect(exchange.session).toBe(session);
    });

    it('should not be ended initially', () => {
      const { exchange } = createExchange();
      expect(exchange.ended).toBe(false);
    });

    it('should have an empty properties object', () => {
      const { exchange } = createExchange();
      expect(exchange.getProperties()).toEqual({});
      expect(typeof exchange.getProperties()).toBe('object');
    });

    it('should allow storing and retrieving custom properties', () => {
      const { exchange } = createExchange();
      exchange.setProperties({ custom: 'val', nested: { a: 1 } });
      expect(exchange.getProperties<any>().custom).toBe('val');
      expect(exchange.getProperties<any>().nested.a).toBe(1);
    });
  });

  describe('emit', () => {
    it('should emit exchange event through session with correct envelope', () => {
      const { emitSpy, exchange } = createExchange();

      exchange.emit({ metaEvent: { key: 'val' } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          exchange: expect.objectContaining({
            exchangeId: EXCHANGE_ID,
            metaEvent: { key: 'val' },
          }),
        })
      );
    });
  });

  describe('startMessage', () => {
    it('should create message and emit startMessage event', () => {
      const { emitSpy, exchange } = createExchange();

      const message = exchange.startMessage({ messageId: 'msg-1', role: MessageRole.User });

      expect(message).toBeDefined();
      expect(message.messageId).toBe('msg-1');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            exchangeId: EXCHANGE_ID,
            message: expect.objectContaining({
              messageId: 'msg-1',
              startMessage: expect.objectContaining({ role: MessageRole.User }),
            }),
          }),
        })
      );
    });

    it('should default role to user when not specified', () => {
      const { emitSpy, exchange } = createExchange();

      exchange.startMessage({ messageId: 'msg-def' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              startMessage: expect.objectContaining({ role: MessageRole.User }),
            }),
          }),
        })
      );
    });

    it('should auto-generate messageId when not provided', () => {
      const { exchange } = createExchange();

      const message = exchange.startMessage();

      expect(message.messageId).toBeDefined();
      expect(typeof message.messageId).toBe('string');
    });

    it('should set properties on message when provided', () => {
      const { exchange } = createExchange();

      const message = exchange.startMessage({
        messageId: 'msg-props',
        role: MessageRole.Assistant,
        properties: { custom: 'value', priority: 1 },
      });

      expect(message.getProperties<any>().custom).toBe('value');
      expect(message.getProperties<any>().priority).toBe(1);
    });

    it('should auto-end message when callback is provided', async () => {
      const { emitSpy, exchange } = createExchange();

      await exchange.startMessage({ messageId: 'msg-cb', role: MessageRole.User }, async (message) => {
        message.sendContentPart({ data: 'hello' });
      });

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.endMessage !== undefined
      );
      expect(endCall).toBeDefined();
    });

    it('should throw after exchange ended', () => {
      const { exchange } = createExchange();
      exchange.sendExchangeEnd();

      expect(() => exchange.startMessage()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('messages iterator and getMessage', () => {
    it('should iterate over messages', () => {
      const { exchange } = createExchange();

      exchange.startMessage({ messageId: 'msg-1' });
      exchange.startMessage({ messageId: 'msg-2' });

      const messages = Array.from(exchange.messages);
      expect(messages).toHaveLength(2);
    });

    it('should get message by id', () => {
      const { exchange } = createExchange();

      const message = exchange.startMessage({ messageId: 'msg-1' });

      expect(exchange.getMessage('msg-1')).toBe(message);
    });

    it('should return undefined for unknown message id', () => {
      const { exchange } = createExchange();
      expect(exchange.getMessage('unknown')).toBeUndefined();
    });
  });

  describe('sendMessageWithContentPart', () => {
    it('should send a complete message with content part', async () => {
      const { emitSpy, exchange } = createExchange();

      await exchange.sendMessageWithContentPart({
        data: 'Hello world',
        role: MessageRole.User,
        messageId: 'msg-full',
      });

      // Should have emitted startMessage, startContentPart, chunk, endContentPart, endMessage
      const startMsgCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.startMessage !== undefined
      );
      expect(startMsgCall).toBeDefined();

      const endMsgCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.endMessage !== undefined
      );
      expect(endMsgCall).toBeDefined();
    });
  });

  describe('sendExchangeEnd', () => {
    it('should mark exchange as ended and emit endExchange event', () => {
      const { emitSpy, exchange } = createExchange();

      exchange.sendExchangeEnd();

      expect(exchange.ended).toBe(true);
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            exchangeId: EXCHANGE_ID,
            endExchange: {},
          }),
        })
      );
    });

    it('should throw if already ended', () => {
      const { exchange } = createExchange();
      exchange.sendExchangeEnd();

      expect(() => exchange.sendExchangeEnd()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendMetaEvent', () => {
    it('should emit meta event', () => {
      const { emitSpy, exchange } = createExchange();

      exchange.sendMetaEvent({ key: 'meta' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            exchangeId: EXCHANGE_ID,
            metaEvent: { key: 'meta' },
          }),
        })
      );
    });

    it('should throw after ended', () => {
      const { exchange } = createExchange();
      exchange.sendExchangeEnd();

      expect(() => exchange.sendMetaEvent({ k: 'v' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('handler registration and unregistration', () => {
    it('should register and unregister onExchangeEnd handler', () => {
      const { exchange } = createExchange();
      const handler = vi.fn();
      const cleanup = exchange.onExchangeEnd(handler);

      cleanup();
      expect((exchange as any)._endHandlers).toHaveLength(0);
    });

    it('should register and unregister onMessageStart handler', () => {
      const { exchange } = createExchange();
      const handler = vi.fn();
      const cleanup = exchange.onMessageStart(handler);

      cleanup();
      expect((exchange as any)._messageStartHandlers).toHaveLength(0);
    });
  });

  describe('dispatch', () => {
    it('should dispatch message events to message helper', () => {
      const { exchange } = createExchange();
      const msgStartSpy = vi.fn();
      exchange.onMessageStart(msgStartSpy);

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'disp-msg-1',
          startMessage: { role: MessageRole.Assistant },
        },
      });

      expect(msgStartSpy).toHaveBeenCalled();
    });

    it('should dispatch metaEvent to meta handlers', () => {
      const { exchange } = createExchange();
      const metaSpy = vi.fn();
      exchange.onMetaEvent(metaSpy);

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        metaEvent: { key: 'dispatched' },
      });

      expect(metaSpy).toHaveBeenCalledWith({ key: 'dispatched' });
    });

    it('should dispatch endExchange to end handlers', () => {
      const { exchange } = createExchange();
      const endSpy = vi.fn();
      exchange.onExchangeEnd(endSpy);

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        endExchange: {},
      });

      expect(endSpy).toHaveBeenCalled();
      expect(exchange.ended).toBe(true);
    });

    it('should dispatch exchange error start', () => {
      const { exchange } = createExchange();
      const errorSpy = vi.fn();
      exchange.onErrorStart(errorSpy);

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: {
          errorId: 'ex-err-1',
          startError: { message: 'exchange error' },
        },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ex-err-1', message: 'exchange error' })
      );
      expect(exchange.hasError).toBe(true);
    });

    it('should dispatch exchange error end', () => {
      const { exchange } = createExchange();
      const errorEndSpy = vi.fn();
      exchange.onErrorEnd(errorEndSpy);

      // First add error, then end it
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'ex-err-1', startError: { message: 'err' } },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'ex-err-1', endError: {} },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ex-err-1' })
      );
      expect(exchange.hasError).toBe(false);
    });

    it('should ignore events for different exchangeId', () => {
      const { exchange } = createExchange();
      const metaSpy = vi.fn();
      exchange.onMetaEvent(metaSpy);

      exchange.dispatch({
        exchangeId: 'other-exchange',
        metaEvent: { key: 'val' },
      });

      expect(metaSpy).not.toHaveBeenCalled();
    });

    it('should buffer events when paused', () => {
      const { exchange } = createExchange();
      const metaSpy = vi.fn();
      exchange.onMetaEvent(metaSpy);

      exchange.pause();
      exchange.dispatch({ exchangeId: EXCHANGE_ID, metaEvent: { key: 'buffered' } });
      expect(metaSpy).not.toHaveBeenCalled();

      exchange.resume();
      expect(metaSpy).toHaveBeenCalledWith({ key: 'buffered' });
    });
  });

  describe('pause and resume', () => {
    it('should not be paused initially', () => {
      const { exchange } = createExchange();
      expect(exchange.isPaused).toBe(false);
    });

    it('should pause event processing', () => {
      const { exchange } = createExchange();
      exchange.pause();
      expect(exchange.isPaused).toBe(true);
    });

    it('should process buffered events when resumed', () => {
      const { exchange } = createExchange();
      const metaSpy = vi.fn();
      exchange.onMetaEvent(metaSpy);

      exchange.pause();
      exchange.dispatch({ exchangeId: EXCHANGE_ID, metaEvent: { key: 'b1' } });
      exchange.dispatch({ exchangeId: EXCHANGE_ID, metaEvent: { key: 'b2' } });
      expect(metaSpy).not.toHaveBeenCalled();

      exchange.resume();
      expect(metaSpy).toHaveBeenCalledTimes(2);
    });

    it('should buffer exchange end event when paused', () => {
      const { exchange } = createExchange();
      const endSpy = vi.fn();
      exchange.onExchangeEnd(endSpy);

      exchange.pause();
      exchange.dispatch({ exchangeId: EXCHANGE_ID, endExchange: {} });
      expect(endSpy).not.toHaveBeenCalled();

      exchange.resume();
      expect(endSpy).toHaveBeenCalled();
    });

    it('should allow multiple pause calls without error', () => {
      const { exchange } = createExchange();
      exchange.pause();
      exchange.pause();
      exchange.pause();
      expect(exchange.isPaused).toBe(true);
    });

    it('should allow resume when not paused', () => {
      const { exchange } = createExchange();
      exchange.resume();
      expect(exchange.isPaused).toBe(false);
    });

    it('should maintain event order when buffering', () => {
      const { exchange } = createExchange();
      const events: any[] = [];
      exchange.onMetaEvent((e: any) => events.push(e));

      exchange.pause();
      exchange.dispatch({ exchangeId: EXCHANGE_ID, metaEvent: { n: 1 } });
      exchange.dispatch({ exchangeId: EXCHANGE_ID, metaEvent: { n: 2 } });
      exchange.dispatch({ exchangeId: EXCHANGE_ID, metaEvent: { n: 3 } });

      exchange.resume();

      expect(events).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    });

    it('should process message start events when resumed', () => {
      const { exchange } = createExchange();
      const msgStartSpy = vi.fn();
      exchange.onMessageStart(msgStartSpy);

      exchange.pause();
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: { messageId: 'paused-msg', startMessage: { role: MessageRole.User } },
      });
      expect(msgStartSpy).not.toHaveBeenCalled();

      exchange.resume();
      expect(msgStartSpy).toHaveBeenCalled();
    });
  });

  describe('delete functionality', () => {
    it('should delete exchange and trigger onDeleted handlers', () => {
      const { exchange } = createExchange();
      const deletedSpy = vi.fn();
      exchange.onDeleted(deletedSpy);

      exchange.delete();

      expect(exchange.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should unregister onDeleted handler correctly', () => {
      const { exchange } = createExchange();
      const handler = vi.fn();
      const cleanup = exchange.onDeleted(handler);

      cleanup();
      exchange.delete();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should delete all child messages when exchange deleted', () => {
      const { exchange } = createExchange();
      const message = exchange.startMessage({ messageId: 'msg-del', role: MessageRole.User });
      const msgDeletedSpy = vi.fn();
      message.onDeleted(msgDeletedSpy);

      exchange.delete();

      expect(msgDeletedSpy).toHaveBeenCalled();
    });

    it('should mark exchange as ended when receiving end event via dispatch', () => {
      const { exchange } = createExchange();
      const endSpy = vi.fn();
      exchange.onExchangeEnd(endSpy);

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        endExchange: {},
      });

      expect(exchange.ended).toBe(true);
      expect(endSpy).toHaveBeenCalled();
    });
  });

  describe('sendErrorStart and sendErrorEnd', () => {
    it('should emit exchange error start', () => {
      const { emitSpy, exchange } = createExchange();

      exchange.sendErrorStart({ errorId: 'ex-e1', message: 'exchange fail' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            exchangeId: EXCHANGE_ID,
            exchangeError: expect.objectContaining({
              errorId: 'ex-e1',
              startError: expect.objectContaining({ message: 'exchange fail' }),
            }),
          }),
        })
      );
      expect(exchange.hasError).toBe(true);
    });

    it('should emit exchange error end', () => {
      const { emitSpy, exchange } = createExchange();
      exchange.sendErrorStart({ errorId: 'ex-e1', message: 'err' });
      emitSpy.mockClear();

      exchange.sendErrorEnd({ errorId: 'ex-e1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            exchangeError: expect.objectContaining({
              errorId: 'ex-e1',
              endError: expect.any(Object),
            }),
          }),
        })
      );
      expect(exchange.hasError).toBe(false);
    });
  });

  describe('error scope', () => {
    it('should report inErrorScope from parent session', () => {
      const { session, exchange } = createExchange();
      expect(exchange.inErrorScope).toBe(false);

      session.sendErrorStart({ errorId: 's-e1', message: 'session err' });
      expect(exchange.inErrorScope).toBe(true);
    });
  });

  describe('onMessageCompleted', () => {
    it('should fire when message ends with completed content parts', () => {
      const { exchange } = createExchange();
      const completedSpy = vi.fn();
      exchange.onMessageCompleted(completedSpy);

      // Dispatch a message lifecycle
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'msg-completed',
          startMessage: { role: MessageRole.Assistant },
        },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'msg-completed',
          contentPart: {
            contentPartId: 'cp-1',
            startContentPart: { mimeType: 'text/plain' },
          },
        },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'msg-completed',
          contentPart: {
            contentPartId: 'cp-1',
            chunk: { data: 'Hello' },
          },
        },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'msg-completed',
          contentPart: {
            contentPartId: 'cp-1',
            endContentPart: {},
          },
        },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'msg-completed',
          endMessage: {},
        },
      });

      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'msg-completed',
          contentParts: expect.arrayContaining([
            expect.objectContaining({ data: 'Hello' }),
          ]),
        })
      );
    });

    it('should fire with completed tool calls', () => {
      const { exchange } = createExchange();
      const completedSpy = vi.fn();
      exchange.onMessageCompleted(completedSpy);

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: { messageId: 'msg-tc', startMessage: { role: MessageRole.Assistant } },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'msg-tc',
          toolCall: { toolCallId: 'tc-1', startToolCall: { toolName: 'search' } },
        },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: {
          messageId: 'msg-tc',
          toolCall: { toolCallId: 'tc-1', endToolCall: { output: 'result' } },
        },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        message: { messageId: 'msg-tc', endMessage: {} },
      });

      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: 'msg-tc',
          toolCalls: expect.arrayContaining([
            expect.objectContaining({ toolCallId: 'tc-1', toolName: 'search' }),
          ]),
        })
      );
    });
  });

  describe('replay', () => {
    it('should generate correct event sequence', () => {
      const events = Array.from(ExchangeEventHelperImpl.replay({
        exchangeId: 'replay-ex',
        createdTime: '2024-01-01T00:00:00Z',
        messages: [
          {
            messageId: 'replay-msg',
            role: MessageRole.User,
            createdTime: '2024-01-01T00:00:01Z',
            contentParts: [
              {
                contentPartId: 'replay-cp',
                mimeType: 'text/plain',
                data: { inline: 'Hi' },
                citations: [],
                createdTime: '2024-01-01T00:00:01Z',
              },
            ],
            toolCalls: [],
          },
        ],
      } as any));

      // Should have: startExchange, startMessage, startContentPart, chunk, endContentPart, endMessage, endExchange
      expect(events[0]).toEqual(expect.objectContaining({
        exchangeId: 'replay-ex',
        startExchange: expect.any(Object),
      }));
      expect(events[events.length - 1]).toEqual(expect.objectContaining({
        exchangeId: 'replay-ex',
        endExchange: {},
      }));
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { exchange } = createExchange();
      expect(exchange.toString()).toBe(`ExchangeEventHelper(${EXCHANGE_ID})`);
    });
  });

  describe('startEventMaybe and startEvent', () => {
    it('should throw ConversationEventValidationError when startEventMaybe is undefined', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;

      // Create exchange without start event (as dispatch does when no startExchange in event)
      const exchange = new ExchangeEventHelperImpl(session, 'no-start-ex', undefined);

      expect(exchange.startEventMaybe).toBeUndefined();
      expect(() => exchange.startEvent).toThrow(ConversationEventValidationError);
    });
  });

  describe('error propagation', () => {
    it('should dispatch error to manager anyErrorStart when local handler exists', () => {
      const { manager, exchange } = createExchange();
      const anyErrorSpy = vi.fn();
      manager.onAnyErrorStart(anyErrorSpy);
      manager.onUnhandledErrorStart(vi.fn());
      exchange.onErrorStart(vi.fn());

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', startError: { message: 'err' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'exe-1' })
      );
    });

    it('should dispatch to unhandled when no local handler exists', () => {
      const { manager, exchange } = createExchange();
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', startError: { message: 'unhandled' } },
      });

      expect(unhandledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'exe-1' })
      );
    });

    it('should store errors in errors map on error start', () => {
      const { exchange } = createExchange();
      exchange.onErrorStart(vi.fn());

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', startError: { message: 'mapped' } },
      });

      expect(exchange.hasError).toBe(true);
      expect(exchange.errors.has('exe-1')).toBe(true);
    });

    it('should remove errors from errors map on error end', () => {
      const { exchange } = createExchange();
      exchange.onErrorStart(vi.fn());

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', startError: { message: 'mapped' } },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', endError: {} },
      });

      expect(exchange.hasError).toBe(false);
      expect(exchange.errors.has('exe-1')).toBe(false);
    });

    it('should unregister error handlers correctly', () => {
      const { manager, exchange } = createExchange();
      const errorSpy = vi.fn();
      const cleanup = exchange.onErrorStart(errorSpy);
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      cleanup();

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', startError: { message: 'after cleanup' } },
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(unhandledSpy).toHaveBeenCalled();
    });

    it('should dispatch error end to manager anyErrorEnd', () => {
      const { manager, exchange } = createExchange();
      const anyErrorEndSpy = vi.fn();
      manager.onAnyErrorEnd(anyErrorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());
      exchange.onErrorStart(vi.fn());

      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', startError: { message: 'err' } },
      });
      exchange.dispatch({
        exchangeId: EXCHANGE_ID,
        exchangeError: { errorId: 'exe-1', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'exe-1' })
      );
    });

    it('should not throw when error end occurs without any handler', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const exchange = session.startExchange({ exchangeId: 'no-handler-ex' }) as ExchangeEventHelperImpl;

      expect(() => {
        exchange.dispatch({
          exchangeId: 'no-handler-ex',
          exchangeError: { errorId: 'exe-nothrow', endError: {} },
        });
      }).not.toThrow();
    });
  });
});
