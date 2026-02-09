/**
 * Consumer-facing interface for AsyncToolCallEventHelper
 *
 * Defines the public API for interacting with async tool call events
 * at the session level. Async tool calls represent long-running tool
 * invocations that span across exchanges.
 */

import type { MakeRequired, ToolCallId } from '../types';
import type { ErrorEndEvent, ErrorId, ErrorStartEvent, MetaEvent, ToolCallEndEvent, ToolCallEvent, ToolCallStartEvent } from './protocol.types';

/**
 * Consumer-facing model for async tool call event helpers.
 *
 * Async tool calls operate at the session level (not within a single message)
 * and can span across multiple exchanges. They are used for long-running
 * tool invocations that need to persist beyond a single request-response cycle.
 *
 * Unlike regular {@link ToolCallStream} which live inside a message,
 * async tool calls are managed directly on the {@link SessionStream}.
 *
 * @example Listening for async tool call completion
 * ```typescript
 * session.onAsyncToolCallStart((toolCall) => {
 *   console.log(`Async tool started: ${toolCall.startEvent.toolName}`);
 *   toolCall.onToolCallEnd((endEvent) => {
 *     console.log('Async tool completed:', endEvent.output);
 *   });
 * });
 * ```
 *
 * @example Starting and completing an async tool call
 * ```typescript
 * // Start a long-running analysis
 * const toolCall = session.startAsyncToolCall({
 *   toolName: 'document-analysis',
 *   input: JSON.stringify({ documentId: 'doc-123' })
 * });
 *
 * // ... perform the analysis across multiple exchanges ...
 *
 * // Complete when done
 * toolCall.sendToolCallEnd({
 *   output: JSON.stringify({ summary: 'Analysis complete', pages: 42 })
 * });
 * ```
 *
 * @example Handling errors on async tool calls
 * ```typescript
 * session.onAsyncToolCallStart((toolCall) => {
 *   toolCall.onErrorStart((error) => {
 *     console.error(`Async tool error: ${error.message}`);
 *   });
 * });
 * ```
 */
export interface AsyncToolCallStream {
  /** Unique identifier for this async tool call */
  readonly toolCallId: ToolCallId;

  /**
   * The start event, or undefined if not yet received
   * @internal
   */
  readonly startEventMaybe: ToolCallStartEvent | undefined;

  /**
   * The start event (throws if not yet received)
   * @internal
   */
  readonly startEvent: MakeRequired<ToolCallStartEvent, 'timestamp'>;

  /** Whether this async tool call has ended */
  readonly ended: boolean;

  /**
   * Registers a handler for error start events
   * @param cb - Callback receiving the error event
   * @returns Cleanup function to remove the handler
   */
  onErrorStart(cb: (error: { errorId: ErrorId } & ErrorStartEvent) => void): () => void;

  /**
   * Registers a handler for error end events
   * @param cb - Callback receiving the error end event
   * @returns Cleanup function to remove the handler
   */
  onErrorEnd(cb: (error: { errorId: ErrorId } & ErrorEndEvent) => void): () => void;

  /**
   * Registers a handler for tool call end events
   * @param cb - Callback receiving the end event
   * @returns Cleanup function to remove the handler
   */
  onToolCallEnd(cb: (endToolCall: ToolCallEndEvent) => void): () => void;

  // ==================== Sending ====================

  /**
   * Ends the async tool call
   * @param endToolCall - Optional end event data including output
   */
  sendToolCallEnd(endToolCall?: ToolCallEndEvent): void;

  // ==================== Advanced ====================

  /**
   * Sends an error start event for this async tool call
   * @param args - Error details including optional error ID and message
   * @internal
   */
  sendErrorStart(args: { errorId?: ErrorId } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this async tool call
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: ErrorId } & ErrorEndEvent): void;

  /**
   * Sends a metadata event for this async tool call
   * @param metaEvent - Metadata to send
   * @internal
   */
  sendMetaEvent(metaEvent: MetaEvent): void;

  /**
   * Emits a raw tool call event
   * @param toolCallEvent - The event to emit (toolCallId is added automatically)
   * @internal
   */
  emit(toolCallEvent: Omit<ToolCallEvent, 'toolCallId'>): void;

  /**
   * Returns a string representation of this async tool call
   * @internal
   */
  toString(): string;
}
