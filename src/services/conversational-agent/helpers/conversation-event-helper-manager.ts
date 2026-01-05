import type {
  ConversationEvent,
  ConversationId
} from '@/models/conversational';

import type {
  AnyErrorEndHandler,
  AnyErrorEndHandlerArgs,
  AnyErrorStartHandler,
  AnyErrorStartHandlerArgs,
  ConversationEventHandler,
  ConversationEventHelperManagerConfig,
  ErrorEndEventOptions,
  ErrorEndHandler,
  ErrorStartEventOptions,
  SessionStartEventOptions,
  SessionStartHandler as SessionStartHandler,
  SessionStartHandlerAsync,
  UnhandledErrorEndHandler,
  UnhandledErrorEndHandlerArgs,
  UnhandledErrorStartHandler,
  UnhandledErrorStartHandlerArgs
} from './conversation-event-helper-common';
import type { SessionEventHelper } from './session-event-helper';
import { SessionEventHelperImpl } from './session-event-helper';

/**
 * Provides functions for sending and receiving conversation events.
 */
export abstract class ConversationEventHelperManager {

  // This abstract class is used as the public interface while ConversationEventHelperManagerImpl extends this class to
  // define the dispatch and removeSession methods, which are used internally but aren't expected to be called by end
  // users of the SDK.

  protected readonly _sessionStartHandlers = new Array<SessionStartHandler>();
  protected readonly _sessionMap = new Map<ConversationId, SessionEventHelperImpl>();

  protected readonly _anyEventHandlers = new Array<ConversationEventHandler>();

  protected readonly _anyErrorStartHandlers = new Array<AnyErrorStartHandler>();
  protected readonly _anyErrorEndHandlers = new Array<AnyErrorEndHandler>();
  protected readonly _unhandledErrorStartHandlers = new Array<UnhandledErrorStartHandler>();
  protected readonly _unhandledErrorEndHandlers = new Array<UnhandledErrorEndHandler>();

  constructor(private readonly config: ConversationEventHelperManagerConfig) {};

  public makeId() {
    return (crypto.randomUUID().toUpperCase());
  }

  /**
   * Sends a conversation event to the service. Typically client applications use the various helper methods, like
   * startSession or sendErrorStart on this object or on the nested helper objects it creates, rather than using this
   * API.
   *
   * @param conversationEvent The event to send.
   */
  public emitAny(conversationEvent: ConversationEvent) {
    this.config.emit(conversationEvent);
  }

