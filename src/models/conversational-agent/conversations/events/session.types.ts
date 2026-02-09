/**
 * Consumer-facing interface for SessionEventHelper
 *
 * Defines the public API for interacting with a real-time
 * conversation session. Sessions are the top-level container
 * for exchanges, messages, and streaming content.
 */

import type { ConversationId, Exchange, ExchangeId, ToolCallId } from '../types';
import type {
  AsyncInputStreamId,
  AsyncInputStreamStartEvent,
  ConversationEvent,
  ErrorEndEvent,
  ErrorId,
  ErrorStartEvent,
  ExchangeEndEvent,
  ExchangeStartEvent,
  LabelUpdatedEvent,
  MetaEvent,
  SessionEndEvent,
  SessionEndingEvent,
  SessionStartedEvent,
  SessionStartEvent,
  ToolCallStartEvent
} from './protocol.types';

import type { AsyncInputStreamStream } from './async-input-stream.types';
import type { AsyncToolCallStream } from './async-tool-call.types';
import type { ExchangeStream } from './exchange.types';

/**
 * Consumer-facing model for session event helpers.
 *
 * Provides methods for subscribing to conversation events
 * and controlling the session lifecycle. The `SessionStream` is the
 * top-level entry point for all real-time interactions.
 *
 * ## Real-Time Chat Flow
 *
 * Events flow through a nested hierarchy. Each level provides typed
 * stream helpers for subscribing to its children:
 *
 * ```
 * SessionStream (WebSocket connection)
 * ├── onSessionStarted         → session is ready
 * ├── onExchangeStart          → new request/response cycle
 * │   └── ExchangeStream
 * │       ├── onMessageStart   → user or assistant message
 * │       │   └── MessageStream
 * │       │       ├── onContentPartStart  → text, audio, image content
 * │       │       │   └── ContentPartStream
 * │       │       │       ├── onChunk          → streaming data
 * │       │       │       └── onContentPartEnd → part finished
 * │       │       ├── onToolCallStart     → agent invokes a tool
 * │       │       │   └── ToolCallStream
 * │       │       │       └── onToolCallEnd    → tool result
 * │       │       └── onInterruptStart    → needs user approval
 * │       │           └── sendInterruptEnd → user responds
 * │       └── onExchangeEnd
 * └── onSessionEnd             → session closed
 * ```
 *
 * ## Quick Start
 *
 * @example Streaming text responses
 * ```typescript
 * const session = conversation.startSession();
 *
 * session.onExchangeStart((exchange) => {
 *   exchange.onMessageStart((message) => {
 *     if (message.isAssistant) {
 *       message.onContentPartStart((part) => {
 *         if (part.isText) {
 *           part.onChunk((chunk) => {
 *             process.stdout.write(chunk.data ?? '');
 *           });
 *         }
 *       });
 *     }
 *   });
 * });
 *
 * // End the session when done
 * conversation.endSession();
 * ```
 *
 * ## Related Streams
 *
 * The following stream types are returned by SessionStream methods.
 * Click through for detailed API reference:
 *
 * - {@link ExchangeStream} — Returned by `startExchange()` / `onExchangeStart()`. Manages messages within a request-response cycle.
 * - {@link MessageStream} — Returned by `exchange.startMessage()` / `exchange.onMessageStart()`. Contains content parts, tool calls, and interrupts.
 * - {@link ContentPartStream} — Returned by `message.startContentPart()` / `message.onContentPartStart()`. Streams text, audio, image, or transcript data.
 * - {@link ToolCallStream} — Returned by `message.startToolCall()` / `message.onToolCallStart()`. Manages tool call lifecycle within a message.
 */
export interface SessionStream {
  /** The conversation ID this session belongs to */
  readonly conversationId: ConversationId;

  /**
   * Whether echo mode is enabled (emitted events are also dispatched to handlers)
   * @internal
   */
  readonly echo: boolean;

