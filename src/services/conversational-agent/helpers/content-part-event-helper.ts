import type {
  Citation,
  CitationId,
  CitationOptions,
  CitationSource,
  ContentPart,
  ContentPartChunkEvent,
  ContentPartEndEvent,
  ContentPartEvent,
  ContentPartId,
  ContentPartStartEvent,
  InlineValue,
  MakeOptional,
  MakeRequired,
  MetaEvent,
  Simplify
} from '@/models/conversational-agent';

import { ConversationEventHelperBase } from './conversation-event-helper-base';
import type {
  ChunkHandler,
  CitationError,
  CompletedContentPart,
  ContentPartEndHandler,
  ErrorEndEventOptions,
  ErrorStartEventOptions
} from './conversation-event-helper-common';
import {
  CitationErrorType,
  ConversationEventValidationError
} from './conversation-event-helper-common';
import { isExternalValue } from './conversation-type-util';
import type { ContentPartStream } from '@/models/conversational-agent';
import type { MessageEventHelper, MessageEventHelperImpl } from './message-event-helper';

export type ContentPartStartEventWithData = Simplify<
  {
    data?: string;
  }
  & MakeOptional<ContentPartStartEvent, 'mimeType'>
>;

/**
 * Helper for managing content part events within a message.
 * Handles streaming content parts with start/chunk/end lifecycle.
 */
export abstract class ContentPartEventHelper extends ConversationEventHelperBase<
  ContentPartStartEvent,
  ContentPartEvent
