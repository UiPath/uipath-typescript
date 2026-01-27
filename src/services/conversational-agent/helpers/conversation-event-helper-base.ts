import type {
  ErrorEndEvent,
  ErrorId,
  ErrorStartEvent
} from '@/models/conversational-agent';

import type {
  AnyErrorEndHandlerArgs,
  AnyErrorStartHandlerArgs,
  ConversationEventHelperProperties, DeletedHandler,
  ErrorEndHandler,
  ErrorStartHandler,
  MetaEventHandler
} from './conversation-event-helper-common';
import {
  ConversationEventInvalidOperationError
} from './conversation-event-helper-common';
import type { ConversationEventHelperManager, ConversationEventHelperManagerImpl } from './conversation-event-helper-manager';
import type { SessionEventHelper, SessionEventHelperImpl } from './session-event-helper';

/**
 * Base class for all conversation event helpers, providing common functionality for:
 * - Event buffering (pause/resume)
 * - Property storage
 * - Error state management
 * - Lifecycle state (ended/deleted)
 * - Handler registration for errors, meta events, and deletion
 *
 * @template TId - The ID type for this helper (ConversationId, ExchangeId, etc.)
 * @template TStartEvent - The start event type for this helper
 * @template TEvent - The event type for this helper (used for event buffering)
 */
export abstract class ConversationEventHelperBase<
  TStartEvent,
  TEvent
