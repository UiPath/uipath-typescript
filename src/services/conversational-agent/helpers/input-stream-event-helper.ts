import type {
  AsyncInputStreamChunkEvent,
  AsyncInputStreamEndEvent,
  AsyncInputStreamEvent,
  AsyncInputStreamStartEvent,
  MetaEvent
} from '@/models/conversational-agent';

import { ConversationEventHelperBase } from './conversation-event-helper-base';
import {
  type AsyncInputStreamChunkHandler,
  type AsyncInputStreamEndHandler,
  ConversationEventValidationError,
  type ErrorEndEventOptions,
  type ErrorStartEventOptions
} from './conversation-event-helper-common';
import type { SessionEventHelper, SessionEventHelperImpl } from './session-event-helper';

/**
 * Helper for managing async input stream events within a conversation.
 * Handles streaming input with start/chunk/end lifecycle.
 */
export abstract class AsyncInputStreamEventHelper extends ConversationEventHelperBase<
  AsyncInputStreamStartEvent,
  AsyncInputStreamEvent
> {

  protected readonly _chunkHandlers = new Array<AsyncInputStreamChunkHandler>();
  protected readonly _endHandlers = new Array<AsyncInputStreamEndHandler>();

  constructor(
    public readonly session: SessionEventHelper,
    public readonly streamId: string,

    /**
     * AsyncInputStreamStartEvent used to initialize the AsyncInputStreamEventHelper. Will be undefined if some other
     * sub-event was received before the start event. Which shouldn't happen under normal circumstances.
     */
    public readonly startEventMaybe: AsyncInputStreamStartEvent | undefined
  ) {
    super(session.manager);
  }

  /**
   * AsyncInputStreamStartEvent used to initialize the AsyncInputStreamEventHelper. Throws an
   * ConversationEventValidationError if some other sub-event was received before the start event, which shouldn't
   * happen under normal circumstances.
   */
  public get startEvent(): AsyncInputStreamStartEvent {
    if (!this.startEventMaybe) throw new ConversationEventValidationError(`Async input stream ${this.streamId} has no start event.`);
    return this.startEventMaybe;
  }

  /**
   * Emits an input stream event through the parent conversation.
   */
  public emit(streamEvent: Omit<AsyncInputStreamEvent, 'streamId'>) {
    this.session.emit({
      asyncInputStream: { streamId: this.streamId, ...streamEvent }
    });
  }

  /**
   * Sends a stream chunk with optional sequence number.
   * @throws Error if input stream has already ended.
   */
  public sendChunk(chunk: AsyncInputStreamChunkEvent) {
    this.assertNotEnded();
    this.emit({ chunk });
  }

  /**
   * Sends meta for this input stream.
   * @throws Error if input stream has already ended.
   */
  public sendMetaEvent(metaEvent: MetaEvent) {
    this.assertNotEnded();
    this.emit({ metaEvent });
  }

  /**
   * Ends the input stream with optional end event data.
   * @throws Error if input stream has already ended.
   */
  public sendAsyncInputStreamEnd(endAsyncInputStream: AsyncInputStreamEndEvent = {}) {
    this.assertNotEnded();
    this.setEnded();
    this.emit({ endAsyncInputStream });
    this.delete();
  }

  /**
   * @deprecated Use sendAsyncInputStreamEnd
   */
  public sendEndAsyncInputStream(endAsyncInputStream: AsyncInputStreamEndEvent = {}) {
    this.sendAsyncInputStreamEnd(endAsyncInputStream);
  }

  /**
   * Registers a handler for stream chunks.
   * @returns Cleanup function to remove the handler.
   */
  public onChunk(cb: AsyncInputStreamChunkHandler) {
    this._chunkHandlers.push(cb);
    return () => {
      const index = this._chunkHandlers.indexOf(cb);
      if (index >= 0) this._chunkHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for stream end events.
   * @returns Cleanup function to remove the handler.
   */
  public onAsyncInputStreamEnd(cb: AsyncInputStreamEndHandler) {
    this._endHandlers.push(cb);
    return () => {
      const index = this._endHandlers.indexOf(cb);
      if (index >= 0) this._endHandlers.splice(index, 1);
    };
  }

  /**
   * Sends an error start event for this async input stream.
   */
  public sendErrorStart(args: ErrorStartEventOptions) {
    this.assertNotEnded();
    const { errorId: providedId, ...startError } = args;
    const errorId = providedId ?? this.manager.makeId();
    this.emit({
      asyncInputStreamError: {
        errorId,
        startError
      }
    });
    this.errors.set(errorId, startError);
  }

  /**
   * Sends an error end event for this async input stream.
   */
  public sendErrorEnd(args: ErrorEndEventOptions) {
    this.assertNotEnded();
    const { errorId, ...endError } = args;
    this.emit({
      asyncInputStreamError: {
        errorId,
        endError
      }
    });
    this.errors.delete(errorId);
  }

  public toString() {
    return `AsyncInputStreamEventHelper(${this.streamId})`;
  }

}

export class AsyncInputStreamEventHelperImpl extends AsyncInputStreamEventHelper {

  /**
   * Dispatches incoming stream events to registered handlers.
   */
  public dispatch(streamEvent: AsyncInputStreamEvent): void {
    if (streamEvent.streamId !== this.streamId) return;

    if (this._eventBuffer) {
      this._eventBuffer.push(streamEvent);
      return;
    }

    if (streamEvent.chunk) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._chunkHandlers.forEach(cb => cb(streamEvent.chunk!));
    }

    if (streamEvent.metaEvent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._metaEventHandlers.forEach(cb => cb(streamEvent.metaEvent!));
    }

    if (streamEvent.asyncInputStreamError?.startError) {
      this.dispatchErrorStart(streamEvent.asyncInputStreamError.errorId, streamEvent.asyncInputStreamError.startError);
    }

    if (streamEvent.asyncInputStreamError?.endError) {
      this.dispatchErrorEnd(streamEvent.asyncInputStreamError.errorId, streamEvent.asyncInputStreamError.endError);
    }

    if (streamEvent.endAsyncInputStream) {
      this.setEnded();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._endHandlers.forEach(cb => cb(streamEvent.endAsyncInputStream!));
      this.delete();
    }
  }

  protected getParentErrorScope(): boolean {
    return this.session.inErrorScope;
  }

  protected removeFromParent(): void {
    (this.session as SessionEventHelperImpl).removeInputStream(this);
  }

  protected deleteChildren(): void {
    // AsyncInputStreamEventHelper has no children
  }

  protected getSession() {
    return this.session;
  }

}