  /**
   * Registers a handler that will be called whenever any conversation event is received. Typically client applications
   * use the various helper methods, like onSessionStarted on an Session object returned by startSession, rather than
   * using this API.
   *
   * @returns Cleanup function to remove the handler.
   */
  public onAny(cb: ConversationEventHandler) {
    this._anyEventHandlers.push(cb);
    return () => {
      const index = this._anyEventHandlers.indexOf(cb);
      if (index !== -1) this._anyEventHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler for session start events.
   * @returns Cleanup function to remove the handler.
   */
  public onSessionStart(cb: SessionStartHandler) {
    this._sessionStartHandlers.push(cb);
    return () => {
      const index = this._sessionStartHandlers.indexOf(cb);
      if (index >= 0) this._sessionStartHandlers.splice(index, 1);
    };
  }

  /**
   * Send an {@link SessionStartEvent} to indicate the start of an event stream for a conversation and return a
   * {@link SessionEventHelper} for that conversation.
   *
   * @param args a {@link SessionStartEvent} with a required conversationId property.
   * #
   */
  public startSession(args: SessionStartEventOptions): SessionEventHelper;

  /**
   * Send an {@link SessionStartEvent} to indicate the start of an event stream for a conversation and call an
   * async function with a {@link SessionEventHelper} for that conversation. A {@link SessionEndEvent} will
   * be sent when the function completes.
   *
   * @param args a {@link SessionStartEvent} with a required conversationId property.
   * @param cb a function called with a {@link SessionEventHelper} for the started conversation.
   */
  public startSession(args: SessionStartEventOptions, cb: SessionStartHandlerAsync): Promise<void>;

  /**
   * @ignore
   */
  public startSession(args: SessionStartEventOptions, cb?: SessionStartHandlerAsync): SessionEventHelper | Promise<void> {
    const { conversationId, echo, properties, ...startSession } = args;

    const existingHelper = this._sessionMap.get(conversationId);
    if (existingHelper) {
      existingHelper.delete();
    }

    const helper = new SessionEventHelperImpl(this, conversationId, startSession, echo);
    if (properties) helper.setProperties(properties);

    this._sessionMap.set(conversationId, helper);

    helper.emit({ startSession });

    if (cb) {
      return cb(helper).then((endEvent) => helper.sendSessionEnd(endEvent || {}));
    }

    return helper;
  }

  /**
   * An iterator over current sessions.
   */
  public get sessions(): Iterable<SessionEventHelper> {
    return this._sessionMap.values();
  }

  /**
   * Retrieves the session for a specified conversation id.
   *
   * @param conversationId The conversation id of the session to retrieve.
   * @returns The existing SessionEventHelper object for the specified conversation id, or undefined if no such session exists.
   */
  public getSession(conversationId: ConversationId) {
    return this._sessionMap.get(conversationId);
  }

  /**
   * Sends an error start event for a specified conversation. As a special case, this function allows any value for
   * conversationId, not just string. This is so that errors for invalid conversation ids can be emitted.
   */
  public sendErrorStart(args: ErrorStartEventOptions & { conversationId: any }) {
    const { conversationId, errorId: providedId, ...startError } = args;
    const errorId = providedId ?? this.makeId();
    this.emitAny({
      conversationId,
      conversationError: {
        errorId,
        startError
      }
    });
  }

  /**
   * Sends an error end event for this conversation. As a special case, this function allows any value for
   * conversationId, not just string. This is so that errors for invalid conversation ids can be emitted.
   */
  public sendErrorEnd(args: ErrorEndEventOptions & { conversationId: any }) {
    const { conversationId, errorId, ...endError } = args;
    this.emitAny({
      conversationId,
      conversationError: {
        errorId,
        endError
      }
    });
  }

  public toString() {
    return `ConversationEventHelperManager()`;
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

  /**
   * Registers a handler that will be called when an error start event is received by any nested conversation event
   * helper object and that helper has no error start event handler, and there is no onAnyErrorStart event handler. If
   * there is no unhandled error start event handler, an exception will be thrown as an unhandled promise rejection.
   *
   * @returns Cleanup function to remove the handler.
   */
  public onUnhandledErrorStart(cb: UnhandledErrorStartHandler) {
    this._unhandledErrorStartHandlers.push(cb);
    return () => {
      const index = this._unhandledErrorStartHandlers.indexOf(cb);
      if (index >= 0) this._unhandledErrorStartHandlers.splice(index, 1);
    };
  }

  /**
   * Registers a handler that will be called when an error start event is received by any nested conversation event
   * helper object and that helper has no error start event handler, and there is no onAnyErrorStart event handler.
   *
   * @returns Cleanup function to remove the handler.
   */
  public onUnhandledErrorEnd(cb: ErrorEndHandler) {
    this._unhandledErrorEndHandlers.push(cb);
    return () => {
      const index = this._unhandledErrorEndHandlers.indexOf(cb);
      if (index >= 0) this._unhandledErrorEndHandlers.splice(index, 1);
    };
  }

}

export class ConversationEventHelperManagerImpl extends ConversationEventHelperManager {

  /**
   * Internal method.
   */
  public dispatch(conversationEvent: ConversationEvent) {

    // Dispatch to any event handlers.
    this._anyEventHandlers.forEach(cb => cb(conversationEvent));

    // dispatch to session helper, creating if necessary
    const conversationId = conversationEvent.conversationId;
    let sessionHelper = this._sessionMap.get(conversationId);
    if (!sessionHelper) {
      sessionHelper = new SessionEventHelperImpl(this, conversationId, conversationEvent.startSession);
      this._sessionMap.set(conversationId, sessionHelper);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this._sessionStartHandlers.forEach(cb => cb(sessionHelper!));
    }
    sessionHelper.dispatch(conversationEvent);
  }

  /**
   * Internal method.
   */
  public removeSession(helper: SessionEventHelperImpl) {
    if (this._sessionMap.get(helper.conversationId) === helper) {
      this._sessionMap.delete(helper.conversationId);
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
   * Internal method.
   */
  public dispatchUnhandledErrorStart(args: UnhandledErrorStartHandlerArgs) {

    const { source, errorId, ...startEvent } = args;

    // If there is an unhandled error handler, don't throw
    if (this._unhandledErrorStartHandlers.length > 0) {

      this._unhandledErrorStartHandlers.forEach(cb => cb(args));

    } else {

      // Cause an unhandled rejection error to be emitted. We don't want to throw back up the call chain.
      const throwAsync = async () => {
        throw new Error(`Unhandled Conversation Event Error ${errorId} on ${source}: ${JSON.stringify(startEvent)}`);
      };
      throwAsync();

    }

  }

  /**
   * Internal method.
   */
  public dispatchUnhandledErrorEnd(args: UnhandledErrorEndHandlerArgs) {
    this._unhandledErrorEndHandlers.forEach(cb => cb(args));
  }

}
