/**
 * Consumer-facing interface for ToolCallEventHelper
 *
 * Defines the public API for interacting with tool call events
 * within a message. Tool calls represent external tool invocations
 * made by the assistant during a conversation.
 */

import type { MakeRequired, ToolCallId } from '../types';
import type { ErrorEndEvent, ErrorId, ErrorStartEvent, MetaEvent, ToolCallEndEvent, ToolCallEvent, ToolCallStartEvent } from './protocol.types';

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
 * message.onToolCallStart((toolCall) => {
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
  onErrorStart(cb: (error: { errorId: ErrorId } & ErrorStartEvent) => void): () => void;

  /**
   * Registers a handler for error end events
   * @param cb - Callback receiving the error end event
   * @returns Cleanup function to remove the handler
   */
  onErrorEnd(cb: (error: { errorId: ErrorId } & ErrorEndEvent) => void): () => void;

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
  sendErrorStart(args: { errorId?: ErrorId } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this tool call
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: ErrorId } & ErrorEndEvent): void;

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
