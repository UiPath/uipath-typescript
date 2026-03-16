// ===== IMPORTS =====
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ConversationEventHelperManagerImpl } from '@/services/conversational-agent/helpers/conversation-event-helper-manager';
import { SessionEventHelperImpl } from '@/services/conversational-agent/helpers/session-event-helper';
import { ExchangeEventHelperImpl } from '@/services/conversational-agent/helpers/exchange-event-helper';
import { MessageEventHelperImpl } from '@/services/conversational-agent/helpers/message-event-helper';
import { ContentPartEventHelperImpl } from '@/services/conversational-agent/helpers/content-part-event-helper';
import {
  ConversationEventInvalidOperationError,
  ConversationEventValidationError,
  CitationErrorType,
} from '@/services/conversational-agent/helpers/conversation-event-helper-common';
import { MessageRole } from '@/models/conversational-agent/conversations/types/common.types';

// ===== TEST CONSTANTS =====
const CONVERSATION_ID = 'test-conv-id';
const EXCHANGE_ID = 'ex-1';
const MESSAGE_ID = 'msg-1';
const CONTENT_PART_ID = 'cp-1';

// ===== HELPERS =====
const createContentPart = (mimeType = 'text/plain') => {
  const emitSpy = vi.fn();
  const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
  manager.onUnhandledErrorStart(vi.fn());
  const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
  const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
  const message = exchange.startMessage({ messageId: MESSAGE_ID, role: MessageRole.Assistant }) as MessageEventHelperImpl;
  const contentPart = message.startContentPart({ contentPartId: CONTENT_PART_ID, mimeType }) as ContentPartEventHelperImpl;
  emitSpy.mockClear();
  return { emitSpy, manager, session, exchange, message, contentPart };
};