  /**
   * The start event, or undefined if not yet received
   * @internal
   */
  readonly startEventMaybe: SessionStartEvent | undefined;

  /**
   * The start event (throws if not yet received)
   * @internal
   */
  readonly startEvent: SessionStartEvent;

  /** Whether this session has ended */
  readonly ended: boolean;

  /**
   * Whether event emitting is currently paused
   * @internal
   */
  readonly isEmitPaused: boolean;

  /**
   * Pauses emitting events to the WebSocket
   *
   * Events are buffered internally and sent when `resumeEmits` is called.
   * Useful when you need to set up event handlers before events start flowing
   * (e.g., between starting a session and receiving the session started event).
   * @internal
   */
  pauseEmits(): void;

  /**
   * Resumes emitting events and flushes any buffered events
   *
   * All events that were buffered while paused are sent in order.
   * @internal
   */
  resumeEmits(): void;

  /**
   * Registers a handler for error start events at the session level
   *
   * @param cb - Callback receiving the error event
   * @returns Cleanup function to remove the handler
   *
   * @example
   * ```typescript
   * session.onErrorStart((error) => {
   *   console.error(`Session error [${error.errorId}]: ${error.message}`);
   * });
   * ```
   */
  onErrorStart(cb: (error: { errorId: ErrorId } & ErrorStartEvent) => void): () => void;

  /**
   * Registers a handler for error end events at the session level
   *
   * @param cb - Callback receiving the error end event
   * @returns Cleanup function to remove the handler
   *
   * @example
   * ```typescript
   * session.onErrorEnd((error) => {
   *   console.log(`Error ${error.errorId} resolved`);
   * });
   * ```
   */
  onErrorEnd(cb: (error: { errorId: ErrorId } & ErrorEndEvent) => void): () => void;

  /**
   * Registers a handler for exchange start events
   *
   * This is the primary entry point for handling agent responses.
   * Each exchange represents a request-response cycle containing
   * user and assistant messages.
   *
   * @param cb - Callback receiving each new exchange
   * @returns Cleanup function to remove the handler
   *
   * @example Streaming text with content type handling
   * ```typescript
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         if (part.isMarkdown) {
   *           part.onChunk((chunk) => renderMarkdown(chunk.data ?? ''));
   *         } else if (part.isAudio) {
   *           part.onChunk((chunk) => audioPlayer.enqueue(chunk.data ?? ''));
   *         } else if (part.isImage) {
   *           part.onChunk((chunk) => imageBuffer.append(chunk.data ?? ''));
   *         } else if (part.isTranscript) {
   *           part.onChunk((chunk) => showTranscript(chunk.data ?? ''));
   *         }
   *       });
   *     }
   *   });
   * });
   * ```
   *
   * @example Getting the complete response at once (no streaming)
   * ```typescript
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageCompleted((completed) => {
   *     console.log(`Message ${completed.messageId} (role: ${completed.role})`);
   *     for (const part of completed.contentParts) {
   *       console.log(part.text);
   *     }
   *     for (const tool of completed.toolCalls) {
   *       console.log(`${tool.toolName} → ${tool.output}`);
   *     }
   *   });
   * });
   * ```
   *
   * @example Handling tool calls and confirmation interrupts
   * ```typescript
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     if (message.isAssistant) {
   *       // Stream tool call events
   *       message.onToolCallStart((toolCall) => {
   *         const { toolName, input } = toolCall.startEvent;
   *         console.log(`Calling ${toolName}:`, JSON.parse(input ?? '{}'));
   *         toolCall.onToolCallEnd((end) => {
   *           console.log(`Result:`, JSON.parse(end.output ?? '{}'));
   *         });
   *       });
   *
   *       // Handle confirmation interrupts
   *       message.onInterruptStart(({ interruptId, startEvent }) => {
   *         if (startEvent.type === 'uipath_cas_tool_call_confirmation') {
   *           message.sendInterruptEnd(interruptId, { approved: true });
   *         }
   *       });
   *     }
   *   });
   * });
   * ```
   */
  onExchangeStart(cb: (exchange: ExchangeStream) => void): () => void;

