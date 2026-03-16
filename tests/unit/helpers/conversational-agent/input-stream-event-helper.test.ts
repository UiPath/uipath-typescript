// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';
import { AsyncInputStreamEventHelperImpl } from '@/services/conversational-agent/helpers/input-stream-event-helper';
import {
  ConversationEventInvalidOperationError,
  ConversationEventValidationError,
} from '@/services/conversational-agent/helpers/conversation-event-helper-common';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';
const STREAM_ID = 'stream-1';

// ===== HELPERS =====
const createInputStream = () => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  manager.onUnhandledErrorStart(vi.fn());
  const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
  const stream = session.startAsyncInputStream({ streamId: STREAM_ID, mimeType: 'audio/wav' }) as AsyncInputStreamEventHelperImpl;
  emitSpy.mockClear();
  return { emitSpy, manager, session, stream };
};

// ===== TEST SUITE =====
describe('AsyncInputStreamEventHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have streamId set', () => {
      const { stream } = createInputStream();
      expect(stream.streamId).toBe(STREAM_ID);
    });

    it('should have startEvent accessible', () => {
      const { stream } = createInputStream();
      expect(stream.startEvent).toBeDefined();
    });

    it('should reference parent session', () => {
      const { stream, session } = createInputStream();
      expect(stream.session).toBe(session);
    });

    it('should have an empty properties object', () => {
      const { stream } = createInputStream();
      expect(stream.getProperties()).toEqual({});
    });

    it('should allow storing and retrieving custom properties', () => {
      const { stream } = createInputStream();
      stream.setProperties({ duration: 300, format: 'wav' });
      expect(stream.getProperties<any>().duration).toBe(300);
    });
  });

  describe('emit', () => {
    it('should emit input stream event through session', () => {
      const { emitSpy, stream } = createInputStream();

      stream.emit({ metaEvent: { key: 'val' } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: CONVERSATION_ID,
          asyncInputStream: expect.objectContaining({
            streamId: STREAM_ID,
            metaEvent: { key: 'val' },
          }),
        })
      );
    });
  });

  describe('sendChunk', () => {
    it('should emit chunk event', () => {
      const { emitSpy, stream } = createInputStream();

      stream.sendChunk({ data: 'audio data' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncInputStream: expect.objectContaining({
            streamId: STREAM_ID,
            chunk: { data: 'audio data' },
          }),
        })
      );
    });

    it('should throw after ended', () => {
      const { stream } = createInputStream();
      stream.sendAsyncInputStreamEnd();

      expect(() => stream.sendChunk({ data: 'x' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendMetaEvent', () => {
    it('should emit meta event', () => {
      const { emitSpy, stream } = createInputStream();

      stream.sendMetaEvent({ key: 'meta' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncInputStream: expect.objectContaining({
            streamId: STREAM_ID,
            metaEvent: { key: 'meta' },
          }),
        })
      );
    });

    it('should throw after ended', () => {
      const { stream } = createInputStream();
      stream.sendAsyncInputStreamEnd();

      expect(() => stream.sendMetaEvent({ k: 'v' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendAsyncInputStreamEnd', () => {
    it('should mark as ended, emit endAsyncInputStream, and delete', () => {
      const { emitSpy, stream } = createInputStream();
      const deletedSpy = vi.fn();
      stream.onDeleted(deletedSpy);

      stream.sendAsyncInputStreamEnd();

      expect(stream.ended).toBe(true);
      expect(stream.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncInputStream: expect.objectContaining({
            streamId: STREAM_ID,
            endAsyncInputStream: {},
          }),
        })
      );
    });

    it('should throw if already ended', () => {
      const { stream } = createInputStream();
      stream.sendAsyncInputStreamEnd();

      expect(() => stream.sendAsyncInputStreamEnd()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('handler registration and unregistration', () => {
    it('should register and unregister onChunk handler', () => {
      const { stream } = createInputStream();
      const handler = vi.fn();
      const cleanup = stream.onChunk(handler);

      cleanup();
      expect((stream as any)._chunkHandlers).toHaveLength(0);
    });

    it('should register and unregister onAsyncInputStreamEnd handler', () => {
      const { stream } = createInputStream();
      const handler = vi.fn();
      const cleanup = stream.onAsyncInputStreamEnd(handler);

      cleanup();
      expect((stream as any)._endHandlers).toHaveLength(0);
    });
  });

  describe('dispatch', () => {
    it('should dispatch chunk events to chunk handlers', () => {
      const { stream } = createInputStream();
      const chunkSpy = vi.fn();
      stream.onChunk(chunkSpy);

      stream.dispatch({
        streamId: STREAM_ID,
        chunk: { data: 'dispatched chunk' },
      });

      expect(chunkSpy).toHaveBeenCalledWith({ data: 'dispatched chunk' });
    });

    it('should dispatch metaEvent', () => {
      const { stream } = createInputStream();
      const metaSpy = vi.fn();
      stream.onMetaEvent(metaSpy);

      stream.dispatch({
        streamId: STREAM_ID,
        metaEvent: { key: 'val' },
      });

      expect(metaSpy).toHaveBeenCalledWith({ key: 'val' });
    });

    it('should dispatch endAsyncInputStream and mark ended', () => {
      const { stream } = createInputStream();
      const endSpy = vi.fn();
      stream.onAsyncInputStreamEnd(endSpy);

      stream.dispatch({
        streamId: STREAM_ID,
        endAsyncInputStream: {},
      });

      expect(endSpy).toHaveBeenCalled();
      expect(stream.ended).toBe(true);
      expect(stream.deleted).toBe(true);
    });

    it('should dispatch asyncInputStreamError start', () => {
      const { stream } = createInputStream();
      const errorSpy = vi.fn();
      stream.onErrorStart(errorSpy);

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: {
          errorId: 'is-err-1',
          startError: { message: 'stream error' },
        },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'is-err-1' })
      );
    });

    it('should dispatch asyncInputStreamError end', () => {
      const { stream } = createInputStream();
      const errorEndSpy = vi.fn();
      stream.onErrorEnd(errorEndSpy);

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'is-err-1', startError: { message: 'err' } },
      });
      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'is-err-1', endError: {} },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'is-err-1' })
      );
    });

    it('should ignore events for different streamId', () => {
      const { stream } = createInputStream();
      const chunkSpy = vi.fn();
      stream.onChunk(chunkSpy);

      stream.dispatch({
        streamId: 'other-stream',
        chunk: { data: 'ignored' },
      });

      expect(chunkSpy).not.toHaveBeenCalled();
    });

    it('should buffer events when paused', () => {
      const { stream } = createInputStream();
      const chunkSpy = vi.fn();
      stream.onChunk(chunkSpy);

      stream.pause();
      stream.dispatch({ streamId: STREAM_ID, chunk: { data: 'buffered' } });
      expect(chunkSpy).not.toHaveBeenCalled();

      stream.resume();
      expect(chunkSpy).toHaveBeenCalledWith({ data: 'buffered' });
    });
  });

  describe('sendErrorStart and sendErrorEnd', () => {
    it('should emit input stream error start', () => {
      const { emitSpy, stream } = createInputStream();

      stream.sendErrorStart({ errorId: 'ise-1', message: 'stream fail' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncInputStream: expect.objectContaining({
            asyncInputStreamError: expect.objectContaining({
              errorId: 'ise-1',
              startError: expect.objectContaining({ message: 'stream fail' }),
            }),
          }),
        })
      );
    });

    it('should emit input stream error end', () => {
      const { emitSpy, stream } = createInputStream();
      stream.sendErrorStart({ errorId: 'ise-1', message: 'err' });
      emitSpy.mockClear();

      stream.sendErrorEnd({ errorId: 'ise-1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          asyncInputStream: expect.objectContaining({
            asyncInputStreamError: expect.objectContaining({
              errorId: 'ise-1',
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

      const stream = new AsyncInputStreamEventHelperImpl(session, 'no-start-stream', undefined);

      expect(stream.startEventMaybe).toBeUndefined();
      expect(() => stream.startEvent).toThrow(ConversationEventValidationError);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { stream } = createInputStream();
      expect(stream.toString()).toBe(`AsyncInputStreamEventHelper(${STREAM_ID})`);
    });
  });

  describe('delete functionality', () => {
    it('should delete stream and trigger onDeleted handlers', () => {
      const { stream } = createInputStream();
      const deletedSpy = vi.fn();
      stream.onDeleted(deletedSpy);

      stream.delete();

      expect(stream.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should unregister onDeleted handler correctly', () => {
      const { stream } = createInputStream();
      const handler = vi.fn();
      const cleanup = stream.onDeleted(handler);

      cleanup();
      stream.delete();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should automatically delete when receiving end event via dispatch', () => {
      const { stream } = createInputStream();
      const deletedSpy = vi.fn();
      stream.onDeleted(deletedSpy);

      stream.dispatch({ streamId: STREAM_ID, endAsyncInputStream: {} });

      expect(stream.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should not be paused initially', () => {
      const { stream } = createInputStream();
      expect(stream.isPaused).toBe(false);
    });

    it('should pause event processing', () => {
      const { stream } = createInputStream();
      stream.pause();
      expect(stream.isPaused).toBe(true);
    });

    it('should process buffered events when resumed', () => {
      const { stream } = createInputStream();
      const chunkSpy = vi.fn();
      stream.onChunk(chunkSpy);

      stream.pause();
      stream.dispatch({ streamId: STREAM_ID, chunk: { data: 'b1' } });
      stream.dispatch({ streamId: STREAM_ID, chunk: { data: 'b2' } });

      stream.resume();
      expect(chunkSpy).toHaveBeenCalledTimes(2);
    });

    it('should buffer stream end event when paused', () => {
      const { stream } = createInputStream();
      const endSpy = vi.fn();
      stream.onAsyncInputStreamEnd(endSpy);

      stream.pause();
      stream.dispatch({ streamId: STREAM_ID, endAsyncInputStream: {} });
      expect(endSpy).not.toHaveBeenCalled();

      stream.resume();
      expect(endSpy).toHaveBeenCalled();
    });

    it('should allow multiple pause calls without error', () => {
      const { stream } = createInputStream();
      stream.pause();
      stream.pause();
      expect(stream.isPaused).toBe(true);
    });

    it('should allow resume when not paused', () => {
      const { stream } = createInputStream();
      stream.resume();
      expect(stream.isPaused).toBe(false);
    });

    it('should maintain event order when buffering', () => {
      const { stream } = createInputStream();
      const events: string[] = [];
      stream.onChunk((e: any) => events.push('chunk:' + e.data));
      stream.onMetaEvent((e: any) => events.push('meta:' + e.key));

      stream.pause();
      stream.dispatch({ streamId: STREAM_ID, chunk: { data: 'c1' } });
      stream.dispatch({ streamId: STREAM_ID, metaEvent: { key: 'm1' } });
      stream.dispatch({ streamId: STREAM_ID, chunk: { data: 'c2' } });

      stream.resume();

      expect(events).toEqual(['chunk:c1', 'meta:m1', 'chunk:c2']);
    });
  });

  describe('error propagation', () => {
    it('should dispatch error to manager anyErrorStart when local handler exists', () => {
      const { manager, stream } = createInputStream();
      const anyErrorSpy = vi.fn();
      manager.onAnyErrorStart(anyErrorSpy);
      manager.onUnhandledErrorStart(vi.fn());
      stream.onErrorStart(vi.fn());

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-1', startError: { message: 'err' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ise-1' })
      );
    });

    it('should dispatch to unhandled when no local handler exists', () => {
      const { manager, stream } = createInputStream();
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-1', startError: { message: 'unhandled' } },
      });

      expect(unhandledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ise-1' })
      );
    });

    it('should store errors in errors map on error start', () => {
      const { stream } = createInputStream();
      stream.onErrorStart(vi.fn());

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-1', startError: { message: 'mapped' } },
      });

      expect(stream.hasError).toBe(true);
      expect(stream.errors.has('ise-1')).toBe(true);
    });

    it('should remove errors from errors map on error end', () => {
      const { stream } = createInputStream();
      stream.onErrorStart(vi.fn());

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-1', startError: { message: 'mapped' } },
      });
      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-1', endError: {} },
      });

      expect(stream.hasError).toBe(false);
    });

    it('should unregister error handlers correctly', () => {
      const { manager, stream } = createInputStream();
      const errorSpy = vi.fn();
      const cleanup = stream.onErrorStart(errorSpy);
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      cleanup();

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-1', startError: { message: 'after cleanup' } },
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(unhandledSpy).toHaveBeenCalled();
    });

    it('should dispatch error end to local onErrorEnd handler', () => {
      const { stream } = createInputStream();
      const errorEndSpy = vi.fn();
      stream.onErrorEnd(errorEndSpy);

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-end-1', endError: {} },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ise-end-1' })
      );
    });

    it('should dispatch error end to manager anyErrorEnd', () => {
      const { manager, stream } = createInputStream();
      const anyErrorEndSpy = vi.fn();
      manager.onAnyErrorEnd(anyErrorEndSpy);
      stream.onErrorEnd(vi.fn());

      stream.dispatch({
        streamId: STREAM_ID,
        asyncInputStreamError: { errorId: 'ise-any-end', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'ise-any-end' })
      );
    });

    it('should not throw when error end occurs without any handler', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const stream = session.startAsyncInputStream({ streamId: 'no-handler-stream', mimeType: 'audio/wav' }) as AsyncInputStreamEventHelperImpl;

      expect(() => {
        stream.dispatch({
          streamId: 'no-handler-stream',
          asyncInputStreamError: { errorId: 'ise-nothrow', endError: {} },
        });
      }).not.toThrow();
    });
  });
});
