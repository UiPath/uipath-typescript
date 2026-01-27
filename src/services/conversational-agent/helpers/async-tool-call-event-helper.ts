import type {
  MakeRequired,
  MetaEvent,
  ToolCallEndEvent,
  ToolCallEvent,
  ToolCallId,
  ToolCallStartEvent
} from '@/models/conversational-agent';

import { ConversationEventHelperBase } from './conversation-event-helper-base';
import {
  ConversationEventValidationError,
  type ErrorEndEventOptions,
  type ErrorStartEventOptions,
  type ToolCallEndHandler
} from './conversation-event-helper-common';
import type { SessionEventHelper, SessionEventHelperImpl } from './session-event-helper';

/**
 * Helper for managing async tool call events within a conversation.
 * Handles tool call lifecycle with start/end events at the conversation level.
 */
export abstract class AsyncToolCallEventHelper extends ConversationEventHelperBase<
  ToolCallStartEvent,
  ToolCallEvent
> {

  protected readonly _endHandlers = new Array<ToolCallEndHandler>();

  constructor(
    public readonly session: SessionEventHelper,
    public readonly toolCallId: ToolCallId,

    /**
     * ToolCallStartEvent used to initialize the ToolCallEventHelper. Will be undefined if some other sub-event was
     * received before the start event. See also `startEvent`.
     */
    public readonly startEventMaybe: ToolCallStartEvent | undefined
  ) {
    super(session.manager);
    this.addStartEventTimestamp(this.startEventMaybe);
  }

  /**
   * ToolCallStartEvent used to initialize the AsyncToolCallEventHelper. Throws an ConversationEventValidationError if
   * some other sub-event was received before the start event, which shouldn't happen under normal circumstances.
   */
  public get startEvent(): MakeRequired<ToolCallStartEvent, 'timestamp'> {
    if (!this.startEventMaybe) throw new ConversationEventValidationError(`Async Tool call ${this.toolCallId} has no start event.`);
    return this.startEventMaybe as MakeRequired<ToolCallStartEvent, 'timestamp'>; // timestamp is set in the constructor
  }

  /**
   * Emits an async tool call event through the parent conversation.
   */
  public emit(toolCallEvent: Omit<ToolCallEvent, 'toolCallId'>) {
    this.session.emit({
      asyncToolCall: { toolCallId: this.toolCallId, ...toolCallEvent }
    });
  }

  /**
   * Sends meta for this async tool call.
   * @throws Error if tool call has already ended.
   */
  public sendMetaEvent(metaEvent: MetaEvent) {
    this.assertNotEnded();
    this.emit({ metaEvent });
  }

  /**
   * Ends the async tool call with optional end event data.
   * @throws Error if tool call has already ended.
   */
  public sendToolCallEnd(endToolCall: ToolCallEndEvent = {}) {
    this.assertNotEnded();
    this.setEnded();
    this.emit({ endToolCall });
    this.delete();
  }

  /**
   * @deprecated Use sendToolCallEnd
   */
  public sendEndToolCall(endToolCall: ToolCallEndEvent = {}) {
    this.sendToolCallEnd(endToolCall);
  }

  /**
   * Registers a handler for tool call end events.
   * @returns Cleanup function to remove the handler.
   */
  public onToolCallEnd(cb: ToolCallEndHandler) {
    this._endHandlers.push(cb);
    return () => {
      const index = this._endHandlers.indexOf(cb);
      if (index >= 0) this._endHandlers.splice(index, 1);
    };
  }

  /**
   * Sends an error start event for this tool call.
   */
  public sendErrorStart(args: ErrorStartEventOptions) {
    this.assertNotEnded();
    const { errorId: providedId, ...startError } = args;
    const errorId = providedId ?? this.manager.makeId();
    this.emit({
      toolCallError: {
        errorId,
        startError
      }
    });
    this.errors.set(errorId, startError);
  }

  /**
   * Sends an error end event for this tool call.
   */
  public sendErrorEnd(args: ErrorEndEventOptions) {
    this.assertNotEnded();
    const { errorId, ...endError } = args;
    this.emit({
      toolCallError: {
        errorId,
        endError
      }
    });
    this.errors.delete(errorId);
  }

  public toString() {
    return `AsyncToolCallEventHelper(${this.toolCallId})`;
  }

}

export class AsyncToolCallEventHelperImpl extends AsyncToolCallEventHelper {

  /**
   * Dispatches incoming tool call events to registered handlers.
   */
  public dispatch(toolCallEvent: ToolCallEvent): void {
    if (toolCallEvent.toolCallId !== this.toolCallId) return;

    if (this._eventBuffer) {
      this._eventBuffer.push(toolCallEvent);
      return;
    }

    if (toolCallEvent.metaEvent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._metaEventHandlers.forEach(cb => cb(toolCallEvent.metaEvent!));
    }

    if (toolCallEvent.toolCallError?.startError) {
      this.dispatchErrorStart(toolCallEvent.toolCallError.errorId, toolCallEvent.toolCallError.startError);
    }

    if (toolCallEvent.toolCallError?.endError) {
      this.dispatchErrorEnd(toolCallEvent.toolCallError.errorId, toolCallEvent.toolCallError.endError);
    }

    if (toolCallEvent.endToolCall) {
      this.setEnded();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._endHandlers.forEach(cb => cb(toolCallEvent.endToolCall!));
      this.delete();
    }

  }

  protected getParentErrorScope(): boolean {
    return this.session.inErrorScope;
  }

  protected removeFromParent(): void {
    (this.session as SessionEventHelperImpl).removeAsyncToolCall(this);
  }

  protected deleteChildren(): void {
    // AsyncToolCallEventHelper has no children
  }

  protected getSession() {
    return this.session;
  }

}