  /**
   * Registers a handler for session started events
   *
   * Fired when the WebSocket connection is established and the
   * session is ready to send and receive events.
   *
   * @param cb - Callback receiving the started event
   * @returns Cleanup function to remove the handler
   *
   * @example
   * ```typescript
   * session.onSessionStarted((event) => {
   *   console.log('Session is ready');
   * });
   * ```
   */
  onSessionStarted(cb: (event: SessionStartedEvent) => void): () => void;

  /**
   * Registers a handler for session ending events
   *
   * Fired when the session is about to end. Use this for cleanup
   * before the session fully closes.
   *
   * @param cb - Callback receiving the ending event
   * @returns Cleanup function to remove the handler
   *
   * @example
   * ```typescript
   * session.onSessionEnding((event) => {
   *   console.log('Session is ending, performing cleanup...');
   * });
   * ```
   */
  onSessionEnding(cb: (event: SessionEndingEvent) => void): () => void;

  /**
   * Registers a handler for session end events
   *
   * Fired when the session has fully closed.
   *
   * @param cb - Callback receiving the end event
   * @returns Cleanup function to remove the handler
   *
   * @example
   * ```typescript
   * session.onSessionEnd((event) => {
   *   console.log('Session ended');
   * });
   * ```
   */
  onSessionEnd(cb: (event: SessionEndEvent) => void): () => void;

  /**
   * Registers a handler for label updated events
   * @param cb - Callback receiving the label update
   * @returns Cleanup function to remove the handler
   * @internal
   */
  onLabelUpdated(cb: (event: LabelUpdatedEvent) => void): () => void;

  /**
   * Sends a session started event
   * @param sessionStarted - Optional started event data
   * @internal
   */
  sendSessionStarted(sessionStarted?: SessionStartedEvent): void;

  /**
   * Sends a session end event and closes the session
   *
   * Prefer using `conversation.endSession()` instead of calling this directly.
   *
   * @param endSession - Optional end event data
   * @internal
   */
  sendSessionEnd(endSession?: SessionEndEvent): void;

