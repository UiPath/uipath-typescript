import type {
  AsyncInputStreamEndEvent,
  AsyncInputStreamId,
  ConversationEvent,
  ConversationId,
  Exchange,
  ExchangeId,
  MetaEvent,
  SessionEndEvent,
  SessionStartedEvent,
  SessionStartEvent,
  ToolCallId
} from '@/models/conversational';

import type { AsyncInputStreamEventHelper } from './async-input-stream-event-helper';
import { AsyncInputStreamEventHelperImpl } from './async-input-stream-event-helper';
import type { AsyncToolCallEventHelper } from './async-tool-call-event-helper';
import { AsyncToolCallEventHelperImpl } from './async-tool-call-event-helper';
import { ConversationEventHelperBase } from './conversation-event-helper-base';
import type {
  AnyErrorEndHandler,
  AnyErrorEndHandlerArgs,
  AnyErrorStartHandler,
  AnyErrorStartHandlerArgs,
  AsyncToolCallStartHandler,
  AsyncToolCallStartHandlerAsync,
  ErrorEndEventOptions,
  ErrorStartEventOptions,
  ExchangeStartEventOptions,
  ExchangeStartHandler,
  ExchangeStartHandlerAsync,
  InputStreamStartEventOptions,
  InputStreamStartHandler,
  LabelUpdatedHandler,
  SessionEndHandler as SessionEndHandler,
  SessionEndingHandler,
  SessionStartedHandler as SessionStartedHandler,
  ToolCallStartEventWithId
} from './conversation-event-helper-common';
import {
  ConversationEventValidationError
} from './conversation-event-helper-common';
import type { ConversationEventHelperManager, ConversationEventHelperManagerImpl } from './conversation-event-helper-manager';
import type { ExchangeEventHelper } from './exchange-event-helper';
import { ExchangeEventHelperImpl } from './exchange-event-helper';

/**
 * Helper for managing conversation session events. Handles conversation lifecycle including exchanges, input streams,
 * and async operations.
 */
export abstract class SessionEventHelper extends ConversationEventHelperBase<
  SessionStartEvent,
  ConversationEvent
