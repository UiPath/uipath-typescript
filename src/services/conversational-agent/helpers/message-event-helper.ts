import {
  MessageRole,
  type InterruptEndEvent,
  type InterruptStartEvent,
  type MakeRequired,
  type Message,
  type MessageEndEvent,
  type MessageEvent,
  type MessageStartEvent,
  type MetaEvent
} from '@/models/conversational-agent';

import type { ContentPartEventHelper, ContentPartStartEventWithData } from './content-part-event-helper';
import { ContentPartEventHelperImpl } from './content-part-event-helper';
import { ConversationEventHelperBase } from './conversation-event-helper-base';
import type {
  CompletedContentPart,
  CompletedToolCall,
  ContentPartCompletedHandler,
  ContentPartStartEventOptions,
  ContentPartStartHandler,
  ContentPartStartHandlerAsync,
  ErrorEndEventOptions,
  ErrorStartEventOptions,
  InterruptEndHandler,
  InterruptStartHandler,
  MessageCompletedHandler,
  MessageEndHandler,
  ToolCallCompletedHandler,
  ToolCallStartEventWithId,
  ToolCallStartHandler,
  ToolCallStartHandlerAsync
} from './conversation-event-helper-common';
import {
  ConversationEventValidationError
} from './conversation-event-helper-common';
import type { MessageStream } from '@/models/conversational-agent';
import type { ExchangeEventHelper, ExchangeEventHelperImpl } from './exchange-event-helper';
import type { ToolCallEventHelper } from './tool-call-event-helper';
import { ToolCallEventHelperImpl } from './tool-call-event-helper';

/**
 * Helper for managing message events within an exchange.
 * Handles message lifecycle including content, tool calls, and citations.
 */
export abstract class MessageEventHelper extends ConversationEventHelperBase<
  MessageStartEvent,
  MessageEvent