> implements ContentPartStream {

  protected readonly _chunkHandlers = new Array<ChunkHandler>();
  protected readonly _endHandlers = new Array<ContentPartEndHandler>();

  constructor(
    public readonly message: MessageEventHelper,
    public readonly contentPartId: ContentPartId,

    /**
     * ContentPartStartEvent used to initialize the ContentPartEventHelper. Will be undefined if some other sub-event
     * was received before the start event. See also `startEvent`.
     */
    public readonly startEventMaybe: ContentPartStartEvent | undefined
  ) {
    super(message.manager);
    this.addStartEventTimestamp(startEventMaybe);
  }

  /**
   * ContentPartStartEvent used to initialize the ContentPartEventHelper. Throws an ConversationEventValidationError if
   * some other sub-event was received before the start event, which shouldn't happen under normal circumstances.
   */
  public get startEvent(): MakeRequired<ContentPartStartEvent, 'timestamp'> {
    if (!this.startEventMaybe) throw new ConversationEventValidationError(`Content part ${this.contentPartId} has no start event.`);
    return this.startEventMaybe as MakeRequired<ContentPartStartEvent, 'timestamp'>; // timestamp is set in the constructor
  }

  /**
   * The MIME type of this content part.
   * Returns undefined if the start event hasn't been received yet.
   */
  public get mimeType(): string | undefined {
    return this.startEventMaybe?.mimeType;
  }

  /**
   * Whether this content part is text (text/plain, text/markdown, etc.).
   * @example
   * ```typescript
   * message.onContentPartStart((contentPart) => {
   *   if (contentPart.isText) {
   *     contentPart.onChunk((chunk) => {
   *       console.log('Text chunk:', chunk.data);
   *     });
   *   }
   * });
   * ```
   */
  public get isText(): boolean {
    return this.startEventMaybe?.mimeType?.startsWith('text/') ?? false;
  }

  /**
   * Whether this content part is audio content.
   * @example
   * ```typescript
   * message.onContentPartStart((contentPart) => {
   *   if (contentPart.isAudio) {
   *     // Handle audio streaming
   *     contentPart.onChunk((chunk) => {
   *       audioPlayer.appendBuffer(chunk.data);
   *     });
   *   }
   * });
   * ```
   */
  public get isAudio(): boolean {
    return this.startEventMaybe?.mimeType?.startsWith('audio/') ?? false;
  }

  /**
   * Whether this content part is an image.
   */
  public get isImage(): boolean {
    return this.startEventMaybe?.mimeType?.startsWith('image/') ?? false;
  }

  /**
   * Whether this content part is markdown text.
   */
  public get isMarkdown(): boolean {
    return this.startEventMaybe?.mimeType === 'text/markdown';
  }

  /**
   * Whether this content part is a transcript (from speech-to-text).
   * @example
   * ```typescript
   * message.onContentPartStart((contentPart) => {
   *   if (contentPart.isTranscript) {
   *     console.log('User voice transcription:');
   *     contentPart.onChunk((chunk) => {
   *       process.stdout.write(chunk.data ?? '');
   *     });
   *   }
   * });
   * ```
   */
  public get isTranscript(): boolean {
    return this.startEventMaybe?.metaData?.isTranscript ?? false;
  }

  /**
   * Emits a content part event through the parent message.
   */
  public emit(contentPartEvent: Omit<ContentPartEvent, 'contentPartId'>) {
    this.message.emit({
      contentPart: { contentPartId: this.contentPartId, ...contentPartEvent }
    });
  }

  /**
   * Sends a content part chunk with optional sequence number and citation.
   * @throws Error if content part stream has already ended.
   */
  public sendChunk(chunk: ContentPartChunkEvent) {
    this.assertNotEnded();
    this.emit({
      chunk
    });
  }

  /**
   * Sends meta event for this content part stream.
   * @throws Error if content part stream has already ended.
   */
  public sendMetaEvent(metaEvent: MetaEvent) {
    this.assertNotEnded();
    this.emit({ metaEvent });
  }

  /**
   * Sends a chunk with citation start event.
   * @throws Error if content part stream has already ended.
   */
  public sendChunkWithCitationStart(chunk: Omit<ContentPartChunkEvent, 'citation'> & { citationId: CitationId }) {
    this.assertNotEnded();
    const { citationId, ...rest } = chunk;
    this.emit({
      chunk: {
        ...rest,
        citation: {
          citationId,
          startCitation: {}
        }
      }
    });
  }

  /**
   * Sends a chunk with citation end event.
   * @throws Error if content part stream has already ended.
   */
  public sendChunkWithCitationEnd(chunk: Omit<ContentPartChunkEvent, 'citation'> & { citationId: CitationId; sources: CitationSource[] }) {
    this.assertNotEnded();
    const { citationId, sources, ...rest } = chunk;
    this.emit({
      chunk: {
        ...rest,
        citation: {
          citationId,
          endCitation: { sources }
        }
      }
    });
  }

  /**
   * Sends a chunk with citation start and end event.
   * @throws Error if content part stream has already ended.
   */
  public sendChunkWithCitation(chunk: Omit<ContentPartChunkEvent, 'citation'> & { citationId: CitationId; sources: CitationSource[] }) {
    this.assertNotEnded();
    const { citationId, sources, ...rest } = chunk;
    this.emit({
      chunk: {
        ...rest,
        citation: {
          citationId,
          startCitation: {},
          endCitation: { sources }
        }
      }
    });
  }

  /**
   * Ends the content part stream with optional end event data.
   * @throws Error if content part stream has already ended.
   */
  public sendContentPartEnd(endContentPart: ContentPartEndEvent = {}) {
    this.assertNotEnded();
    this.setEnded();
    this.emit({ endContentPart });
    this.delete();
  }

  /**
   * @deprecated Use sendContentPartEnd
   */
  public sendEndContentPart(endContentPart: ContentPartEndEvent = {}) {
    this.sendContentPartEnd(endContentPart);
  }

  /**
   * Registers a handler for content part chunks.
   * @returns Cleanup function to remove the handler.
   */
  public onChunk(cb: ChunkHandler) {
    this._chunkHandlers.push(cb);
    return () => {
      const index = this._chunkHandlers.indexOf(cb);
      if (index >= 0) this._chunkHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for content part end events.
   * @returns Cleanup function to remove the handler.
   */
  public onContentPartEnd(cb: ContentPartEndHandler) {
    this._endHandlers.push(cb);
    return () => {
      const index = this._endHandlers.indexOf(cb);
      if (index >= 0) this._endHandlers.splice(index, 1);
    };
  }

  /**
   * @deprecated Use onContentPartEnd
   */
  public onEndContentPart(cb: ContentPartEndHandler) {
    this.onContentPartEnd(cb);
  }

  /**
   * Sends an error start event for this content part.
   */
  public sendErrorStart(args: ErrorStartEventOptions) {
    this.assertNotEnded();
    const { errorId: providedId, ...startError } = args;
    const errorId = providedId ?? this.manager.makeId();
    this.emit({
      contentPartError: {
        errorId,
        startError
      }
    });
    this.errors.set(errorId, startError);
  }

  /**
   * Sends an error end event for this content part.
   */
  public sendErrorEnd(args: ErrorEndEventOptions) {
    this.assertNotEnded();
    const { errorId, ...endError } = args;
    this.emit({
      contentPartError: {
        errorId,
        endError
      }
    });
    this.errors.delete(errorId);
  }

  public onComplete(cb: (completedContentPart: CompletedContentPart) => void) {

    let data = '';
    const citationOffsets = new Map<CitationId, number>();
    const citations = new Array<CitationOptions>();
    const citationErrors = new Array<CitationError>();

    this.onChunk(chunk => {

      if (chunk.citation?.startCitation) {
        citationOffsets.set(chunk.citation.citationId, data.length);
      }

      if (chunk.data !== undefined) {
        data += chunk.data;
      }

      if (chunk.citation?.endCitation) {
        const { citationId } = chunk.citation;
        const offset = citationOffsets.get(citationId);
        if (offset === undefined) {
          citationErrors.push({
            citationId,
            errorType: CitationErrorType.CitationNotStarted
          });
        } else {
          citations.push({
            citationId,
            offset,
            length: data.length - offset,
            sources: chunk.citation?.endCitation.sources
          });
          citationOffsets.delete(citationId);
        }
      }
    });

    this.onContentPartEnd(endContentPart => {

      citationErrors.push(
        ...Array.from(citationOffsets.keys())
          .map(citationId => ({ citationId, errorType: CitationErrorType.CitationNotEnded }))
      );

      // default to text/plain in cases where a start content part event wasn't received.
      const mimeType = this.startEventMaybe?.mimeType ?? 'text/plain';

      cb({
        contentPartId: this.contentPartId,
        data,
        citations,
        citationErrors,
        ...this.startEventMaybe,
        ...endContentPart,
        mimeType
      });
    });

  }

  public toString() {
    return `ContentPartEventHelper(${this.contentPartId})`;
  }

}

export class ContentPartEventHelperImpl extends ContentPartEventHelper {

  public static *replay(contentPart: ContentPart): Generator<ContentPartEvent> {

    yield {
      contentPartId: contentPart.contentPartId,
      startContentPart: {
        mimeType: contentPart.mimeType,
        ...(contentPart.isTranscript !== undefined ? { metaData: { isTranscript: contentPart.isTranscript } } : {}),
        timestamp: contentPart.createdTime ?? (contentPart as any).createdAt,
        ...(isExternalValue(contentPart.data) ? { externalValue: contentPart.data } : {})
      }
    };

    if (!isExternalValue(contentPart.data)) {
      for (const chunkEvent of this.replayChunks(contentPart.data, contentPart.citations)) {
        yield {
          contentPartId: contentPart.contentPartId,
          chunk: chunkEvent
        };
      }
    }

    yield {
      contentPartId: contentPart.contentPartId,
      endContentPart: {
        ...(contentPart.isIncomplete ? { interrupted: true } : {})
      }
    };

  }

  /**
   * Dispatches incoming content part events to registered handlers.
   */
  public dispatch(contentPartEvent: ContentPartEvent): void {
    if (contentPartEvent.contentPartId !== this.contentPartId) return;

    if (this._eventBuffer) {
      this._eventBuffer.push(contentPartEvent);
      return;
    }

    if (contentPartEvent.chunk) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._chunkHandlers.forEach(cb => cb(contentPartEvent.chunk!));
    }

    if (contentPartEvent.metaEvent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._metaEventHandlers.forEach(cb => cb(contentPartEvent.metaEvent!));
    }

    if (contentPartEvent.contentPartError?.startError) {
      this.dispatchErrorStart(contentPartEvent.contentPartError.errorId, contentPartEvent.contentPartError.startError);
    }

    if (contentPartEvent.contentPartError?.endError) {
      this.dispatchErrorEnd(contentPartEvent.contentPartError.errorId, contentPartEvent.contentPartError.endError);
    }

    if (contentPartEvent.endContentPart) {
      this.setEnded();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._endHandlers.forEach(cb => cb(contentPartEvent.endContentPart!));
      this.delete();
    }
  }

  protected getParentErrorScope(): boolean {
    return this.message.inErrorScope;
  }

  protected removeFromParent(): void {
    (this.message as MessageEventHelperImpl).removeContentPart(this);
  }

  protected deleteChildren(): void {
    // ContentPartEventHelper has no children
  }

  protected getSession() {
    return this.message.exchange.session;
  }

  private static *replayChunks(data: InlineValue<string>, citations: Citation[]): Generator<ContentPartChunkEvent> {

    if (citations.length === 0) {
      yield { data: data.inline };
    } else {

      // Process citations from first to last.
      citations.sort((a, b) => a.offset - b.offset);

      // We don't currently produce overlapping citations.
      citations.forEach((citation, index) => {
        if (index + 1 === citations.length) return; // last one can't overlap
        if (citation.offset + citation.length > citations[index + 1].offset) {
          throw new Error(`Overlapping citations are not supported. Citation ${citation.citationId} starts at offset ${citation.offset} and has length ${citation.length} but the next citation, ${citations[index + 1].citationId}, has offset ${citations[index + 1].offset}`);
        }
      });

      let offset = 0;

      for (const citation of citations) {

        // dispatch chunk with data after end of last citation and before current citation, or chunk before first citation
        if (citation.offset > offset) {
          yield {
            data: data.inline.substring(offset, citation.offset)
          };
          offset = citation.offset;
        }

        // dispatch chunk with data covered by the current citation
        yield {
          data: data.inline.substring(offset, offset + citation.length),
          citation: {
            citationId: citation.citationId,
            startCitation: { },
            endCitation: {
              sources: citation.sources
            }
          }
        };
        offset += citation.length;

      }

      // dispatch chunk with data following the last citation
      if (offset < data.inline.length) {
        yield {
          data: data.inline.substring(offset)
        };
      }

    }
  }

}
