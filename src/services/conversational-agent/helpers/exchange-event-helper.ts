import type {
  Exchange,
  ExchangeEndEvent,
  ExchangeEvent,
  ExchangeId,
  ExchangeStartEvent,
  MakeRequired,
  MessageId,
  MetaEvent
} from '@/models/conversational';

import { ConversationEventHelperBase } from './conversation-event-helper-base';
import type {
  ErrorEndEventOptions,
  ErrorStartEventOptions,
  ExchangeEndHandler,
  MessageCompletedHandler,
  MessageStartEventOptions,
  MessageStartHandler,
  MessageStartHandlerAsync,
  SendMessageWithContentPartOptions
} from './conversation-event-helper-common';
import {
  ConversationEventValidationError
} from './conversation-event-helper-common';
import type { MessageEventHelper } from './message-event-helper';
import { MessageEventHelperImpl } from './message-event-helper';
import type { SessionEventHelper, SessionEventHelperImpl } from './session-event-helper';

/**
 * Helper for managing exchange events within a conversation.
 * Handles exchange lifecycle including messages.
 */
export abstract class ExchangeEventHelper extends ConversationEventHelperBase<
  ExchangeStartEvent,
  ExchangeEvent
> {

  protected readonly _messageMap = new Map<MessageId, MessageEventHelperImpl>();
  protected readonly _messageStartHandlers = new Array<MessageStartHandler>();
  protected readonly _endHandlers = new Array<ExchangeEndHandler>();

  constructor(
    public readonly session: SessionEventHelper,
    public readonly exchangeId: ExchangeId,

    /**
     * ExchangeStartEvent used to initialize the ExchangeEventHelper. Will be undefined if some other sub-event
     * was received before the start event. See also `startEvent`.
     */
    public readonly startEventMaybe: ExchangeStartEvent | undefined
  ) {
    super(session.manager);
    this.addStartEventTimestamp(startEventMaybe);
  }

  /**
   * ExchangeStartEvent used to initialize the ExchangeEventHelper. Throws an ConversationEventValidationError if some
   * other sub-event was received before the start event, which shouldn't happen under normal circumstances.
   */
  public get startEvent(): MakeRequired<ExchangeStartEvent, 'timestamp'> {
    if (!this.startEventMaybe) throw new ConversationEventValidationError(`Exchange ${this.exchangeId} has no start event.`);
    return this.startEventMaybe as MakeRequired<ExchangeStartEvent, 'timestamp'>; // timestamp is set by the constructor
  }

  /**
   * Emits an exchange event through the parent session.
   */
  public emit(exchangeEvent: Omit<ExchangeEvent, 'exchangeId'>) {
    this.session.emit({ exchange: { exchangeId: this.exchangeId, ...exchangeEvent } });
  }

  /**
   * Starts a new message with automatic cleanup when callback is provided.
   * @returns MessageEventHelper for manual control or Promise when using callback.
   * @throws Error if exchange has already ended.
   */
  public startMessage(args?: MessageStartEventOptions): MessageEventHelper;
  public startMessage(args: MessageStartEventOptions, cb: MessageStartHandlerAsync): Promise<void>;
  public startMessage(cb: MessageStartHandlerAsync): Promise<void>;
  public startMessage(argsOrCb?: MessageStartEventOptions | MessageStartHandlerAsync, cbMaybe?: MessageStartHandlerAsync): MessageEventHelper | Promise<void> {
    this.assertNotEnded();

    const [ args, cb ] = typeof argsOrCb === 'function' ? [ undefined, argsOrCb ] : [ argsOrCb, cbMaybe ];

    const { messageId: providedId, properties, ...startMessageWithoutDefaults } = args ?? {};
    const messageId = providedId ?? this.manager.makeId();
    const startMessage = {
      ...startMessageWithoutDefaults,
      role: startMessageWithoutDefaults.role ?? 'user'
    };

    // shallow copy start event because helper will add timestamp property we don't need to send to the service
    const helper = new MessageEventHelperImpl(this, messageId, { ...startMessage });
    if (properties) helper.setProperties(properties);
    this._messageMap.set(messageId, helper);

    helper.emit({ startMessage });

    if (cb) {
      return cb(helper).then((endEvent) => helper.sendMessageEnd(endEvent || {}));
    }
    return helper;
  }

  /**
   * Sends a complete message with content part data and optional mime type.
   */
  public async sendMessageWithContentPart(options: SendMessageWithContentPartOptions) {
    const { data, exchangeSequence, timestamp, role, mimeType, messageId } = options;
    await this.startMessage({ messageId, exchangeSequence, timestamp, role },
      async message => await message.sendContentPart({ data, mimeType })
    );
  }

  /**
   * Iterator over all the messages in this exchange.
   */
  public get messages(): IteratorObject<MessageEventHelper, undefined, undefined> {
    return this._messageMap.values();
  }

  /**
   * Retrieves the message with a specified id from this exchange.
   * @param exchangeId The id of the message to get.
   * @returns The MessageEventHelper for the specified id, or undefined if no such content part exists.
   */
  public getMessage(messageId: MessageId): MessageEventHelper | undefined {
    return this._messageMap.get(messageId);
  }

  /**
   * Sends meta for this exchange.
   * @throws Error if exchange has already ended.
   */
  public sendMetaEvent(metaEvent: MetaEvent) {
    this.assertNotEnded();
    this.emit({ metaEvent });
  }

  /**
   * Ends the exchange with optional end event data.
   * @throws Error if exchange has already ended.
   */
  public sendExchangeEnd(endExchange: ExchangeEndEvent = {}) {
    this.assertNotEnded();
    this.setEnded();
    this.emit({ endExchange });
  }

  /**
   * @deprecated Use sendExchangeEnd
   */
  public sendEndExchange(endExchange: ExchangeEndEvent = {}) {
    this.sendExchangeEnd(endExchange);
  }

  /**
   * Registers a handler for exchange end events.
   * @returns Cleanup function to remove the handler.
   */
  public onExchangeEnd(cb: ExchangeEndHandler) {
    this._endHandlers.push(cb);
    return () => {
      const index = this._endHandlers.indexOf(cb);
      if (index >= 0) this._endHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for message start events.
   * @returns Cleanup function to remove the handler.
   */
  public onMessageStart(cb: MessageStartHandler) {
    this._messageStartHandlers.push(cb);
    return () => {
      const index = this._messageStartHandlers.indexOf(cb);
      if (index >= 0) this._messageStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler that receives a complete message after all the content part streams end.
   */
  public onMessageCompleted(cb: MessageCompletedHandler) {
    this.onMessageStart(message => {
      message.onCompleted(cb);
    });
  }

  /**
   * Sends an error start event for this exchange.
   */
  public sendErrorStart(args: ErrorStartEventOptions) {
    this.assertNotEnded();
    const { errorId: providedId, ...startError } = args;
    const errorId = providedId ?? this.manager.makeId();
    this.emit({
      exchangeError: {
        errorId,
        startError
      }
    });
    this.errors.set(errorId, startError);
  }

  /**
   * Sends an error end event for this exchange.
   */
  public sendErrorEnd(args: ErrorEndEventOptions) {
    this.assertNotEnded();
    const { errorId, ...endError } = args;
    this.emit({
      exchangeError: {
        errorId,
        endError
      }
    });
    this.errors.delete(errorId);
  }

  public toString() {
    return `ExchangeEventHelper(${this.exchangeId})`;
  }

}

export class ExchangeEventHelperImpl extends ExchangeEventHelper {

  public static *replay(exchange: Exchange): Generator<ExchangeEvent> {

    yield {
      exchangeId: exchange.exchangeId,
      startExchange: {
        timestamp: exchange.createdAt
      }
    };

    for (const message of exchange.messages) {
      for (const messageEvent of MessageEventHelperImpl.replay(message)) {
        yield {
          exchangeId: exchange.exchangeId,
          message: messageEvent
        };
      }
    }

    yield {
      exchangeId: exchange.exchangeId,
      endExchange: {}
    };

  }

  /**
   * Dispatches incoming exchange events to registered handlers.
   */
  public dispatch(exchangeEvent: ExchangeEvent): void {
    if (exchangeEvent.exchangeId !== this.exchangeId) return;

    if (this._eventBuffer) {
      this._eventBuffer.push(exchangeEvent);
      return;
    }

    if (exchangeEvent.message) {
      let messageHelper = this._messageMap.get(exchangeEvent.message.messageId);
      if (!messageHelper && this._messageStartHandlers.length > 0) {
        messageHelper = new MessageEventHelperImpl(this, exchangeEvent.message.messageId, exchangeEvent.message.startMessage);
        this._messageMap.set(exchangeEvent.message.messageId, messageHelper);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._messageStartHandlers.forEach(cb => cb(messageHelper!));
      } else if (exchangeEvent.message.startMessage) {
        // when session.echo is enabled, and startMessage is used, the helper will already be in the map
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._messageStartHandlers.forEach(cb => cb(messageHelper!));
      }
      if (messageHelper) messageHelper.dispatch(exchangeEvent.message);
    }

    if (exchangeEvent.metaEvent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._metaEventHandlers.forEach(cb => cb(exchangeEvent.metaEvent!));
    }

    if (exchangeEvent.exchangeError?.startError) {
      this.dispatchErrorStart(exchangeEvent.exchangeError.errorId, exchangeEvent.exchangeError.startError);
    }

    if (exchangeEvent.exchangeError?.endError) {
      this.dispatchErrorEnd(exchangeEvent.exchangeError.errorId, exchangeEvent.exchangeError.endError);
    }

    if (exchangeEvent.endExchange) {
      this.setEnded();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._endHandlers.forEach(cb => cb(exchangeEvent.endExchange!));
    }
  }

  /**
   * Internal method used by child MessageEventHelper to remove itself.
   */
  public removeMessage(helper: MessageEventHelperImpl) {
    if (this._messageMap.get(helper.messageId) === helper) {
      this._messageMap.delete(helper.messageId);
    }
  }

  protected getParentErrorScope(): boolean {
    return this.session.inErrorScope;
  }

  protected removeFromParent(): void {
    (this.session as SessionEventHelperImpl).removeExchange(this);
  }

  protected deleteChildren(): void {
    Array.from(this._messageMap.values()).forEach(messageHelper => messageHelper.delete());
  }

  protected getSession() {
    return this.session;
  }

}