// ===== TEST SUITE =====
describe('ContentPartEventHelper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and properties', () => {
    it('should have contentPartId set', () => {
      const { contentPart } = createContentPart();
      expect(contentPart.contentPartId).toBe(CONTENT_PART_ID);
    });

    it('should have startEvent accessible with timestamp', () => {
      const { contentPart } = createContentPart();
      expect(contentPart.startEvent).toBeDefined();
      expect(contentPart.startEvent.timestamp).toBeDefined();
    });

    it('should reference parent message', () => {
      const { contentPart, message } = createContentPart();
      expect(contentPart.message).toBe(message);
    });

    it('should have mimeType accessible', () => {
      const { contentPart } = createContentPart('text/markdown');
      expect(contentPart.mimeType).toBe('text/markdown');
    });

    it('should have an empty properties object', () => {
      const { contentPart } = createContentPart();
      expect(contentPart.getProperties()).toEqual({});
      expect(typeof contentPart.getProperties()).toBe('object');
    });

    it('should allow storing and retrieving custom properties', () => {
      const { contentPart } = createContentPart();
      contentPart.setProperties({ custom: 'val' });
      expect(contentPart.getProperties<any>().custom).toBe('val');
    });
  });

  describe('MIME type checks', () => {
    it('should report isText correctly', () => {
      const { contentPart } = createContentPart('text/plain');
      expect(contentPart.isText).toBe(true);
      expect(contentPart.isMarkdown).toBe(false);
    });

    it('should report isMarkdown correctly', () => {
      const { contentPart } = createContentPart('text/markdown');
      expect(contentPart.isMarkdown).toBe(true);
      expect(contentPart.isText).toBe(false);
    });

    it('should report isHtml correctly', () => {
      const { contentPart } = createContentPart('text/html');
      expect(contentPart.isHtml).toBe(true);
    });

    it('should report isAudio correctly', () => {
      const { contentPart } = createContentPart('audio/wav');
      expect(contentPart.isAudio).toBe(true);
    });

    it('should report isImage correctly', () => {
      const { contentPart } = createContentPart('image/png');
      expect(contentPart.isImage).toBe(true);
    });
  });

  describe('emit', () => {
    it('should emit content part event through message envelope', () => {
      const { emitSpy, contentPart } = createContentPart();

      contentPart.emit({ metaEvent: { key: 'val' } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                contentPartId: CONTENT_PART_ID,
                metaEvent: { key: 'val' },
              }),
            }),
          }),
        })
      );
    });
  });

  describe('sendChunk', () => {
    it('should emit chunk event', () => {
      const { emitSpy, contentPart } = createContentPart();

      contentPart.sendChunk({ data: 'Hello' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                contentPartId: CONTENT_PART_ID,
                chunk: { data: 'Hello' },
              }),
            }),
          }),
        })
      );
    });

    it('should throw after ended', () => {
      const { contentPart } = createContentPart();
      contentPart.sendContentPartEnd();

      expect(() => contentPart.sendChunk({ data: 'x' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendChunkWithCitation', () => {
    it('should emit chunk with citation start and end', () => {
      const { emitSpy, contentPart } = createContentPart();

      contentPart.sendChunkWithCitation({
        data: 'cited text',
        citationId: 'cite-1',
        sources: [{ title: 'Source 1', number: 1 } as any],
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                chunk: expect.objectContaining({
                  data: 'cited text',
                  citation: expect.objectContaining({
                    citationId: 'cite-1',
                    startCitation: {},
                    endCitation: expect.objectContaining({
                      sources: expect.arrayContaining([
                        expect.objectContaining({ title: 'Source 1' }),
                      ]),
                    }),
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('sendChunkWithCitationStart', () => {
    it('should emit chunk with citation start only', () => {
      const { emitSpy, contentPart } = createContentPart();

      contentPart.sendChunkWithCitationStart({ data: 'start', citationId: 'cite-1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                chunk: expect.objectContaining({
                  data: 'start',
                  citation: expect.objectContaining({
                    citationId: 'cite-1',
                    startCitation: {},
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('sendChunkWithCitationEnd', () => {
    it('should emit chunk with citation end only', () => {
      const { emitSpy, contentPart } = createContentPart();

      contentPart.sendChunkWithCitationEnd({
        data: 'end',
        citationId: 'cite-1',
        sources: [{ title: 'Source' } as any],
      });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                chunk: expect.objectContaining({
                  data: 'end',
                  citation: expect.objectContaining({
                    citationId: 'cite-1',
                    endCitation: expect.objectContaining({
                      sources: expect.any(Array),
                    }),
                  }),
                }),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('sendContentPartEnd', () => {
    it('should mark as ended, emit endContentPart, and delete', () => {
      const { emitSpy, contentPart } = createContentPart();
      const deletedSpy = vi.fn();
      contentPart.onDeleted(deletedSpy);

      contentPart.sendContentPartEnd();

      expect(contentPart.ended).toBe(true);
      expect(contentPart.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                contentPartId: CONTENT_PART_ID,
                endContentPart: {},
              }),
            }),
          }),
        })
      );
    });

    it('should throw if already ended', () => {
      const { contentPart } = createContentPart();
      contentPart.sendContentPartEnd();

      expect(() => contentPart.sendContentPartEnd()).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('sendMetaEvent', () => {
    it('should emit meta event through content part envelope', () => {
      const { emitSpy, contentPart } = createContentPart();

      contentPart.sendMetaEvent({ key: 'value', nested: { prop: true } });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                contentPartId: CONTENT_PART_ID,
                metaEvent: { key: 'value', nested: { prop: true } },
              }),
            }),
          }),
        })
      );
    });

    it('should throw after ended', () => {
      const { contentPart } = createContentPart();
      contentPart.sendContentPartEnd();

      expect(() => contentPart.sendMetaEvent({ k: 'v' })).toThrow(ConversationEventInvalidOperationError);
    });
  });

  describe('handler registration and unregistration', () => {
    it('should register and unregister onChunk handler', () => {
      const { contentPart } = createContentPart();
      const handler = vi.fn();
      const cleanup = contentPart.onChunk(handler);

      cleanup();
      expect((contentPart as any)._chunkHandlers).toHaveLength(0);
    });

    it('should register and unregister onContentPartEnd handler', () => {
      const { contentPart } = createContentPart();
      const handler = vi.fn();
      const cleanup = contentPart.onContentPartEnd(handler);

      cleanup();
      expect((contentPart as any)._endHandlers).toHaveLength(0);
    });
  });

  describe('dispatch', () => {
    it('should dispatch chunk events to chunk handlers', () => {
      const { contentPart } = createContentPart();
      const chunkSpy = vi.fn();
      contentPart.onChunk(chunkSpy);

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        chunk: { data: 'dispatched chunk' },
      });

      expect(chunkSpy).toHaveBeenCalledWith({ data: 'dispatched chunk' });
    });

    it('should dispatch metaEvent to meta handlers', () => {
      const { contentPart } = createContentPart();
      const metaSpy = vi.fn();
      contentPart.onMetaEvent(metaSpy);

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        metaEvent: { info: 'meta' },
      });

      expect(metaSpy).toHaveBeenCalledWith({ info: 'meta' });
    });

    it('should dispatch endContentPart and mark ended and deleted', () => {
      const { contentPart } = createContentPart();
      const endSpy = vi.fn();
      contentPart.onContentPartEnd(endSpy);

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        endContentPart: {},
      });

      expect(endSpy).toHaveBeenCalled();
      expect(contentPart.ended).toBe(true);
      expect(contentPart.deleted).toBe(true);
    });

    it('should dispatch contentPartError start', () => {
      const { contentPart } = createContentPart();
      const errorSpy = vi.fn();
      contentPart.onErrorStart(errorSpy);

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: {
          errorId: 'cp-err-1',
          startError: { message: 'cp error' },
        },
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'cp-err-1' })
      );
    });

    it('should ignore events for different contentPartId', () => {
      const { contentPart } = createContentPart();
      const chunkSpy = vi.fn();
      contentPart.onChunk(chunkSpy);

      contentPart.dispatch({
        contentPartId: 'other-cp',
        chunk: { data: 'ignored' },
      });

      expect(chunkSpy).not.toHaveBeenCalled();
    });

    it('should buffer events when paused', () => {
      const { contentPart } = createContentPart();
      const chunkSpy = vi.fn();
      contentPart.onChunk(chunkSpy);

      contentPart.pause();
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, chunk: { data: 'buffered' } });
      expect(chunkSpy).not.toHaveBeenCalled();

      contentPart.resume();
      expect(chunkSpy).toHaveBeenCalledWith({ data: 'buffered' });
    });
  });

  describe('onCompleted', () => {
    it('should accumulate data and fire on endContentPart', () => {
      const { contentPart } = createContentPart('text/plain');
      const completedSpy = vi.fn();
      contentPart.onCompleted(completedSpy);

      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, chunk: { data: 'Hello ' } });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, chunk: { data: 'World' } });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, endContentPart: {} });

      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPartId: CONTENT_PART_ID,
          data: 'Hello World',
          mimeType: 'text/plain',
          citations: [],
          citationErrors: [],
        })
      );
    });

    it('should track citations correctly', () => {
      const { contentPart } = createContentPart('text/markdown');
      const completedSpy = vi.fn();
      contentPart.onCompleted(completedSpy);

      // "Before " (7 chars), then "cited" (5 chars) with citation, then " after"
      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        chunk: { data: 'Before ' },
      });
      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        chunk: {
          data: 'cited',
          citation: {
            citationId: 'c1',
            startCitation: {},
            endCitation: { sources: [{ title: 'Src', number: 1 } as any] },
          },
        },
      });
      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        chunk: { data: ' after' },
      });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, endContentPart: {} });

      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: 'Before cited after',
          citations: expect.arrayContaining([
            expect.objectContaining({
              citationId: 'c1',
              offset: 7,
              length: 5,
            }),
          ]),
          citationErrors: [],
        })
      );
    });

    it('should report citation errors for unended citations', () => {
      const { contentPart } = createContentPart();
      const completedSpy = vi.fn();
      contentPart.onCompleted(completedSpy);

      // Start citation but never end it
      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        chunk: {
          data: 'text',
          citation: { citationId: 'c-unended', startCitation: {} },
        },
      });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, endContentPart: {} });

      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          citationErrors: expect.arrayContaining([
            expect.objectContaining({
              citationId: 'c-unended',
              errorType: CitationErrorType.CitationNotEnded,
            }),
          ]),
        })
      );
    });

    it('should report citation errors for endCitation without startCitation', () => {
      const { contentPart } = createContentPart();
      const completedSpy = vi.fn();
      contentPart.onCompleted(completedSpy);

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        chunk: {
          data: 'text',
          citation: {
            citationId: 'c-nostart',
            endCitation: { sources: [] },
          },
        },
      });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, endContentPart: {} });

      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          citationErrors: expect.arrayContaining([
            expect.objectContaining({
              citationId: 'c-nostart',
              errorType: CitationErrorType.CitationNotStarted,
            }),
          ]),
        })
      );
    });

    it('should handle onCompleted without a start event', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
      const message = exchange.startMessage({ messageId: MESSAGE_ID }) as MessageEventHelperImpl;

      // Create content part without start event (as dispatch does)
      const cp = new ContentPartEventHelperImpl(message, 'no-start-cp', undefined);
      const completedSpy = vi.fn();
      cp.onCompleted(completedSpy);

      cp.dispatch({ contentPartId: 'no-start-cp', chunk: { data: 'Hello' } });
      cp.dispatch({ contentPartId: 'no-start-cp', endContentPart: {} });

      expect(completedSpy).toHaveBeenCalledTimes(1);
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPartId: 'no-start-cp',
          data: 'Hello',
        })
      );
    });
  });

  describe('sendErrorStart and sendErrorEnd', () => {
    it('should emit content part error start', () => {
      const { emitSpy, contentPart } = createContentPart();

      contentPart.sendErrorStart({ errorId: 'cpe-1', message: 'cp fail' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                contentPartError: expect.objectContaining({
                  errorId: 'cpe-1',
                  startError: expect.objectContaining({ message: 'cp fail' }),
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should emit content part error end', () => {
      const { emitSpy, contentPart } = createContentPart();
      contentPart.sendErrorStart({ errorId: 'cpe-1', message: 'err' });
      emitSpy.mockClear();

      contentPart.sendErrorEnd({ errorId: 'cpe-1' });

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          exchange: expect.objectContaining({
            message: expect.objectContaining({
              contentPart: expect.objectContaining({
                contentPartError: expect.objectContaining({
                  errorId: 'cpe-1',
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
    it('should generate events for inline content part without citations', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp',
        mimeType: 'text/plain',
        data: { inline: 'Hello World' },
        citations: [],
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      expect(events[0]).toEqual(expect.objectContaining({
        contentPartId: 'replay-cp',
        startContentPart: expect.objectContaining({ mimeType: 'text/plain' }),
      }));

      const chunkEvents = events.filter(e => e.chunk);
      expect(chunkEvents).toHaveLength(1);
      expect(chunkEvents[0].chunk!.data).toBe('Hello World');

      expect(events[events.length - 1]).toEqual(expect.objectContaining({
        contentPartId: 'replay-cp',
        endContentPart: {},
      }));
    });

    it('should generate events for content part with citations', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-cite',
        mimeType: 'text/markdown',
        data: { inline: 'Before cited after' },
        citations: [
          {
            citationId: 'c1',
            offset: 7,
            length: 5,
            sources: [{ title: 'Source 1' }],
          },
        ],
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      const chunkEvents = events.filter(e => e.chunk);
      expect(chunkEvents.length).toBeGreaterThan(1);

      // Should have a chunk with citation
      const citedChunk = chunkEvents.find(e => e.chunk?.citation);
      expect(citedChunk).toBeDefined();
      expect(citedChunk!.chunk!.data).toBe('cited');
      expect(citedChunk!.chunk!.citation!.citationId).toBe('c1');
    });

    it('should generate events for external content part', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-ext',
        mimeType: 'application/pdf',
        data: { uri: 'https://example.com/doc.pdf', byteCount: 1234 },
        citations: [],
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      expect(events[0].startContentPart).toEqual(expect.objectContaining({
        mimeType: 'application/pdf',
        externalValue: expect.objectContaining({ uri: 'https://example.com/doc.pdf' }),
      }));

      // External content should not have chunk events
      const chunkEvents = events.filter(e => e.chunk);
      expect(chunkEvents).toHaveLength(0);
    });

    it('should set interrupted flag for incomplete content parts', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-inc',
        mimeType: 'text/plain',
        data: { inline: 'partial' },
        citations: [],
        isIncomplete: true,
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      const endEvent = events[events.length - 1];
      expect(endEvent.endContentPart).toEqual({ interrupted: true });
    });

    it('should include isTranscript metadata when present', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-trans',
        mimeType: 'text/plain',
        data: { inline: 'transcript text' },
        citations: [],
        isTranscript: true,
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      expect(events[0].startContentPart).toEqual(expect.objectContaining({
        metaData: { isTranscript: true },
      }));
    });

    it('should replay inline content with citation at the start', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-cs',
        mimeType: 'text/plain',
        data: { inline: 'cited rest' },
        citations: [{ citationId: 'c1', offset: 0, length: 5, sources: [{ title: 'S1' }] }],
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      const chunkEvents = events.filter(e => e.chunk);
      const citedChunk = chunkEvents.find(e => e.chunk?.citation);
      expect(citedChunk).toBeDefined();
      expect(citedChunk!.chunk!.data).toBe('cited');
    });

    it('should replay inline content with citation at the end', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-ce',
        mimeType: 'text/plain',
        data: { inline: 'text cited' },
        citations: [{ citationId: 'c1', offset: 5, length: 5, sources: [{ title: 'S1' }] }],
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      const chunkEvents = events.filter(e => e.chunk);
      const citedChunk = chunkEvents.find(e => e.chunk?.citation);
      expect(citedChunk).toBeDefined();
      expect(citedChunk!.chunk!.data).toBe('cited');
    });

    it('should replay inline content with multiple citations', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-mc',
        mimeType: 'text/plain',
        data: { inline: 'aaa bbb ccc' },
        citations: [
          { citationId: 'c1', offset: 0, length: 3, sources: [{ title: 'S1' }] },
          { citationId: 'c2', offset: 4, length: 3, sources: [{ title: 'S2' }] },
        ],
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      const citedChunks = events.filter(e => e.chunk?.citation);
      expect(citedChunks.length).toBe(2);
    });

    it('should replay inline content with adjacent citations', () => {
      const events = Array.from(ContentPartEventHelperImpl.replay({
        contentPartId: 'replay-cp-adj',
        mimeType: 'text/plain',
        data: { inline: 'aaabbb' },
        citations: [
          { citationId: 'c1', offset: 0, length: 3, sources: [{ title: 'S1' }] },
          { citationId: 'c2', offset: 3, length: 3, sources: [{ title: 'S2' }] },
        ],
        createdTime: '2024-01-01T00:00:00Z',
      } as any));

      const citedChunks = events.filter(e => e.chunk?.citation);
      expect(citedChunks.length).toBe(2);
    });

    it('should throw error for overlapping citations in inline content', () => {
      expect(() => {
        const _events = Array.from(ContentPartEventHelperImpl.replay({
          contentPartId: 'replay-cp-overlap',
          mimeType: 'text/plain',
          data: { inline: 'Text with overlapping citations here.' },
          citations: [
            { citationId: 'c1', offset: 10, length: 20, sources: [{ title: 'S1' }] },
            { citationId: 'c2', offset: 25, length: 10, sources: [{ title: 'S2' }] },
          ],
          createdTime: '2024-01-01T00:00:00Z',
        } as any));
      }).toThrowError(/[Oo]verlapping/);
    });
  });

  describe('startEventMaybe and startEvent', () => {
    it('should throw ConversationEventValidationError when startEventMaybe is undefined', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
      const message = exchange.startMessage({ messageId: MESSAGE_ID }) as MessageEventHelperImpl;

      const cp = new ContentPartEventHelperImpl(message, 'no-start-cp', undefined);

      expect(cp.startEventMaybe).toBeUndefined();
      expect(() => cp.startEvent).toThrow(ConversationEventValidationError);
      expect(cp.mimeType).toBeUndefined();
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const { contentPart } = createContentPart();
      expect(contentPart.toString()).toBe(`ContentPartEventHelper(${CONTENT_PART_ID})`);
    });
  });

  describe('delete functionality', () => {
    it('should delete contentPart and trigger onDeleted handlers', () => {
      const { contentPart } = createContentPart();
      const deletedSpy = vi.fn();
      contentPart.onDeleted(deletedSpy);

      contentPart.delete();

      expect(contentPart.deleted).toBe(true);
      expect(deletedSpy).toHaveBeenCalled();
    });

    it('should unregister onDeleted handler correctly', () => {
      const { contentPart } = createContentPart();
      const handler = vi.fn();
      const cleanup = contentPart.onDeleted(handler);

      cleanup();
      contentPart.delete();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('pause and resume', () => {
    it('should not be paused initially', () => {
      const { contentPart } = createContentPart();
      expect(contentPart.isPaused).toBe(false);
    });

    it('should pause event processing', () => {
      const { contentPart } = createContentPart();
      contentPart.pause();
      expect(contentPart.isPaused).toBe(true);
    });

    it('should process buffered events when resumed', () => {
      const { contentPart } = createContentPart();
      const chunkSpy = vi.fn();
      contentPart.onChunk(chunkSpy);

      contentPart.pause();
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, chunk: { data: 'b1' } });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, chunk: { data: 'b2' } });

      contentPart.resume();
      expect(chunkSpy).toHaveBeenCalledTimes(2);
    });

    it('should buffer content part end event when paused', () => {
      const { contentPart } = createContentPart();
      const endSpy = vi.fn();
      contentPart.onContentPartEnd(endSpy);

      contentPart.pause();
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, endContentPart: {} });
      expect(endSpy).not.toHaveBeenCalled();

      contentPart.resume();
      expect(endSpy).toHaveBeenCalled();
    });

    it('should allow multiple pause calls without error', () => {
      const { contentPart } = createContentPart();
      contentPart.pause();
      contentPart.pause();
      expect(contentPart.isPaused).toBe(true);
    });

    it('should allow resume when not paused', () => {
      const { contentPart } = createContentPart();
      contentPart.resume();
      expect(contentPart.isPaused).toBe(false);
    });

    it('should maintain event order when buffering', () => {
      const { contentPart } = createContentPart();
      const events: string[] = [];
      contentPart.onChunk((e: any) => events.push(e.data));
      contentPart.onMetaEvent((e: any) => events.push('meta:' + e.key));

      contentPart.pause();
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, chunk: { data: 'c1' } });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, metaEvent: { key: 'm1' } });
      contentPart.dispatch({ contentPartId: CONTENT_PART_ID, chunk: { data: 'c2' } });

      contentPart.resume();

      expect(events).toEqual(['c1', 'meta:m1', 'c2']);
    });
  });

  describe('error propagation', () => {
    it('should dispatch error to manager anyErrorStart when local handler exists', () => {
      const { manager, contentPart } = createContentPart();
      const anyErrorSpy = vi.fn();
      manager.onAnyErrorStart(anyErrorSpy);
      manager.onUnhandledErrorStart(vi.fn());
      contentPart.onErrorStart(vi.fn());

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-1', startError: { message: 'err' } },
      });

      expect(anyErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'cpe-1' })
      );
    });

    it('should dispatch to unhandled when no local handler exists', () => {
      const { manager, contentPart } = createContentPart();
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-1', startError: { message: 'unhandled' } },
      });

      expect(unhandledSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'cpe-1' })
      );
    });

    it('should store errors in errors map on error start', () => {
      const { contentPart } = createContentPart();
      contentPart.onErrorStart(vi.fn());

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-1', startError: { message: 'mapped' } },
      });

      expect(contentPart.hasError).toBe(true);
      expect(contentPart.errors.has('cpe-1')).toBe(true);
    });

    it('should remove errors from errors map on error end', () => {
      const { contentPart } = createContentPart();
      contentPart.onErrorStart(vi.fn());

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-1', startError: { message: 'mapped' } },
      });
      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-1', endError: {} },
      });

      expect(contentPart.hasError).toBe(false);
    });

    it('should unregister error handlers correctly', () => {
      const { manager, contentPart } = createContentPart();
      const errorSpy = vi.fn();
      const cleanup = contentPart.onErrorStart(errorSpy);
      const unhandledSpy = vi.fn();
      manager.onUnhandledErrorStart(unhandledSpy);

      cleanup();

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-1', startError: { message: 'after cleanup' } },
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(unhandledSpy).toHaveBeenCalled();
    });

    it('should dispatch error end to local onErrorEnd handler', () => {
      const { contentPart } = createContentPart();
      const errorEndSpy = vi.fn();
      contentPart.onErrorEnd(errorEndSpy);

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-end-1', endError: {} },
      });

      expect(errorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'cpe-end-1' })
      );
    });

    it('should dispatch error end to manager anyErrorEnd', () => {
      const { manager, contentPart } = createContentPart();
      const anyErrorEndSpy = vi.fn();
      manager.onAnyErrorEnd(anyErrorEndSpy);
      contentPart.onErrorEnd(vi.fn());

      contentPart.dispatch({
        contentPartId: CONTENT_PART_ID,
        contentPartError: { errorId: 'cpe-any-end', endError: {} },
      });

      expect(anyErrorEndSpy).toHaveBeenCalledWith(
        expect.objectContaining({ errorId: 'cpe-any-end' })
      );
    });

    it('should not throw when error end occurs without any handler', () => {
      const emitSpy = vi.fn();
      const manager = new ConversationEventHelperManagerImpl({ emit: emitSpy });
      const session = manager.startSession({ conversationId: CONVERSATION_ID }) as SessionEventHelperImpl;
      const exchange = session.startExchange({ exchangeId: EXCHANGE_ID }) as ExchangeEventHelperImpl;
      const message = exchange.startMessage({ messageId: MESSAGE_ID }) as MessageEventHelperImpl;
      const cp = message.startContentPart({ contentPartId: 'no-handler-cp', mimeType: 'text/plain' }) as ContentPartEventHelperImpl;

      expect(() => {
        cp.dispatch({
          contentPartId: 'no-handler-cp',
          contentPartError: { errorId: 'cpe-nothrow', endError: {} },
        });
      }).not.toThrow();
    });
  });
});