  /**
   * Sends an error start event for this session
   * @param args - Error details including optional error ID and message
   * @internal
   */
  sendErrorStart(args: { errorId?: ErrorId } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this session
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: ErrorId } & ErrorEndEvent): void;

  /**
   * Sends a metadata event for this session
   * @param metaEvent - Metadata to send
   * @internal
   */
  sendMetaEvent(metaEvent: MetaEvent): void;

  // ==================== Exchange Management ====================

  /**
   * Starts a new exchange in this session
   *
   * Each exchange is a request-response cycle. Use `sendMessageWithContentPart`
   * on the returned {@link ExchangeStream} to send a user message, or
   * `startMessage` for fine-grained control.
   *
   * @param args - Optional exchange start options
   * @returns The exchange stream for sending messages
   *
   * @example Multi-exchange conversation
   * ```typescript
   * const session = conversation.startSession();
   *
   * // Listen for all assistant responses
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageCompleted((completed) => {
   *     if (completed.role === MessageRole.Assistant) {
   *       for (const part of completed.contentParts) {
   *         console.log('Assistant:', part.text);
   *       }
   *     }
   *   });
   * });
   *
   * // Send first user message
   * const exchange1 = session.startExchange();
   * await exchange1.sendMessageWithContentPart({
   *   data: 'What is the weather today?',
   *   role: MessageRole.User
   * });
   *
   * // Send follow-up in a new exchange
   * const exchange2 = session.startExchange();
   * await exchange2.sendMessageWithContentPart({
   *   data: 'And tomorrow?',
   *   role: MessageRole.User
   * });
   * ```
   */
  startExchange(args?: { exchangeId?: ExchangeId } & ExchangeStartEvent): ExchangeStream;

  /**
   * Iterator over all active exchanges in this session
   */
  readonly exchanges: Iterable<ExchangeStream>;

  /**
   * Retrieves an exchange by ID
   * @param exchangeId - The exchange ID to look up
   * @returns The exchange stream, or undefined if not found
   */
  getExchange(exchangeId: ExchangeId): ExchangeStream | undefined;

  // ==================== Async Tool Call Management ====================

  /**
   * Starts an async tool call at the session level
   * @param args - Tool call start options including tool name
   * @returns The async tool call stream for managing the lifecycle
   * @internal
   */
  startAsyncToolCall(args: { toolCallId?: ToolCallId } & ToolCallStartEvent): AsyncToolCallStream;

  /**
   * Registers a handler for async tool call start events
   * @param cb - Callback receiving each new async tool call
   * @returns Cleanup function to remove the handler
   * @internal
   */
  onAsyncToolCallStart(cb: (asyncToolCall: AsyncToolCallStream) => void): () => void;

  /**
   * Iterator over all active async tool calls in this session
   * @internal
   */
  readonly asyncToolCalls: Iterator<AsyncToolCallStream>;

  /**
   * Retrieves an async tool call by ID
   * @param toolCallId - The tool call ID to look up
   * @returns The async tool call stream, or undefined if not found
   * @internal
   */
  getAsyncToolCall(toolCallId: ToolCallId): AsyncToolCallStream | undefined;

  // ==================== Async Input Stream Management ====================

  /**
   * Starts an async input stream at the session level
   * @param args - Stream start options including MIME type
   * @returns The async input stream for sending data
   * @internal
   */
  startAsyncInputStream(args: { streamId?: AsyncInputStreamId } & AsyncInputStreamStartEvent): AsyncInputStreamStream;

  /**
   * Registers a handler for async input stream start events
   * @param cb - Callback receiving each new input stream
   * @returns Cleanup function to remove the handler
   * @internal
   */
  onInputStreamStart(cb: (inputStream: AsyncInputStreamStream) => void): () => void;

  /**
   * Iterator over all active async input streams in this session
   * @internal
   */
  readonly asyncInputStreams: Iterator<AsyncInputStreamStream>;

  /**
   * Retrieves an async input stream by ID
   * @param streamId - The stream ID to look up
   * @returns The async input stream, or undefined if not found
   * @internal
   */
  getAsyncInputStream(streamId: AsyncInputStreamId): AsyncInputStreamStream | undefined;

  // ==================== Advanced ====================

  /**
   * Emits a raw conversation event
   * @param conversationEvent - The event to emit (conversationId is added automatically)
   * @internal
   */
  emit(conversationEvent: Omit<ConversationEvent, 'conversationId'>): void;

  /**
   * Registers a handler for error start events from any nested helper
   *
   * Unlike `onErrorStart` which only catches errors at the session level,
   * this handler receives errors from all nested helpers (exchanges, messages,
   * content parts, tool calls, etc.).
   *
   * @param cb - Callback receiving the error event with its source
   * @returns Cleanup function to remove the handler
   * @internal
   */
  onAnyErrorStart(cb: (errorStart: { source: unknown; errorId: ErrorId } & ErrorStartEvent) => void): () => void;

  /**
   * Registers a handler for error end events from any nested helper
   *
   * Unlike `onErrorEnd` which only catches errors at the session level,
   * this handler receives error end events from all nested helpers.
   *
   * @param cb - Callback receiving the error end event with its source
   * @returns Cleanup function to remove the handler
   * @internal
   */
  onAnyErrorEnd(cb: (errorEnd: { source: unknown; errorId: ErrorId } & ErrorEndEvent) => void): () => void;

  /**
   * Replays persisted exchanges into this session
   *
   * Used to restore session state from previously saved exchange data.
   *
   * @param exchanges - The exchange data to replay
   * @internal
   */
  replay(exchanges: Exchange[]): void;

  /**
   * Returns a string representation of this session
   * @internal
   */
  toString(): string;
}
