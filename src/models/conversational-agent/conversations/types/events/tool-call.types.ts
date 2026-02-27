/**
 * Consumer-facing interface for ToolCallEventHelper
 *
 * Defines the public API for interacting with tool call events
 * within a message. Tool calls represent external tool invocations
 * made by the assistant during a conversation.
 */

import type { MakeRequired } from '..';
import type { ErrorEndEvent, ErrorStartEvent, MetaEvent, ToolCallEndEvent, ToolCallEvent, ToolCallStartEvent } from './protocol.types';

/**
 * Aggregated data for a completed tool call
 *
 * Contains the merged start and end event data
 * available after a tool call has ended.
 */
export type CompletedToolCall = ToolCallStartEvent & ToolCallEndEvent & {
  toolCallId: string;
};

/**
 * Consumer-facing model for tool call event helpers.
 *
 * A tool call represents the agent invoking an external tool (API call,
 * database query, etc.) during a conversation. Tool calls live within
 * a message and have a start event (with tool name and input) and an
 * end event (with the output/result).
 *
 * @example Listening for tool call results
 * ```typescript
 * message.onToolCallStart((toolCall) => {
 *   console.log(`Tool: ${toolCall.startEvent.toolName}`);
 *   toolCall.onToolCallEnd((endEvent) => {
 *     console.log('Tool call completed:', endEvent.output);
 *   });
 * });
 * ```
 *
 * @example Parsing tool call input and output
 * ```typescript
 * message.onToolCallStart((toolCall) => {
 *   const { toolName, input } = toolCall.startEvent;
 *   const parsedInput = JSON.parse(input ?? '{}');
 *   console.log(`Calling ${toolName} with:`, parsedInput);
 *
 *   toolCall.onToolCallEnd((endEvent) => {
 *     const result = JSON.parse(endEvent.output ?? '{}');
 *     console.log(`${toolName} returned:`, result);
 *   });
 * });
 * ```
 *
 * @example Responding to a tool call (agent-side)
 * ```typescript
 * message.onToolCallStart(async (toolCall) => {
 *   const { toolName, input } = toolCall.startEvent;
 *
 *   // Execute the tool and return the result
 *   const result = await executeTool(toolName, input);
 *   toolCall.sendToolCallEnd({
 *     output: JSON.stringify(result)
 *   });
 * });
 * ```
 */
export interface ToolCallStream {
  /** Unique identifier for this tool call */
  readonly toolCallId: string;

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

  /** Whether this tool call has ended */
  readonly ended: boolean;

  /**
   * Registers a handler for error start events
   *
   * @param cb - Callback receiving the error event
   * @returns Cleanup function to remove the handler
   *
   * @example Tool call error handling
   * ```typescript
   * toolCall.onErrorStart((error) => {
   *   console.error(`Tool call error: ${error.message}`);
   * });
   * ```
   */
  onErrorStart(cb: (error: { errorId: string } & ErrorStartEvent) => void): () => void;

  /**
   * Registers a handler for error end events
   * @param cb - Callback receiving the error end event
   * @returns Cleanup function to remove the handler
   */
  onErrorEnd(cb: (error: { errorId: string } & ErrorEndEvent) => void): () => void;

  /**
   * Registers a handler for tool call end events
   *
   * @param cb - Callback receiving the end event
   * @returns Cleanup function to remove the handler
   *
   * @example Handling tool call completion
   * ```typescript
   * toolCall.onToolCallEnd((endEvent) => {
   *   console.log('Output:', endEvent.output);
   * });
   * ```
   */
  onToolCallEnd(cb: (endToolCall: ToolCallEndEvent) => void): () => void;

  // ==================== Sending ====================

  /**
   * Ends the tool call
   *
   * @param endToolCall - Optional end event data
   *
   * @example Completing a tool call with output
   * ```typescript
   * toolCall.sendToolCallEnd({
   *   output: JSON.stringify({ temperature: 18, condition: 'cloudy' })
   * });
   * ```
   */
  sendToolCallEnd(endToolCall?: ToolCallEndEvent): void;

  // ==================== Advanced ====================

  /**
   * Sends an error start event for this tool call
   * @param args - Error details including optional error ID and message
   * @internal
   */
  sendErrorStart(args: { errorId?: string } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this tool call
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: string } & ErrorEndEvent): void;

  /**
   * Sends a metadata event for this tool call
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
   * Returns a string representation of this tool call
   * @internal
   */
  toString(): string;
}

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
  readonly toolCallId: string;

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
  onErrorStart(cb: (error: { errorId: string } & ErrorStartEvent) => void): () => void;

  /**
   * Registers a handler for error end events
   * @param cb - Callback receiving the error end event
   * @returns Cleanup function to remove the handler
   */
  onErrorEnd(cb: (error: { errorId: string } & ErrorEndEvent) => void): () => void;

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
  sendErrorStart(args: { errorId?: string } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this async tool call
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: string } & ErrorEndEvent): void;

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
