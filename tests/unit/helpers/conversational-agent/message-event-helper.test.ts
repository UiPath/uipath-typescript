// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';
import { ExchangeEventHelperImpl } from '@/services/conversational-agent/helpers/exchange-event-helper';
import { MessageEventHelperImpl } from '@/services/conversational-agent/helpers/message-event-helper';
import {
  ConversationEventInvalidOperationError,
  ConversationEventValidationError,
} from '@/services/conversational-agent/helpers/conversation-event-helper-common';
import { MessageRole } from '@/models/conversational-agent/conversations/types/common.types';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';
const EXCHANGE_ID = 'ex-1';
const MESSAGE_ID = 'msg-1';

// ===== HELPERS =====
const createMessage = (role: string = 'user') => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  manager.onUnhandledErrorStart(vi.fn());
  const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
  const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
  const message = exchange.startMessage({ messageId: MESSAGE_ID, role: role as any }) as MessageEventHelperImpl;
  emitSpy.mockClear();
  return { emitSpy, manager, session, exchange, message };
};

// ===== TEST SUITE =====
describe('MessageEventHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have messageId set', () => {
      const { message } = createMessage();
      expect(message.messageId).toBe(MESSAGE_ID);
    });

    it('should have startEvent accessible with timestamp', () => {
      const { message } = createMessage();
      expect(message.startEvent).toBeDefined();
      expect(message.startEvent.timestamp).toBeDefined();
    });

    it('should reference parent exchange', () => {
      const { message, exchange } = createMessage();
      expect(message.exchange).toBe(exchange);
    });

    it('should have an empty properties object', () => {
      const { message } = createMessage();
      expect(message.getProperties()).toEqual({});
      expect(typeof message.getProperties()).toBe('object');
    });

    it('should allow storing and retrieving custom properties', () => {
      const { message } = createMessage();
      message.setProperties({ custom: 'val', nested: { a: 1 } });
      expect(message.getProperties<any>().custom).toBe('val');
    });
  });

  describe('role properties', () => {
    it('should have role from startEvent', () => {
      const { message } = createMessage('user');
      expect(message.role).toBe('user');
    });

    it('should report isUser correctly', () => {
      const { message } = createMessage('user');
      expect(message.isUser).toBe(true);
      expect(message.isAssistant).toBe(false);
      expect(message.isSystem).toBe(false);
    });

    it('should report isAssistant correctly', () => {
      const { message } = createMessage('assistant');
      expect(message.isAssistant).toBe(true);
      expect(message.isUser).toBe(false);
      expect(message.isSystem).toBe(false);
    });

    it('should report isSystem correctly', () => {
      const { message } = createMessage('system');
      expect(message.isSystem).toBe(true);
      expect(message.isUser).toBe(false);
      expect(message.isAssistant).toBe(false);
    });
  });

  describe('emit', () => {
    it('should emit message event through exchange envelope', () => {
      const { emitSpy, message } = createMessage();

      message.emit({ metaEvent: { key: 'val' } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            exchangeId: EXCHANGE_ID,
            message: expect.objectContaining({
              messageId: MESSAGE_ID,
              metaEvent: { key: 'val' },
            }),
          }),
        })
      );
    });
  });

  describe('startContentPart', () => {
    it('should create content part and emit startContentPart event', () => {
      const { emitSpy, message } = createMessage();

      const cp = message.startContentPart({ contentPartId: 'cp-1', mimeType: 'text/plain' });

      expect(cp).toBeDefined();
      expect(cp.contentPartId).toBe('cp-1');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              messageId: MESSAGE_ID,
              contentPart: expect.objectContaining({
                contentPartId: 'cp-1',
                startContentPart: expect.objectContaining({ mimeType: 'text/plain' }),
              }),
            }),
          }),
        })
      );
    });

    it('should auto-end content part when callback is provided', async () => {
      const { emitSpy, message } = createMessage();

      await message.startContentPart(
        { contentPartId: 'cp-cb', mimeType: 'text/plain' },
        async (cp) => {
          cp.sendChunk({ data: 'Hello' });
        }
      );

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.contentPart?.endContentPart !== undefined
      );
      expect(endCall).toBeDefined();
    });

    it('should set properties on content part when provided', () => {
      const { message } = createMessage();

      const cp = message.startContentPart({
        contentPartId: 'cp-props',
        mimeType: 'text/plain',
        properties: { source: 'api', lang: 'en' },
      });

      expect(cp.getProperties<any>().source).toBe('api');
      expect(cp.getProperties<any>().lang).toBe('en');
    });

    it('should auto-generate contentPartId when not provided', () => {
      const { message } = createMessage();

      const cp = message.startContentPart({ mimeType: 'text/plain' });

      expect(cp.contentPartId).toBeDefined();
      expect(typeof cp.contentPartId).toBe('string');
    });

    it('should throw after message ended', () => {
      const { message } = createMessage();
      message.sendMessageEnd();

      expect(() => message.startContentPart({ mimeType: 'text/plain' })).toThrow(
        ConversationEventInvalidOperationError
      );
    });
  });

  describe('contentParts iterator and getContentPart', () => {
    it('should iterate over content parts', () => {
      const { message } = createMessage();

      message.startContentPart({ contentPartId: 'cp-1', mimeType: 'text/plain' });
      message.startContentPart({ contentPartId: 'cp-2', mimeType: 'text/markdown' });

      const parts = Array.from(message.contentParts);
      expect(parts).toHaveLength(2);
    });

    it('should get content part by id', () => {
      const { message } = createMessage();

      const cp = message.startContentPart({ contentPartId: 'cp-1', mimeType: 'text/plain' });

      expect(message.getContentPart('cp-1')).toBe(cp);
    });

    it('should return undefined for unknown content part id', () => {
      const { message } = createMessage();
      expect(message.getContentPart('unknown')).toBeUndefined();
    });
  });

  describe('sendContentPart (convenience)', () => {
    it('should send complete content part with data', async () => {
      const { emitSpy, message } = createMessage();

      await message.sendContentPart({ data: 'Hello world' });

      // Should have emitted startContentPart, chunk, endContentPart
      const chunkCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.contentPart?.chunk?.data === 'Hello world'
      );
      expect(chunkCall).toBeDefined();
    });

    it('should default mimeType to text/markdown', async () => {
      const { emitSpy, message } = createMessage();

      await message.sendContentPart({ data: 'test' });

      const startCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.contentPart?.startContentPart !== undefined
      );
      expect(startCall![0].exchange.message.contentPart.startContentPart.mimeType).toBe('text/markdown');
    });
  });

  describe('startToolCall', () => {
    it('should create tool call and emit startToolCall event', () => {
      const { emitSpy, message } = createMessage();

      const tc = message.startToolCall({ toolCallId: 'tc-1', toolName: 'search' });

      expect(tc).toBeDefined();
      expect(tc.toolCallId).toBe('tc-1');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              messageId: MESSAGE_ID,
              toolCall: expect.objectContaining({
                toolCallId: 'tc-1',
                startToolCall: expect.objectContaining({ toolName: 'search' }),
              }),
            }),
          }),
        })
      );
    });

    it('should auto-end tool call when callback is provided', async () => {
      const { emitSpy, message } = createMessage();

      await message.startToolCall({ toolCallId: 'tc-cb', toolName: 'calc' }, async () => {});

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.toolCall?.endToolCall !== undefined
      );
      expect(endCall).toBeDefined();
    });

    it('should set properties on tool call when provided', () => {
      const { message } = createMessage();

      const tc = message.startToolCall({
        toolCallId: 'tc-props',
        toolName: 'search',
        properties: { timeout: 5000, retries: 3 },
      });

      expect(tc.getProperties<any>().timeout).toBe(5000);
      expect(tc.getProperties<any>().retries).toBe(3);
    });

    it('should auto-generate toolCallId when not provided', () => {
      const { message } = createMessage();

      const tc = message.startToolCall({ toolName: 'search' });

      expect(tc.toolCallId).toBeDefined();
      expect(typeof tc.toolCallId).toBe('string');
    });

    it('should use callback return value for end event', async () => {
      const { emitSpy, message } = createMessage();

      await message.startToolCall({ toolCallId: 'tc-ret', toolName: 'weather' }, async (tc) => {
        tc.sendMetaEvent({ status: 'fetching' });
        return { output: 'sunny, 20C' };
      });

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.toolCall?.endToolCall?.output === 'sunny, 20C'
      );
      expect(endCall).toBeDefined();
    });

    it('should send empty end event when callback returns void', async () => {
      const { emitSpy, message } = createMessage();

      await message.startToolCall({ toolCallId: 'tc-void', toolName: 'logger' }, async (tc) => {
        tc.sendMetaEvent({ logged: true });
      });

      const endCall = emitSpy.mock.calls.find(
        (call: any[]) => call[0]?.exchange?.message?.toolCall?.toolCallId === 'tc-void' &&
          call[0]?.exchange?.message?.toolCall?.endToolCall !== undefined
      );
      expect(endCall).toBeDefined();
      expect(endCall![0].exchange.message.toolCall.endToolCall).toEqual({});
    });
  });

  describe('toolCalls iterator and getToolCall', () => {
    it('should iterate over tool calls', () => {
      const { message } = createMessage();

      message.startToolCall({ toolCallId: 'tc-1', toolName: 'search' });
      message.startToolCall({ toolCallId: 'tc-2', toolName: 'calc' });

      const tcs = Array.from(message.toolCalls);
      expect(tcs).toHaveLength(2);
    });

    it('should get tool call by id', () => {
      const { message } = createMessage();

      const tc = message.startToolCall({ toolCallId: 'tc-1', toolName: 'search' });

      expect(message.getToolCall('tc-1')).toBe(tc);
    });
  });

  describe('sendInterrupt and sendInterruptEnd', () => {
    it('should emit interrupt start event', () => {
      const { emitSpy, message } = createMessage();

      message.sendInterrupt('int-1', { type: 'test', interruptValue: {} } as any);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              messageId: MESSAGE_ID,
              interrupt: expect.objectContaining({
                interruptId: 'int-1',
                startInterrupt: expect.any(Object),
              }),
            }),
          }),
        })
      );
    });

    it('should emit interrupt end event', () => {
      const { emitSpy, message } = createMessage();

      message.sendInterruptEnd('int-1', {} as any);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              interrupt: expect.objectContaining({
                interruptId: 'int-1',
                endInterrupt: expect.any(Object),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('sendMessageEnd', () => {
    it('should mark message as ended, emit endMessage, and delete', () => {
      const { emitSpy, message } = createMessage();
      const deletedSpy = vi.fn();
      message.onDeleted(deletedSpy);

      message.sendMessageEnd();

      expect(message.ended).toBe(true);
      expect(message.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              messageId: MESSAGE_ID,
              endMessage: {},
            }),
          }),
        })
      );
    });

    it('should throw if already ended', () => {
      const { message } = createMessage();
      message.sendMessageEnd();

      expect(() => message.sendMessageEnd()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendMetaEvent', () => {
    it('should emit meta event', () => {
      const { emitSpy, message } = createMessage();

      message.sendMetaEvent({ key: 'meta' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              messageId: MESSAGE_ID,
              metaEvent: { key: 'meta' },
            }),
          }),
        })
      );
    });
  });

  describe('handler registration and unregistration', () => {
    it('should register and unregister onMessageEnd handler', () => {
      const { message } = createMessage();
      const handler = vi.fn();
      const cleanup = message.onMessageEnd(handler);

      cleanup();
      expect((message as any)._endHandlers).toHaveLength(0);
    });

    it('should register and unregister onContentPartStart handler', () => {
      const { message } = createMessage();
      const handler = vi.fn();
      const cleanup = message.onContentPartStart(handler);

      cleanup();
      expect((message as any)._contentPartStartHandlers).toHaveLength(0);
    });

    it('should register and unregister onToolCallStart handler', () => {
      const { message } = createMessage();
      const handler = vi.fn();
      const cleanup = message.onToolCallStart(handler);

      cleanup();
      expect((message as any)._toolCallStartHandlers).toHaveLength(0);
    });

    it('should register and unregister onInterruptStart handler', () => {
      const { message } = createMessage();
      const handler = vi.fn();
      const cleanup = message.onInterruptStart(handler);

      cleanup();
      expect((message as any)._interruptStartHandlers).toHaveLength(0);
    });

    it('should register and unregister onInterruptEnd handler', () => {
      const { message } = createMessage();
      const handler = vi.fn();
      const cleanup = message.onInterruptEnd(handler);

      cleanup();
      expect((message as any)._interruptEndHandlers).toHaveLength(0);
    });
  });

  describe('dispatch', () => {
    it('should dispatch contentPart events and create content part helper', () => {
      const { message } = createMessage();
      const cpStartSpy = vi.fn();
      message.onContentPartStart(cpStartSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: {
          contentPartId: 'disp-cp-1',
          startContentPart: { mimeType: 'text/plain' },
        },
      });

      expect(cpStartSpy).toHaveBeenCalled();
    });

    it('should dispatch toolCall events and create tool call helper', () => {
      const { message } = createMessage();
      const tcStartSpy = vi.fn();
      message.onToolCallStart(tcStartSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        toolCall: {
          toolCallId: 'disp-tc-1',
          startToolCall: { toolName: 'search' },
        },
      });

      expect(tcStartSpy).toHaveBeenCalled();
    });

    it('should dispatch interrupt start events', () => {
      const { message } = createMessage();
      const intStartSpy = vi.fn();
      message.onInterruptStart(intStartSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        interrupt: {
          interruptId: 'int-1',
          startInterrupt: { type: 'test', interruptValue: {} } as any,
        },
      });

      expect(intStartSpy).toHaveBeenCalledWith(
        expect.objectContaining({ interruptId: 'int-1' })
      );
    });

    it('should dispatch interrupt end events', () => {
      const { message } = createMessage();
      const intEndSpy = vi.fn();
      message.onInterruptEnd(intEndSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        interrupt: {
          interruptId: 'int-1',
          endInterrupt: {} as any,
        },
      });

      expect(intEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ interruptId: 'int-1' })
      );
    });

    it('should dispatch endMessage and mark ended and deleted', () => {
      const { message } = createMessage();
      const endSpy = vi.fn();
      message.onMessageEnd(endSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        endMessage: {},
      });

      expect(endSpy).toHaveBeenCalled();
      expect(message.ended).toBe(true);
      expect(message.deleted).toBe(true);
    });

    it('should dispatch message error start', () => {
      const { message } = createMessage();
      const errorSpy = vi.fn();
      message.onErrorStart(errorSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: {
          errorId: 'msg-err-1',
          startError: { message: 'msg error' },
        },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'msg-err-1' })
      );
    });

    it('should ignore events for different messageId', () => {
      const { message } = createMessage();
      const metaSpy = vi.fn();
      message.onMetaEvent(metaSpy);

      message.dispatch({
        messageId: 'other-msg',
        metaEvent: { key: 'val' },
      });

      expect(metaSpy).not.toHaveBeenCalled();
    });

    it('should buffer events when paused', () => {
      const { message } = createMessage();
      const metaSpy = vi.fn();
      message.onMetaEvent(metaSpy);

      message.pause();
      message.dispatch({ messageId: MESSAGE_ID, metaEvent: { key: 'buffered' } });
      expect(metaSpy).not.toHaveBeenCalled();

      message.resume();
      expect(metaSpy).toHaveBeenCalledWith({ key: 'buffered' });
    });
  });

  describe('pause and resume', () => {
    it('should not be paused initially', () => {
      const { message } = createMessage();
      expect(message.isPaused).toBe(false);
    });

    it('should pause event processing', () => {
      const { message } = createMessage();
      message.pause();
      expect(message.isPaused).toBe(true);
    });

    it('should process buffered events when resumed', () => {
      const { message } = createMessage();
      const metaSpy = vi.fn();
      message.onMetaEvent(metaSpy);

      message.pause();
      message.dispatch({ messageId: MESSAGE_ID, metaEvent: { key: 'b1' } });
      message.dispatch({ messageId: MESSAGE_ID, metaEvent: { key: 'b2' } });

      message.resume();
      expect(metaSpy).toHaveBeenCalledTimes(2);
    });

    it('should buffer message end event when paused', () => {
      const { message } = createMessage();
      const endSpy = vi.fn();
      message.onMessageEnd(endSpy);

      message.pause();
      message.dispatch({ messageId: MESSAGE_ID, endMessage: {} });
      expect(endSpy).not.toHaveBeenCalled();

      message.resume();
      expect(endSpy).toHaveBeenCalled();
    });

    it('should allow multiple pause calls without error', () => {
      const { message } = createMessage();
      message.pause();
      message.pause();
      expect(message.isPaused).toBe(true);
    });

    it('should allow resume when not paused', () => {
      const { message } = createMessage();
      message.resume();
      expect(message.isPaused).toBe(false);
    });

    it('should maintain event order when buffering', () => {
      const { message } = createMessage();
      const events: any[] = [];
      message.onMetaEvent((e: any) => events.push(e));

      message.pause();
      message.dispatch({ messageId: MESSAGE_ID, metaEvent: { n: 1 } });
      message.dispatch({ messageId: MESSAGE_ID, metaEvent: { n: 2 } });

      message.resume();

      expect(events).toEqual([{ n: 1 }, { n: 2 }]);
    });

    it('should process content part start events when resumed', () => {
      const { message } = createMessage();
      const cpStartSpy = vi.fn();
      message.onContentPartStart(cpStartSpy);

      message.pause();
      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: { contentPartId: 'paused-cp', startContentPart: { mimeType: 'text/plain' } },
      });
      expect(cpStartSpy).not.toHaveBeenCalled();

      message.resume();
      expect(cpStartSpy).toHaveBeenCalled();
    });

    it('should process tool call start events when resumed', () => {
      const { message } = createMessage();
      const tcStartSpy = vi.fn();
      message.onToolCallStart(tcStartSpy);

      message.pause();
      message.dispatch({
        messageId: MESSAGE_ID,
        toolCall: { toolCallId: 'paused-tc', startToolCall: { toolName: 'search' } },
      });
      expect(tcStartSpy).not.toHaveBeenCalled();

      message.resume();
      expect(tcStartSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onCompleted', () => {
    it('should aggregate content parts and tool calls on message end', () => {
      const { message } = createMessage();
      const completedSpy = vi.fn();
      message.onCompleted(completedSpy);

      // Dispatch content part lifecycle
      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: { contentPartId: 'cp-1', startContentPart: { mimeType: 'text/plain' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: { contentPartId: 'cp-1', chunk: { data: 'Hello' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: { contentPartId: 'cp-1', endContentPart: {} },
      });

      // Dispatch tool call lifecycle
      message.dispatch({
        messageId: MESSAGE_ID,
        toolCall: { toolCallId: 'tc-1', startToolCall: { toolName: 'search' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        toolCall: { toolCallId: 'tc-1', endToolCall: {} },
      });

      // End message
      message.dispatch({
        messageId: MESSAGE_ID,
        endMessage: {},
      });

      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          messageId: MESSAGE_ID,
          contentParts: expect.arrayContaining([
            expect.objectContaining({ data: 'Hello', mimeType: 'text/plain' }),
          ]),
          toolCalls: expect.arrayContaining([
            expect.objectContaining({ toolCallId: 'tc-1', toolName: 'search' }),
          ]),
        })
      );
    });
  });

  describe('onContentPartCompleted', () => {
    it('should fire for each completed content part', () => {
      const { message } = createMessage();
      const cpCompletedSpy = vi.fn();
      message.onContentPartCompleted(cpCompletedSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: { contentPartId: 'cp-1', startContentPart: { mimeType: 'text/plain' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: { contentPartId: 'cp-1', chunk: { data: 'Test' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        contentPart: { contentPartId: 'cp-1', endContentPart: {} },
      });

      expect(cpCompletedSpy).toHaveBeenCalledTimes(1);
      expect(cpCompletedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ data: 'Test', mimeType: 'text/plain' })
      );
    });
  });

  describe('onToolCallCompleted', () => {
    it('should fire when tool call ends', () => {
      const { message } = createMessage();
      const tcCompletedSpy = vi.fn();
      message.onToolCallCompleted(tcCompletedSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        toolCall: { toolCallId: 'tc-1', startToolCall: { toolName: 'search' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        toolCall: { toolCallId: 'tc-1', endToolCall: { output: 'result' } },
      });

      expect(tcCompletedSpy).toHaveBeenCalledTimes(1);
      expect(tcCompletedSpy).toHaveBeenCalledWith(
        expect.objectContaining({ toolCallId: 'tc-1', toolName: 'search', output: 'result' })
      );
    });
  });

  describe('delete functionality', () => {
    it('should delete message and trigger onDeleted handlers', () => {
      const { message } = createMessage();
      const deletedSpy = vi.fn();
      message.onDeleted(deletedSpy);

      message.delete();

      expect(message.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should unregister onDeleted handler correctly', () => {
      const { message } = createMessage();
      const handler = vi.fn();
      const cleanup = message.onDeleted(handler);

      cleanup();
      message.delete();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should delete all child content parts and tool calls', () => {
      const { message } = createMessage();
      const cp = message.startContentPart({ contentPartId: 'cp-del', mimeType: 'text/plain' });
      const tc = message.startToolCall({ toolCallId: 'tc-del', toolName: 'search' });
      const cpSpy = vi.fn();
      const tcSpy = vi.fn();
      cp.onDeleted(cpSpy);
      tc.onDeleted(tcSpy);

      message.delete();

      expect(cpSpy).toHaveBeenCalled();
      expect(tcSpy).toHaveBeenCalled();
    });

    it('should automatically delete when receiving end event via dispatch', () => {
      const { message } = createMessage();
      const deletedSpy = vi.fn();
      message.onDeleted(deletedSpy);

      message.dispatch({ messageId: MESSAGE_ID, endMessage: {} });

      expect(message.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });
  });

  describe('sendErrorStart and sendErrorEnd', () => {
    it('should emit message error start', () => {
      const { emitSpy, message } = createMessage();

      message.sendErrorStart({ errorId: 'me-1', message: 'msg fail' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              messageError: expect.objectContaining({
                errorId: 'me-1',
                startError: expect.objectContaining({ message: 'msg fail' }),
              }),
            }),
          }),
        })
      );
      expect(message.hasError).toBe(true);
    });

    it('should emit message error end', () => {
      const { emitSpy, message } = createMessage();
      message.sendErrorStart({ errorId: 'me-1', message: 'err' });
      emitSpy.mockClear();

      message.sendErrorEnd({ errorId: 'me-1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              messageError: expect.objectContaining({
                errorId: 'me-1',
                endError: expect.any(Object),
              }),
            }),
          }),
        })
      );
      expect(message.hasError).toBe(false);
    });
  });

  describe('replay', () => {
    it('should generate correct event sequence for message with content parts and tool calls', () => {
      const events = Array.from(MessageEventHelperImpl.replay({
        messageId: 'replay-msg',
        role: 'assistant' as any,
        createdTime: '2024-01-01T00:00:00Z',
        contentParts: [
          {
            contentPartId: 'replay-cp',
            mimeType: 'text/plain',
            data: { inline: 'Hello' },
            citations: [],
            createdTime: '2024-01-01T00:00:01Z',
          },
        ],
        toolCalls: [
          {
            toolCallId: 'replay-tc',
            name: 'search',
            input: { query: 'test' },
            createdTime: '2024-01-01T00:00:02Z',
          },
        ],
      } as any));

      expect(events[0]).toEqual(expect.objectContaining({
        messageId: 'replay-msg',
        startMessage: expect.objectContaining({ role: 'assistant' }),
      }));
      expect(events[events.length - 1]).toEqual(expect.objectContaining({
        messageId: 'replay-msg',
        endMessage: {},
      }));

      // Should contain contentPart events
      const cpEvents = events.filter(e => e.contentPart);
      expect(cpEvents.length).toBeGreaterThan(0);

      // Should contain toolCall events
      const tcEvents = events.filter(e => e.toolCall);
      expect(tcEvents.length).toBeGreaterThan(0);
    });
  });

  describe('startEventMaybe and startEvent', () => {
    it('should throw ConversationEventValidationError when startEventMaybe is undefined', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;

      const message = new MessageEventHelperImpl(exchange, 'no-start-msg', undefined);

      expect(message.startEventMaybe).toBeUndefined();
      expect(() => message.startEvent).toThrow(ConversationEventValidationError);
      expect(message.role).toBeUndefined();
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { message } = createMessage();
      expect(message.toString()).toBe(`MessageEventHelper(${MESSAGE_ID})`);
    });
  });

  describe('error propagation', () => {
    it('should dispatch error to manager anyErrorStart when local handler exists', () => {
      const { manager, message } = createMessage();
      const anyErrorSpy = vi.fn();
      manager.onAnyErrorStart(anyErrorSpy);
      manager.onUnhandledErrorStart(vi.fn());
      message.onErrorStart(vi.fn());

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', startError: { message: 'err' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'mse-1' })
      );
    });

    it('should dispatch to unhandled when no local handler exists', () => {
      const { manager, message } = createMessage();
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', startError: { message: 'unhandled' } },
      });

      expect(unhandledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'mse-1' })
      );
    });

    it('should store errors in errors map on error start', () => {
      const { message } = createMessage();
      message.onErrorStart(vi.fn());

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', startError: { message: 'mapped' } },
      });

      expect(message.hasError).toBe(true);
      expect(message.errors.has('mse-1')).toBe(true);
    });

    it('should remove errors from errors map on error end', () => {
      const { message } = createMessage();
      message.onErrorStart(vi.fn());

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', startError: { message: 'mapped' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', endError: {} },
      });

      expect(message.hasError).toBe(false);
    });

    it('should unregister error handlers correctly', () => {
      const { manager, message } = createMessage();
      const errorSpy = vi.fn();
      const cleanup = message.onErrorStart(errorSpy);
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      cleanup();

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', startError: { message: 'after cleanup' } },
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(unhandledSpy).toHaveBeenCalled();
    });

    it('should dispatch error end to manager anyErrorEnd', () => {
      const { manager, message } = createMessage();
      const anyErrorEndSpy = vi.fn();
      manager.onAnyErrorEnd(anyErrorEndSpy);
      manager.onUnhandledErrorStart(vi.fn());
      message.onErrorStart(vi.fn());

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', startError: { message: 'err' } },
      });
      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-1', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'mse-1' })
      );
    });

    it('should dispatch error end to local onErrorEnd handler', () => {
      const { message } = createMessage();
      const errorEndSpy = vi.fn();
      message.onErrorEnd(errorEndSpy);

      message.dispatch({
        messageId: MESSAGE_ID,
        messageError: { errorId: 'mse-end-1', endError: {} },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'mse-end-1' })
      );
    });

    it('should not throw when error end occurs without any handler', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
      const message = exchange.startMessage({ messageId: 'no-handler-msg', role: MessageRole.User }) as MessageEventHelperImpl;

      expect(() => {
        message.dispatch({
          messageId: 'no-handler-msg',
          messageError: { errorId: 'mse-nothrow', endError: {} },
        });
      }).not.toThrow();
    });
  });
});