> {

  protected readonly _exchangeMap = new Map<ExchangeId, ExchangeEventHelperImpl>();
  protected readonly _inputStreamMap = new Map<string, AsyncInputStreamEventHelperImpl>();
  protected readonly _exchangeStartHandlers = new Array<ExchangeStartHandler>();
  protected readonly _inputStreamStartHandlers = new Array<InputStreamStartHandler>();
  protected readonly _asyncToolCallStartHandlers = new Array<AsyncToolCallStartHandler>();
  protected readonly _asyncToolCallMap = new Map<ToolCallId, AsyncToolCallEventHelperImpl>();
  protected readonly _labelUpdatedHandlers = new Array<LabelUpdatedHandler>();
  protected readonly _sessionStartedHandlers = new Array<SessionStartedHandler>();
  protected readonly _sessionEndingHandlers = new Array<SessionEndingHandler>();
  protected readonly _sessionEndHandlers = new Array<SessionEndHandler>();
  protected _emitBuffer: Array<Omit<ConversationEvent, 'conversationId'>> | null = null;
  protected readonly _anyErrorStartHandlers = new Array<AnyErrorStartHandler>();
  protected readonly _anyErrorEndHandlers = new Array<AnyErrorEndHandler>();

  constructor(
    manager: ConversationEventHelperManager,
    public readonly conversationId: ConversationId,

    /**
     * SessionStartEvent used to initialize the SessionEventHelper. Will be undefined if some other sub-event was
     * received before the start event. See also `startEvent`.
     */
    public readonly startEventMaybe: SessionStartEvent | undefined,
    public readonly echo: boolean = false
  ) {
    super(manager);
  }

  /**
   * SessionStartEvent used to initialize the SessionEventHelper. Throws an ConversationEventValidationError if some
   * other sub-event was received before the start event, which shouldn't happen under normal circumstances.
   */
  public get startEvent(): SessionStartEvent {
    if (!this.startEventMaybe) throw new ConversationEventValidationError(`Session for conversation ${this.conversationId} has no start event.`);
    return this.startEventMaybe;
  }

  /**
   * Emits a conversation event.
   */
  public emit(conversationEvent: Omit<ConversationEvent, 'conversationId'>) {
    this.emitInternal(conversationEvent);
  }

  public get isEmitPaused() {
    return !!this._emitBuffer;
  }

  public pauseEmits() {
    if (!this._emitBuffer) {
      this._emitBuffer = [];
    }
  }

  public resumeEmits() {
    if (this._emitBuffer === null) return;
    const emitBuffer = this._emitBuffer;
    this._emitBuffer = null;
    emitBuffer.forEach(event => this.emitInternal(event, true));
  }

  /**
   * Sends a session started event.
   */
  public sendSessionStarted(sessionStarted: SessionStartedEvent = {}) {
    this.assertNotEnded();
    this.emit({ sessionStarted });
  }

  /**
   * Sends a session end event.
   */
  public sendSessionEnd(endSession: SessionEndEvent = {}) {
    this.assertNotEnded();
    this.setEnded();
    this.emit({ endSession });
    this.delete();
  }

  /**
   * @deprecated Use sendSessionEnd
   */
  public sendEndSession(endSession: SessionEndEvent = {}) {
    this.sendSessionEnd(endSession);
  }

  /**
   * Starts a new exchange with automatic cleanup when callback is provided.
   * @returns ExchangeEventHelper for manual control or Promise when using callback.
   */
  public startExchange(args?: ExchangeStartEventOptions): ExchangeEventHelper;
  public startExchange(cb: ExchangeStartHandlerAsync): Promise<void>;
  public startExchange(args: ExchangeStartEventOptions, cb: ExchangeStartHandlerAsync): Promise<void>;
  public startExchange(argsOrCb?: ExchangeStartEventOptions | ExchangeStartHandlerAsync, maybeCb?: ExchangeStartHandlerAsync): ExchangeEventHelper | Promise<void> {

    this.assertNotEnded();

    const [ args, cb ] = typeof argsOrCb === 'function' ? [ {}, argsOrCb ] : [ argsOrCb ?? {}, maybeCb ];

    const { exchangeId: providedId, properties, ...startExchange } = args;
    const exchangeId = providedId ?? this.manager.makeId();

    // shallow copy start event because helper will add timestamp property we don't need to send to the service
    const helper = new ExchangeEventHelperImpl(this, exchangeId, { ...startExchange });
    if (properties) helper.setProperties(properties);
    this._exchangeMap.set(exchangeId, helper);

    helper.emit({ startExchange });

    if (cb) {
      return cb(helper).then((endEvent) => helper.sendExchangeEnd(endEvent || {}));
    }
    return helper;

  }

  /**
   * Iterator over all the exchanges in this session.
   */
  public get exchanges(): IteratorObject<ExchangeEventHelper, undefined, undefined> {
    return this._exchangeMap.values();
  }

  /**
   * Retrieves the exchange with a specified id from this session.
   * @param exchangeId The id of the exchange to get.
   * @returns The ExchangeEventHelper for the specified id, or undefined if no such exchange exists.
   */
  public getExchange(exchangeId: ExchangeId): ExchangeEventHelper | undefined {
    return this._exchangeMap.get(exchangeId);
  }

  /**
   * Starts a new async input stream with automatic cleanup when callback is provided.
   * @returns InputStreamEventHelper for manual control or Promise when using callback.
   */
  public startAsyncInputStream(args: InputStreamStartEventOptions): AsyncInputStreamEventHelper;
  public startAsyncInputStream(args: InputStreamStartEventOptions, cb: (x: AsyncInputStreamEventHelperImpl) => Promise<AsyncInputStreamEndEvent | void>): Promise<void>;
  public startAsyncInputStream(args: InputStreamStartEventOptions, cb?: (x: AsyncInputStreamEventHelperImpl) => Promise<AsyncInputStreamEndEvent | void>): AsyncInputStreamEventHelper | Promise<void> {

    this.assertNotEnded();

    const { streamId: providedId, properties, ...startAsyncInputStream } = args;
    const streamId = providedId ?? this.manager.makeId();

    // shallow copy start event because helper will add timestamp property we don't need to send to the service
    const helper = new AsyncInputStreamEventHelperImpl(this, streamId, { ...startAsyncInputStream });
    if (properties) helper.setProperties(properties);
    this._inputStreamMap.set(streamId, helper);

    helper.emit({ startAsyncInputStream });

    if (cb) {
      return cb(helper).then((endEvent) => helper.sendAsyncInputStreamEnd(endEvent || {}));
    }
    return helper;

  }

  /**
   * Iterator over all the async input streams in this session.
   */
  public get asyncInputStreams(): Iterator<AsyncInputStreamEventHelper> {
    return this._inputStreamMap.values();
  }

  /**
   * Retrieves the async input stream with a specified id from this session.
   * @param exchangeId The id of the async input stream to get.
   * @returns The AsyncInputStreamEventHelper for the specified id, or undefined if no such async input stream exists.
   */
  public getAsyncInputStream(streamId: AsyncInputStreamId): AsyncInputStreamEventHelper | undefined {
    return this._inputStreamMap.get(streamId);
  }

  /**
   * Starts a new async tool call with automatic cleanup when callback is provided.
   * @returns AsyncToolCallEventHelper for manual control or Promise when using callback.
   */
  public startAsyncToolCall(args: ToolCallStartEventWithId): AsyncToolCallEventHelper;
  public startAsyncToolCall(args: ToolCallStartEventWithId, cb: AsyncToolCallStartHandlerAsync): Promise<void>;
  public startAsyncToolCall(args: ToolCallStartEventWithId, cb?: AsyncToolCallStartHandlerAsync): AsyncToolCallEventHelper | Promise<void> {

    this.assertNotEnded();

    const { toolCallId: providedId, properties, ...startToolCall } = args;
    const asyncToolCallId = providedId ?? this.manager.makeId();

    // shallow copy start event because helper will add timestamp property we don't need to send to the service
    const helper = new AsyncToolCallEventHelperImpl(this, asyncToolCallId, { ...startToolCall });
    if (properties) helper.setProperties(properties);
    this._asyncToolCallMap.set(asyncToolCallId, helper);

    // Emit start event
    helper.emit({ startToolCall });

    if (cb) {
      return cb(helper).then((endEvent) => helper.sendToolCallEnd(endEvent || {}));
    }
    return helper;

  }

  /**
   * Iterator over all the async tool call in this session.
   */
  public get asyncToolCalls(): Iterator<AsyncToolCallEventHelper> {
    return this._asyncToolCallMap.values();
  }

  /**
   * Retrieves the async tool call with a specified id from this session.
   * @param toolCallId The id of the async tool call to get.
   * @returns The AsyncToolCallEventHelper for the specified id, or undefined if no such async tool call exists.
   */
  public getAsyncToolCall(toolCallId: ToolCallId): AsyncToolCallEventHelper | undefined {
    return this._asyncToolCallMap.get(toolCallId);
  }

  /**
   * Sends meta for this conversation.
   */
  public sendMetaEvent(metaEvent: MetaEvent) {
    this.assertNotEnded();
    this.emit({ metaEvent });
  }

  /**
   * Registers a handler for session started events.
   * @returns Cleanup function to remove the handler.
   */
  public onSessionStarted(cb: SessionStartedHandler) {
    this._sessionStartedHandlers.push(cb);
    return () => {
      const index = this._sessionStartedHandlers.indexOf(cb);
      if (index >= 0) this._sessionStartedHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for session ending events.
   * @returns Cleanup function to remove the handler.
   */
  public onSessionEnding(cb: SessionEndingHandler) {
    this._sessionEndingHandlers.push(cb);
    return () => {
      const index = this._sessionEndingHandlers.indexOf(cb);
      if (index >= 0) this._sessionEndingHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for session end events.
   * @returns Cleanup function to remove the handler.
   */
  public onSessionEnd(cb: SessionEndHandler) {
    this._sessionEndHandlers.push(cb);
    return () => {
      const index = this._sessionEndHandlers.indexOf(cb);
      if (index >= 0) this._sessionEndHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for exchange start events.
   * @returns Cleanup function to remove the handler.
   */
  public onExchangeStart(cb: ExchangeStartHandler) {
    this._exchangeStartHandlers.push(cb);
    return () => {
      const index = this._exchangeStartHandlers.indexOf(cb);
      if (index >= 0) this._exchangeStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for input stream start events.
   * @returns Cleanup function to remove the handler.
   */
  public onInputStreamStart(cb: InputStreamStartHandler) {
    this._inputStreamStartHandlers.push(cb);
    return () => {
      const index = this._inputStreamStartHandlers.indexOf(cb);
      if (index >= 0) this._inputStreamStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for async tool call start events.
   * @returns Cleanup function to remove the handler.
   */
  public onAsyncToolCallStart(cb: AsyncToolCallStartHandler) {
    this._asyncToolCallStartHandlers.push(cb);
    return () => {
      const index = this._asyncToolCallStartHandlers.indexOf(cb);
      if (index >= 0) this._asyncToolCallStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler that will be called when a label updated event is received for this session.
   * @returns Cleanup function to remove the handler.
   */
  public onLabelUpdated(cb: LabelUpdatedHandler) {
    this._labelUpdatedHandlers.push(cb);
    return () => {
      const index = this._labelUpdatedHandlers.indexOf(cb);
      if (index >= 0) this._labelUpdatedHandlers.splice(index, 1);
    };
  }

  /**
   * Sends an error start event for this conversation.
   */
  public sendErrorStart(args: ErrorStartEventOptions) {
    this.assertNotEnded();
    const { errorId: providedId, ...startError } = args;
    const errorId = providedId ?? this.manager.makeId();
    this.emit({
      conversationError: {
        errorId,
        startError
      }
    });
    this.errors.set(errorId, startError);
  }

  /**
   * Sends an error end event for this conversation.
   */
  public sendErrorEnd(args: ErrorEndEventOptions) {
    this.assertNotEnded();
    const { errorId, ...endError } = args;
    this.emit({
      conversationError: {
        errorId,
        endError
      }
    });
    this.errors.delete(errorId);
  }

  public toString() {
    return `SessionEventHelper(${this.conversationId})`;
  }

  public replay(exchanges: Exchange[]) {
    exchanges.forEach(exchange => {
      for (const exchangeEvent of ExchangeEventHelperImpl.replay(exchange)) {
        this.dispatch({
          conversationId: this.conversationId,
          exchange: exchangeEvent
        });
      }
    });
  }

  /**
     * Registers a handler that will be called when an error start event is received by any nested
     * conversation event helper object.
     *
     * @returns Cleanup function to remove the handler.
     */
  public onAnyErrorStart(cb: AnyErrorStartHandler) {
    this._anyErrorStartHandlers.push(cb);
    return () => {
      const index = this._anyErrorStartHandlers.indexOf(cb);
      if (index >= 0) this._anyErrorStartHandlers.splice(index, 1);
    };
  }

  /**
     * Registers a handler that will be called when an error end event is received by any nested
     * conversation event helper object.
     *
     * @returns Cleanup function to remove the handler.
     */
  public onAnyErrorEnd(cb: AnyErrorEndHandler) {
    this._anyErrorEndHandlers.push(cb);
    return () => {
      const index = this._anyErrorEndHandlers.indexOf(cb);
      if (index >= 0) this._anyErrorEndHandlers.splice(index, 1);
    };
  }

  private emitInternal(conversationEvent: Omit<ConversationEvent, 'conversationId'>, suppressEcho = false) {

    // This function ensures that, when emits are paused, echoed events are dispatched when they are created (via
    // invoking helper methods), rather than when emits are unpaused. This ensures that the same helper object that is
    // created and passed to callbacks is used when dispatching echoed events. For example, suppose we  have code like
    // the following:
    //
    //     const session = client.event.startSession({ echo: true });
    //     session.pauseEmits();
    //
    //     session.onExchangeStart(exchange => {
    //       exchange.onMessageStart(message => {
    //         const props = message.getProperties<MyProps>();
    //         if (props.myProp) {
    //           ...
    //         }
    //       });
    //     });
    //
    //     session.startMessage({properties: { myProp: true }}, message => {
    //        ...
    //     });
    //
    //     session.resumeEmits();
    //
    // By dispatching emitted events when they are created the `message` object passed to the onMessageStart handler and
    // the message object passed to the startMessage callback are the same object, and will have the properties set. But
    // if the emitted events are dispatched when resumeEmits is called (when the events are actually sent to the
    // service), then the original message object (with the properties set) will have been deleted when the startMessage
    // callback returns and NEW message object (without the properties et) will created when the echoed event is finally
    // dispatched.

    const eventWithId = {
      conversationId: this.conversationId,
      ...conversationEvent
    };
    if (this.echo && !suppressEcho) {
      this.dispatch(eventWithId);
    }
    if (this._emitBuffer) {
      this._emitBuffer.push(conversationEvent);
    } else {
      this.manager.emitAny(eventWithId);
    }
  }

}

export class SessionEventHelperImpl extends SessionEventHelper {

  /**
   * Dispatches incoming conversation events to registered handlers.
   */
  public dispatch(conversationEvent: ConversationEvent): void {
    if (conversationEvent.conversationId !== this.conversationId) return;

    if (this._eventBuffer) {
      this._eventBuffer.push(conversationEvent);
      return;
    }

    if (conversationEvent.sessionStarted) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._sessionStartedHandlers.forEach(cb => cb(conversationEvent.sessionStarted!));
    }

    if (conversationEvent.sessionEnding) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._sessionEndingHandlers.forEach(cb => cb(conversationEvent.sessionEnding!));
    }

    if (conversationEvent.exchange) {
      let exchangeHelper = this._exchangeMap.get(conversationEvent.exchange.exchangeId);
      if (!exchangeHelper) {
        exchangeHelper = new ExchangeEventHelperImpl(this, conversationEvent.exchange.exchangeId, conversationEvent.exchange.startExchange);
        this._exchangeMap.set(conversationEvent.exchange.exchangeId, exchangeHelper);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._exchangeStartHandlers.forEach(cb => cb(exchangeHelper!));
      } else if (conversationEvent.exchange.startExchange) {
        // when session.echo is enabled, and startExchange is used, the helper will already be in the map
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._exchangeStartHandlers.forEach(cb => cb(exchangeHelper!));
      }
      exchangeHelper.dispatch(conversationEvent.exchange);
    }

    if (conversationEvent.asyncInputStream) {
      let streamHelper = this._inputStreamMap.get(conversationEvent.asyncInputStream.streamId);
      if (!streamHelper && this._inputStreamStartHandlers.length > 0) {
        streamHelper = new AsyncInputStreamEventHelperImpl(this, conversationEvent.asyncInputStream.streamId, conversationEvent.asyncInputStream.startAsyncInputStream);
        this._inputStreamMap.set(conversationEvent.asyncInputStream.streamId, streamHelper);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._inputStreamStartHandlers.forEach(cb => cb(streamHelper!));
      } else if (conversationEvent.asyncInputStream.startAsyncInputStream) {
        // when session.echo is enabled, and startAsyncInputStream is used, the helper will already be in the map
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._inputStreamStartHandlers.forEach(cb => cb(streamHelper!));
      }
      if (streamHelper) streamHelper.dispatch(conversationEvent.asyncInputStream);
    }

    if (conversationEvent.asyncToolCall) {
      let toolCallHelper = this._asyncToolCallMap.get(conversationEvent.asyncToolCall.toolCallId);
      if (!toolCallHelper && this._asyncToolCallStartHandlers.length > 0) {
        toolCallHelper = new AsyncToolCallEventHelperImpl(this, conversationEvent.asyncToolCall.toolCallId, conversationEvent.asyncToolCall.startToolCall);
        this._asyncToolCallMap.set(conversationEvent.asyncToolCall.toolCallId, toolCallHelper);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._asyncToolCallStartHandlers.forEach(cb => cb(toolCallHelper!));
      } else if (conversationEvent.asyncToolCall.startToolCall) {
        // when session.echo is enabled, and startAsyncInputStream is used, the helper will already be in the map
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._asyncToolCallStartHandlers.forEach(cb => cb(toolCallHelper!));
      }
      if (toolCallHelper) toolCallHelper.dispatch(conversationEvent.asyncToolCall);
    }

    if (conversationEvent.metaEvent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._metaEventHandlers.forEach(cb => cb(conversationEvent.metaEvent!));
    }

    if (conversationEvent.conversationError?.startError) {
      this.dispatchErrorStart(conversationEvent.conversationError.errorId, conversationEvent.conversationError.startError);
    }

    if (conversationEvent.conversationError?.endError) {
      this.dispatchErrorEnd(conversationEvent.conversationError.errorId, conversationEvent.conversationError.endError);
    }

    if (conversationEvent.labelUpdated) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._labelUpdatedHandlers.forEach(cb => cb(conversationEvent.labelUpdated!));
    }

    if (conversationEvent.endSession) {
      this.setEnded();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._sessionEndHandlers.forEach(cb => cb(conversationEvent.endSession!));
      this.delete();
    }
  }

  /**
   * Internal method used by child ExchangeEventHelper to remove itself.
   */
  public removeExchange(helper: ExchangeEventHelperImpl) {
    if (this._exchangeMap.get(helper.exchangeId) === helper) {
      this._exchangeMap.delete(helper.exchangeId);
    }
  }

  /**
   * Internal method used by child AsyncInputStreamEventHelper to remove itself.
   */
  public removeInputStream(helper: AsyncInputStreamEventHelperImpl) {
    if (this._inputStreamMap.get(helper.streamId) === helper) {
      this._inputStreamMap.delete(helper.streamId);
    }
  }

  /**
   * Internal method used by child AsyncToolCallEventHelper to remove itself.
   */
  public removeAsyncToolCall(helper: AsyncToolCallEventHelperImpl) {
    if (this._asyncToolCallMap.get(helper.toolCallId) === helper) {
      this._asyncToolCallMap.delete(helper.toolCallId);
    }
  }

  /**
   * Internal method.
   */
  public dispatchAnyErrorStart(args: AnyErrorStartHandlerArgs) {
    this._anyErrorStartHandlers.forEach(cb => cb(args));
    return this._anyErrorStartHandlers.length > 0;
  }

  /**
   * Internal method.
   */
  public dispatchAnyErrorEnd(args: AnyErrorEndHandlerArgs) {
    this._anyErrorEndHandlers.forEach(cb => cb(args));
    return this._anyErrorEndHandlers.length > 0;
  }

  /**
   * For SessionEventHelper, there is no parent error scope to chain to.
   */
  protected getParentErrorScope(): boolean {
    return false;
  }

  protected removeFromParent(): void {
    (this.manager as ConversationEventHelperManagerImpl).removeSession(this);
  }

  protected deleteChildren(): void {
    Array.from(this._exchangeMap.values()).forEach(exchangeHelper => exchangeHelper.delete());
    Array.from(this._asyncToolCallMap.values()).forEach(asyncToolCallHelper => asyncToolCallHelper.delete());
    Array.from(this._inputStreamMap.values()).forEach(inputStreamHelper => inputStreamHelper.delete());
  }

  protected getSession() {
    return this;
  }

}
