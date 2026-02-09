import type {
  MakeRequired,
  MetaEvent,
  ToolCall,
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
import type { ToolCallStream } from '@/models/conversational-agent';
import type { MessageEventHelper, MessageEventHelperImpl } from './message-event-helper';

/**
 * Helper for managing tool call events within a message.
 * Handles tool call lifecycle with start/end events.
 */
export abstract class ToolCallEventHelper extends ConversationEventHelperBase<
  ToolCallStartEvent,
  ToolCallEvent
> implements ToolCallStream {

  protected readonly _endHandlers = new Array<ToolCallEndHandler>();

  constructor(
    public readonly message: MessageEventHelper,
    public readonly toolCallId: ToolCallId,

    /**
     * ToolCallStartEvent used to initialize the ToolCallEventHelper. Will be undefined if some other sub-event was
     * received before the start event. See also `startEvent`.
     */
    public readonly startEventMaybe: ToolCallStartEvent | undefined
  ) {
    super(message.manager);
    this.addStartEventTimestamp(startEventMaybe);
  }

  /**
   * MessageStartEvent used to initialize the MessageEventHelper. Throws an ConversationEventValidationError if some
   * other sub-event was received before the start event, which shouldn't happen under normal circumstances.
   */
  public get startEvent(): MakeRequired<ToolCallStartEvent, 'timestamp'> {
    if (!this.startEventMaybe) throw new ConversationEventValidationError(`Tool call ${this.toolCallId} has no start event.`);
    return this.startEventMaybe as MakeRequired<ToolCallStartEvent, 'timestamp'>;
  }

  /**
   * Emits a tool call event through the parent message.
   */
  public emit(toolCallEvent: Omit<ToolCallEvent, 'toolCallId'>) {
    this.message.emit({
      toolCall: { toolCallId: this.toolCallId, ...toolCallEvent }
    });
  }

  /**
   * Sends meta for this tool call.
   * @throws Error if tool call has already ended.
   */
  public sendMetaEvent(metaEvent: MetaEvent) {
    this.assertNotEnded();
    this.emit({ metaEvent });
  }

  /**
   * Ends the tool call with optional end event data.
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
   * @deprecated Use onToolCallEnd
   */
  public onEndToolCall(cb: ToolCallEndHandler) {
    this.onToolCallEnd(cb);
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
    return `ToolCallEventHelper(${this.toolCallId})`;
  }
}

export class ToolCallEventHelperImpl extends ToolCallEventHelper {

  public static *replay(toolCall: ToolCall): Generator<ToolCallEvent> {

    yield {
      toolCallId: toolCall.toolCallId,
      startToolCall: {
        toolName: toolCall.name,
        input: toolCall.input,
        timestamp: toolCall.createdTime ?? (toolCall as any).createdAt
      }
    };

    if (toolCall.result) {

      yield {
        toolCallId: toolCall.toolCallId,
        endToolCall: {
          cancelled: toolCall.result.cancelled,
          isError: toolCall.result.isError,
          output: toolCall.result.output,
          timestamp: toolCall.result.timestamp
        }
      };
    }

  }

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
    return this.message.inErrorScope;
  }

  protected removeFromParent(): void {
    (this.message as MessageEventHelperImpl).removeToolCall(this);
  }

  protected deleteChildren(): void {
    // ToolCallEventHelper has no children
  }

  protected getSession() {
    return this.message.exchange.session;
  }

}