> {

  /**
   * Can be used to store application defined properties related to this helper.
   */
  public readonly properties: Record<string, unknown> = {};

  /**
   * The active errors for this helper. Entries are added when a start error event is sent or received, and removed
   * when the end error event is sent or received.
   */
  public readonly errors = new Map<ErrorId, ErrorStartEvent>();

  /**
   * Reference to the conversation event helper manager.
   */
  public readonly manager: ConversationEventHelperManager;

  protected _ended = false;
  protected _deleted = false;
  protected _eventBuffer: Array<TEvent> | null = null;

  protected readonly _errorStartHandlers = new Array<ErrorStartHandler>();
  protected readonly _errorEndHandlers = new Array<ErrorEndHandler>();
  protected readonly _metaEventHandlers = new Array<MetaEventHandler>();
  protected readonly _deletedHandlers = new Array<DeletedHandler>();

  constructor(
    manager: ConversationEventHelperManager
  ) {
    this.manager = manager;
  }

  /**
   * The start event used to initialize this helper. May be undefined if some other sub-event
   * was received before the start event.
   */
  public abstract get startEventMaybe(): TStartEvent | undefined;

  /**
   * Returns a string representation of this helper for debugging.
   */
  public abstract toString(): string;

  /**
   * Returns true if the parent scope has an error. Used for error scope chaining.
   */
  protected abstract getParentErrorScope(): boolean;

  /**
   * Removes this helper from its parent's collection. Called during deletion.
   */
  protected abstract removeFromParent(): void;

  /**
   * Deletes any child helpers managed by this helper. Called during deletion.
   */
  protected abstract deleteChildren(): void;

  /**
   * Buffer received events, until `resume` is called.
   */
  public pause() {
    if (!this._eventBuffer) {
      this._eventBuffer = [];
    }
  }

  /**
   * Resume the processing of received events. All registered event handlers will be called before `resume` returns.
   * Subclasses must implement dispatch to handle buffered events.
   */
  public resume() {
    if (this._eventBuffer) {
      const eventBuffer = this._eventBuffer;
      this._eventBuffer = null;
      eventBuffer.forEach(event => this.dispatch(event));
    }
  }

  /**
   * Determine if event processing is currently paused.
   */
  public get isPaused() {
    return this._eventBuffer !== null;
  }

  /**
   * Determines if there is an error condition associated with this helper.
   */
  public get hasError() {
    return this.errors.size > 0;
  }

  /**
   * Determines if there is an error condition associated with this helper or any parent scope.
   */
  public get inErrorScope() {
    return this.hasError || this.getParentErrorScope();
  }

  /**
   * Determines if this helper has ended.
   */
  public get ended() {
    return this._ended;
  }

  /**
   * Determines if this helper has been deleted.
   */
  public get deleted() {
    return this._deleted;
  }

  /**
   * Gets application-defined properties with the specified type.
   */
  public getProperties<T extends ConversationEventHelperProperties>(): T {
    return this.properties as T;
  }

  /**
   * Sets application-defined properties.
   */
  public setProperties<T extends ConversationEventHelperProperties>(properties: T) {
    Object.assign(this.properties, properties);
  }

  /**
   * Registers a handler for error start events.
   * @returns Cleanup function to remove the handler.
   */
  public onErrorStart(cb: ErrorStartHandler) {
    this._errorStartHandlers.push(cb);
    return () => {
      const index = this._errorStartHandlers.indexOf(cb);
      if (index >= 0) this._errorStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for error end events.
   * @returns Cleanup function to remove the handler.
   */
  public onErrorEnd(cb: ErrorEndHandler) {
    this._errorEndHandlers.push(cb);
    return () => {
      const index = this._errorEndHandlers.indexOf(cb);
      if (index >= 0) this._errorEndHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for meta events.
   * @returns Cleanup function to remove the handler.
   */
  public onMetaEvent(cb: MetaEventHandler) {
    this._metaEventHandlers.push(cb);
    return () => {
      const index = this._metaEventHandlers.indexOf(cb);
      if (index >= 0) this._metaEventHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler that is called when this helper is deleted.
   * @returns Cleanup function to remove the handler.
   */
  public onDeleted(cb: DeletedHandler) {
    this._deletedHandlers.push(cb);
    return () => {
      const index = this._deletedHandlers.indexOf(cb);
      if (index >= 0) this._deletedHandlers.splice(index, 1);
    };
  }

  /**
   * Deletes this helper, removing it from its parent and cleaning up all child helpers.
   */
  public delete() {
    this._deleted = true;
    this.removeFromParent();
    this.deleteChildren();
    this._deletedHandlers.forEach(handler => handler());
  }

  /**
   * Dispatches events to registered handlers. This is an internal method used by the event system.
   * Subclasses implement this in their Impl class.
   * @internal
   */
  protected abstract dispatch(event: TEvent): void;

  /**
   * Helper method for dispatching error start events. Used by subclass dispatch implementations.
   */
  protected dispatchErrorStart(errorId: ErrorId, startError: ErrorStartEvent) {
    this.errors.set(errorId, startError);
    this._errorStartHandlers.forEach(cb => cb({ errorId, ...startError }));
    let handled = this._errorStartHandlers.length > 0;
    const args: AnyErrorStartHandlerArgs = { source: this, errorId, ...startError };
    handled = (this.getSession() as SessionEventHelperImpl).dispatchAnyErrorStart(args) || handled;
    handled = (this.manager as ConversationEventHelperManagerImpl).dispatchAnyErrorStart(args) || handled;
    if (!handled) {
      (this.manager as ConversationEventHelperManagerImpl).dispatchUnhandledErrorStart(args);
    }
  }

  /**
   * Helper method for dispatching error end events. Used by subclass dispatch implementations.
   */
  protected dispatchErrorEnd(errorId: ErrorId, endError: ErrorEndEvent) {
    this.errors.delete(errorId);
    this._errorEndHandlers.forEach(cb => cb({ errorId, ...endError }));
    let handled = this._errorEndHandlers.length > 0;
    const args: AnyErrorEndHandlerArgs = { source: this, errorId, ...endError };
    handled = (this.getSession() as SessionEventHelperImpl).dispatchAnyErrorEnd(args) || handled;
    handled = (this.manager as ConversationEventHelperManagerImpl).dispatchAnyErrorEnd(args) || handled;
    if (!handled) {
      (this.manager as ConversationEventHelperManagerImpl).dispatchUnhandledErrorEnd(args);
    }
  }

  /**
   * Marks this helper as ended. Used by subclass send end event methods.
   */
  protected setEnded() {
    this._ended = true;
  }

  /**
   * Asserts that this helper has not ended. Throws if it has.
   * @throws ConversationEventInvalidOperationError if helper has ended
   */
  protected assertNotEnded() {
    if (this._ended) {
      throw new ConversationEventInvalidOperationError(`${this.toString()} has already ended.`);
    }
  }

  /**
   * Sets the timestamp property in the start event object if the object is defined by the property isn't.
   */
  protected addStartEventTimestamp<T extends { timestamp?: string }>(startEventMaybe?: T) {
    if (startEventMaybe && !startEventMaybe.timestamp) {
      startEventMaybe.timestamp = new Date().toISOString();
    }
  }

  protected abstract getSession(): SessionEventHelper;

}