> implements MessageStream {

  protected readonly _contentPartMap = new Map<string, ContentPartEventHelperImpl>();
  protected readonly _contentPartStartHandlers = new Array<ContentPartStartHandler>();
  protected readonly _endHandlers = new Array<MessageEndHandler>();
  protected readonly _toolCallStartHandlers = new Array<ToolCallStartHandler>();
  protected readonly _toolCallMap = new Map<string, ToolCallEventHelperImpl>();
  protected readonly _interruptStartHandlers = new Array<InterruptStartHandler>();
  protected readonly _interruptEndHandlers = new Array<InterruptEndHandler>();

  constructor(
    public readonly exchange: ExchangeEventHelper,
    public readonly messageId: string,

    /**
     * MessageStartEvent used to initialize the MessageEventHelper. Will be undefined if some other sub-event was
     * received before the start event. See also `startEvent`.
     */
    public readonly startEventMaybe: MessageStartEvent | undefined
  ) {
    super(exchange.manager);
    this.addStartEventTimestamp(startEventMaybe);
  }

  /**
   * MessageStartEvent used to initialize the MessageEventHelper. Throws an ConversationEventValidationError if some
   * other sub-event was received before the start event, which shouldn't happen under normal circumstances.
   */
  public get startEvent(): MakeRequired<MessageStartEvent, 'timestamp'> {
    if (!this.startEventMaybe) throw new ConversationEventValidationError(`Message ${this.messageId} has no start event.`);
    return this.startEventMaybe as MakeRequired<MessageStartEvent, 'timestamp'>; // timestamp is set by the constructor
  }

  /**
   * The role of this message (user, assistant, or system).
   * Returns undefined if the start event hasn't been received yet.
   */
  public get role(): MessageRole | undefined {
    return this.startEventMaybe?.role;
  }

  /**
   * Whether this message is from the user.
   * @example
   * ```typescript
   * message.onContentPartStart((contentPart) => {
   *   if (message.isUser) {
   *     console.log('User message content:', contentPart.mimeType);
   *   }
   * });
   * ```
   */
  public get isUser(): boolean {
    return this.startEventMaybe?.role === MessageRole.User;
  }

  /**
   * Whether this message is from the assistant.
   * @example
   * ```typescript
   * exchange.onMessageStart((message) => {
   *   if (message.isAssistant) {
   *     message.onContentPartStart((contentPart) => {
   *       contentPart.onChunk((chunk) => {
   *         process.stdout.write(chunk.data ?? '');
   *       });
   *     });
   *   }
   * });
   * ```
   */
  public get isAssistant(): boolean {
    return this.startEventMaybe?.role === MessageRole.Assistant;
  }

  /**
   * Whether this message is a system message.
   */
  public get isSystem(): boolean {
    return this.startEventMaybe?.role === MessageRole.System;
  }

  /**
   * Emits a message event through the parent exchange.
   */
  public emit(messageEvent: Omit<MessageEvent, 'messageId'>) {
    this.exchange.emit({
      message: { messageId: this.messageId, ...messageEvent }
    });
  }

  /**
   * Starts a new content part stream with automatic cleanup when callback is provided.
   * @returns ContentPartEventHelper for manual control or Promise when using callback.
   * @throws Error if message has already ended.
   */
  public startContentPart(args: ContentPartStartEventOptions): ContentPartEventHelper;
  public startContentPart(args: ContentPartStartEventOptions, cb: ContentPartStartHandlerAsync): Promise<void>;
  public startContentPart(args: ContentPartStartEventOptions, cb?: ContentPartStartHandlerAsync): ContentPartEventHelper | Promise<void> {
    this.assertNotEnded();

    const { contentPartId: providedId, properties, ...startContentPart } = args;
    const contentPartId = providedId ?? this.manager.makeId();

    // shallow copy start event because helper will add timestamp property we don't need to send to the service
    const helper = new ContentPartEventHelperImpl(this, contentPartId, { ...startContentPart });
    if (properties) helper.setProperties(properties);
    this._contentPartMap.set(contentPartId, helper);

    // Emit startContentPart event
    helper.emit({ startContentPart });

    if (cb) {
      return cb(helper).then((endEvent) => helper.sendContentPartEnd(endEvent || {}));
    }
    return helper;
  }

  /**
   * Iterator over all the content parts in this message.
   */
  public get contentParts(): IteratorObject<ContentPartEventHelper, undefined, undefined> {
    return this._contentPartMap.values();
  }

  /**
   * Retrieves the content part with a specified id from this message.
   * @param contentPartId The id of the content part to get.
   * @returns The ContentPartEventHelper for the specified id, or undefined if no such content part exists.
   */
  public getContentPart(contentPartId: string): ContentPartEventHelper | undefined {
    return this._contentPartMap.get(contentPartId);
  }

  /**
   * Sends a complete content part with data and optional mime type. Defaults to mimeType "text/markdown".
   */
  public async sendContentPart(args: ContentPartStartEventWithData) {
    const { data, mimeType, ...startContentPart } = args;
    await this.startContentPart({ mimeType: mimeType ?? 'text/markdown', ...startContentPart }, async contentPart => contentPart.sendChunk({ data }));
  }

  public startToolCall(args: ToolCallStartEventWithId): ToolCallEventHelper;
  public startToolCall(args: ToolCallStartEventWithId, cb: ToolCallStartHandlerAsync): Promise<void>;
  public startToolCall(args: ToolCallStartEventWithId, cb?: ToolCallStartHandlerAsync): ToolCallEventHelper | Promise<void> {
    this.assertNotEnded();

    const { toolCallId: providedId, properties, ...startToolCall } = args;
    const toolCallId = providedId ?? this.manager.makeId();

    // shallow copy start event because helper will add timestamp property we don't need to send to the service
    const helper = new ToolCallEventHelperImpl(this, toolCallId, { ...startToolCall });
    if (properties) helper.setProperties(properties);
    this._toolCallMap.set(toolCallId, helper);

    // Emit startToolCall event
    helper.emit({ startToolCall });

    if (cb) {
      return cb(helper).then((endEvent) => helper.sendToolCallEnd(endEvent || {}));
    }
    return helper;
  }

  /**
   * Iterator over all the tool calls in this message.
   */
  public get toolCalls(): IteratorObject<ToolCallEventHelper, undefined, undefined> {
    return this._toolCallMap.values();
  }

  /**
   * Retrieves the tool call with a specified id from this message.
   * @param toolCallId The id of the tool call to get.
   * @returns The ToolCallEventHelper for the specified id, or undefined if no such tool call exists.
   */
  public getToolCall(toolCallId: string): ToolCallEventHelper | undefined {
    return this._toolCallMap.get(toolCallId);
  }

  /**
   * Sends meta for this message.
   * @throws Error if message has already ended.
   */
  public sendMetaEvent(metaEvent: MetaEvent) {
    this.assertNotEnded();
    this.emit({
      metaEvent
    });
  }

  /**
   * Ends the message with optional end event data.
   * @throws Error if message has already ended.
   */
  public sendMessageEnd(endMessage: MessageEndEvent = {}) {
    this.assertNotEnded();
    this.setEnded();
    this.emit({ endMessage });
    this.delete();
  }

  /**
   * @deprecated Use sendMessageEnd
   */
  public sendEndMessage(endMessage: MessageEndEvent = {}) {
    this.sendMessageEnd(endMessage);
  }

  /**
   * Registers a handler for message end events.
   * @returns Cleanup function to remove the handler.
   */
  public onMessageEnd(cb: MessageEndHandler) {
    this._endHandlers.push(cb);
    return () => {
      const index = this._endHandlers.indexOf(cb);
      if (index >= 0) this._endHandlers.splice(index, 1);
    };
  }

  /**
   * @deprecated Use onMessageEnd
   */
  public onEndMessage(cb: MessageEndHandler) {
    this.onMessageEnd(cb);
  }

  /**
   * Registers a handler for content part start events.
   * @returns Cleanup function to remove the handler.
   */
  public onContentPartStart(cb: ContentPartStartHandler) {
    this._contentPartStartHandlers.push(cb);
    return () => {
      const index = this._contentPartStartHandlers.indexOf(cb);
      if (index >= 0) this._contentPartStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler that receives complete content parts after a content part stream ends.
   */
  public onContentPartCompleted(cb: ContentPartCompletedHandler) {
    this.onContentPartStart(contentPart => {
      contentPart.onCompleted(cb);
    });
  }

  /**
   * Registers a handler for tool call start events.
   * @returns Cleanup function to remove the handler.
   */
  public onToolCallStart(cb: ToolCallStartHandler) {
    this._toolCallStartHandlers.push(cb);
    return () => {
      const index = this._toolCallStartHandlers.indexOf(cb);
      if (index >= 0) this._toolCallStartHandlers.splice(index, 1);
    };
  }

  public onToolCallCompleted(cb: ToolCallCompletedHandler) {
    this.onToolCallStart(toolCall => {
      toolCall.onToolCallEnd(endEvent => {
        cb({ toolCallId: toolCall.toolCallId, ...toolCall.startEvent, ...endEvent });
      });
    });
  }

  /**
   * Registers a handler for interrupt start events.
   * @returns Cleanup function to remove the handler.
   */
  public onInterruptStart(cb: InterruptStartHandler) {
    this._interruptStartHandlers.push(cb);
    return () => {
      const index = this._interruptStartHandlers.indexOf(cb);
      if (index >= 0) this._interruptStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for interrupt end events.
   * @returns Cleanup function to remove the handler.
   */
  public onInterruptEnd(cb: InterruptEndHandler) {
    this._interruptEndHandlers.push(cb);
    return () => {
      const index = this._interruptEndHandlers.indexOf(cb);
      if (index >= 0) this._interruptEndHandlers.splice(index, 1);
    };
  }

  /**
   * Sends an interrupt start event.
   */
  public sendInterrupt(interruptId: string, startInterrupt: InterruptStartEvent) {
    this.assertNotEnded();
    this.emit({
      interrupt: {
        interruptId,
        startInterrupt
      }
    });
  }

  /**
   * Sends an interrupt end event.
   */
  public sendInterruptEnd(interruptId: string, endInterrupt: InterruptEndEvent) {
    this.assertNotEnded();
    this.emit({
      interrupt: {
        interruptId,
        endInterrupt
      }
    });
  }

  /**
   * Sends an error start event for this message.
   */
  public sendErrorStart(args: ErrorStartEventOptions) {
    this.assertNotEnded();
    const { errorId: providedId, ...startError } = args;
    const errorId = providedId ?? this.manager.makeId();
    this.emit({
      messageError: {
        errorId,
        startError
      }
    });
    this.errors.set(errorId, startError);
  }

  /**
   * Sends an error end event for this message.
   */
  public sendErrorEnd(args: ErrorEndEventOptions) {
    this.assertNotEnded();
    const { errorId, ...endError } = args;
    this.emit({
      messageError: {
        errorId,
        endError
      }
    });
    this.errors.delete(errorId);
  }

  public onCompleted(cb: MessageCompletedHandler) {
    const contentParts = new Array<CompletedContentPart>();
    this.onContentPartCompleted(completedContentPart => {
      contentParts.push(completedContentPart);
    });

    const toolCalls = new Array<CompletedToolCall>();
    this.onToolCallCompleted(completedToolCall => {
      toolCalls.push(completedToolCall);
    });

    this.onMessageEnd(endMessage => {
      cb({ messageId: this.messageId, contentParts, toolCalls, ...this.startEventMaybe, ...endMessage });
    });

  }

  public toString() {
    return `MessageEventHelper(${this.messageId})`;
  }

}

export class MessageEventHelperImpl extends MessageEventHelper {

  public static *replay(message: Message): Generator<MessageEvent> {

    yield {
      messageId: message.messageId,
      startMessage: {
        role: message.role,
        timestamp: message.createdTime ?? (message as any).createdAt
      }
    };

    for (const contentPart of message.contentParts) {
      for (const contentPartEvent of ContentPartEventHelperImpl.replay(contentPart)) {
        yield {
          messageId: message.messageId,
          contentPart: contentPartEvent
        };
      }
    }

    for (const toolCall of message.toolCalls) {
      for (const toolCallEvent of ToolCallEventHelperImpl.replay(toolCall)) {
        yield {
          messageId: message.messageId,
          toolCall: toolCallEvent
        };
      }
    }

    yield {
      messageId: message.messageId,
      endMessage: {}
    };

  }

  /**
   * Dispatches incoming message events to registered handlers.
   */
  public dispatch(messageEvent: MessageEvent): void {
    if (messageEvent.messageId !== this.messageId) return;

    if (this._eventBuffer) {
      this._eventBuffer.push(messageEvent);
      return;
    }

    if (messageEvent.contentPart) {
      let contentPartHelper = this._contentPartMap.get(messageEvent.contentPart.contentPartId);
      if (!contentPartHelper && this._contentPartStartHandlers.length > 0) {
        contentPartHelper = new ContentPartEventHelperImpl(this, messageEvent.contentPart.contentPartId, messageEvent.contentPart.startContentPart);
        this._contentPartMap.set(messageEvent.contentPart.contentPartId, contentPartHelper);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._contentPartStartHandlers.forEach(cb => cb(contentPartHelper!));
      } else if (messageEvent.contentPart.startContentPart) {
        // when session.echo is enabled, and startContentPart is used, the helper will already be in the map
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._contentPartStartHandlers.forEach(cb => cb(contentPartHelper!));
      }
      if (contentPartHelper) contentPartHelper.dispatch(messageEvent.contentPart);
    }

    if (messageEvent.toolCall) {
      let toolCallHelper = this._toolCallMap.get(messageEvent.toolCall.toolCallId);
      if (!toolCallHelper && this._toolCallStartHandlers.length > 0) {
        toolCallHelper = new ToolCallEventHelperImpl(this, messageEvent.toolCall.toolCallId, messageEvent.toolCall.startToolCall);
        this._toolCallMap.set(messageEvent.toolCall.toolCallId, toolCallHelper);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._toolCallStartHandlers.forEach(cb => cb(toolCallHelper!));
      } else if (messageEvent.toolCall.startToolCall) {
        // when session.echo is enabled, and startToolCall is used, the helper will already be in the map
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._toolCallStartHandlers.forEach(cb => cb(toolCallHelper!));
      }
      if (toolCallHelper) toolCallHelper.dispatch(messageEvent.toolCall);
    }

    if (messageEvent.interrupt) {
      if (messageEvent.interrupt.startInterrupt) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._interruptStartHandlers.forEach(cb => cb({ interruptId: messageEvent.interrupt!.interruptId, startEvent: messageEvent.interrupt!.startInterrupt! }));
      }
      if (messageEvent.interrupt.endInterrupt) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._interruptEndHandlers.forEach(cb => cb({ interruptId: messageEvent.interrupt!.interruptId, endEvent: messageEvent.interrupt!.endInterrupt! }));
      }
    }

    if (messageEvent.metaEvent) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._metaEventHandlers.forEach(cb => cb(messageEvent.metaEvent!));
    }

    if (messageEvent.messageError?.startError) {
      this.dispatchErrorStart(messageEvent.messageError.errorId, messageEvent.messageError.startError);
    }

    if (messageEvent.messageError?.endError) {
      this.dispatchErrorEnd(messageEvent.messageError.errorId, messageEvent.messageError.endError);
    }

    if (messageEvent.endMessage) {
      this.setEnded();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._endHandlers.forEach(cb => cb(messageEvent.endMessage!));
      this.delete();
    }
  }

  /**
   * Internal method used by child ContentPartEventHelper to remove itself.
   */
  public removeContentPart(helper: ContentPartEventHelperImpl) {
    if (this._contentPartMap.get(helper.contentPartId) === helper) {
      this._contentPartMap.delete(helper.contentPartId);
    }
  }

  /**
   * Internal method used by child ToolCallEventHelper to remove itself.
   */
  public removeToolCall(helper: ToolCallEventHelperImpl) {
    if (this._toolCallMap.get(helper.toolCallId) === helper) {
      this._toolCallMap.delete(helper.toolCallId);
    }
  }

  protected removeFromParent(): void {
    (this.exchange as ExchangeEventHelperImpl).removeMessage(this);
  }

  protected deleteChildren(): void {
    Array.from(this._contentPartMap.values()).forEach(contentPartHelper => contentPartHelper.delete());
    Array.from(this._toolCallMap.values()).forEach(toolCallHelper => toolCallHelper.delete());
  }

  protected getParentErrorScope(): boolean {
    return this.exchange.inErrorScope;
  }

  protected getSession() {
    return this.exchange.session;
  }

}
