/**
 * Consumer-facing interface for MessageEventHelper
 *
 * Defines the public API for interacting with message events
 * within an exchange. Messages represent individual turns from
 * users, assistants, or the system.
 */

import type { MakeRequired, MessageRole, Simplify } from '..';
import type {
  ContentPartStartEvent,
  ErrorEndEvent,
  ErrorStartEvent,
  InterruptEndEvent,
  InterruptStartEvent,
  MessageEndEvent,
  MessageEvent,
  MessageStartEvent,
  MetaEvent,
  ToolCallStartEvent
} from './protocol.types';
import type { CompletedContentPart, ContentPartStream } from './content-part.types';
import type { CompletedToolCall, ToolCallStream } from './tool-call.types';

/**
 * Aggregated data for a completed message
 *
 * Contains all content parts, tool calls, and metadata
 * available after a message stream has ended.
 */
export type CompletedMessage = Simplify<
  {
    messageId: string;
    contentParts: Array<CompletedContentPart>;
    toolCalls: Array<CompletedToolCall>;
  }
  & Partial<MessageStartEvent>
  & MessageEndEvent
>;

/**
 * Consumer-facing model for message event helpers.
 *
 * A message represents a single turn from a user, assistant, or system.
 * Messages contain content parts (text, audio, images) and tool calls.
 * The `role` property and convenience booleans (`isUser`, `isAssistant`,
 * `isSystem`) let you filter by sender.
 *
 * @example Streaming text with real-time output
 * ```typescript
 * exchange.onMessageStart((message) => {
 *   if (message.isAssistant) {
 *     message.onContentPartStart((part) => {
 *       if (part.isMarkdown) {
 *         part.onChunk((chunk) => {
 *           process.stdout.write(chunk.data ?? '');
 *         });
 *       }
 *     });
 *   }
 * });
 * ```
 *
 * @example Handling tool calls with confirmation interrupts
 * ```typescript
 * exchange.onMessageStart((message) => {
 *   if (message.isAssistant) {
 *     message.onToolCallStart((toolCall) => {
 *       console.log(`Tool: ${toolCall.startEvent.toolName}`);
 *     });
 *
 *     message.onInterruptStart(({ interruptId, startEvent }) => {
 *       if (startEvent.type === 'uipath_cas_tool_call_confirmation') {
 *         message.sendInterruptEnd(interruptId, { approved: true });
 *       }
 *     });
 *   }
 * });
 * ```
 *
 * @example Getting the complete message at once (buffered)
 * ```typescript
 * exchange.onMessageStart((message) => {
 *   if (message.isAssistant) {
 *     message.onCompleted((completed) => {
 *       console.log(`Message ${completed.messageId} finished`);
 *       for (const part of completed.contentParts) {
 *         console.log(part.data);
 *       }
 *       for (const tool of completed.toolCalls) {
 *         console.log(`${tool.toolName} → ${tool.output}`);
 *       }
 *     });
 *   }
 * });
 * ```
 *
 * @example Sending a content part with convenience method
 * ```typescript
 * const message = exchange.startMessage({ role: MessageRole.User });
 * await message.sendContentPart({ data: 'Hello!', mimeType: 'text/plain' });
 * message.sendMessageEnd();
 * ```
 */
export interface MessageStream {
  /** Unique identifier for this message */
  readonly messageId: string;

  /** The role of this message sender, or undefined if start event not yet received */
  readonly role: MessageRole | undefined;

  /** Whether this message is from the user */
  readonly isUser: boolean;

  /** Whether this message is from the assistant */
  readonly isAssistant: boolean;

  /** Whether this message is a system message */
  readonly isSystem: boolean;

  /**
   * The start event, or undefined if not yet received
   * @internal
   */
  readonly startEventMaybe: MessageStartEvent | undefined;

  /**
   * The start event (throws if not yet received)
   * @internal
   */
  readonly startEvent: MakeRequired<MessageStartEvent, 'timestamp'>;

  /** Whether this message has ended */
  readonly ended: boolean;

  /**
   * Registers a handler for error start events
   *
   * @param cb - Callback receiving the error event
   * @returns Cleanup function to remove the handler
   *
   * @example Message-level error handling
   * ```typescript
   * message.onErrorStart((error) => {
   *   console.error(`Message error [${error.errorId}]: ${error.message}`);
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
   * Registers a handler for content part start events
   *
   * Content parts are streamed pieces of content (text, audio, images,
   * transcripts). Use `part.isMarkdown`, `part.isAudio`, etc. to determine type.
   *
   * @param cb - Callback receiving each new content part
   * @returns Cleanup function to remove the handler
   *
   * @example Streaming text and handling different content types
   * ```typescript
   * message.onContentPartStart((part) => {
   *   if (part.isMarkdown) {
   *     part.onChunk((chunk) => renderMarkdown(chunk.data ?? ''));
   *   } else if (part.isAudio) {
   *     part.onChunk((chunk) => audioPlayer.enqueue(chunk.data ?? ''));
   *   } else if (part.isImage) {
   *     part.onChunk((chunk) => imageBuffer.append(chunk.data ?? ''));
   *   } else if (part.isTranscript) {
   *     part.onChunk((chunk) => showTranscript(chunk.data ?? ''));
   *   }
   * });
   * ```
   */
  onContentPartStart(cb: (contentPart: ContentPartStream) => void): () => void;

  /**
   * Registers a handler for tool call start events
   *
   * Tool calls represent the agent invoking external tools. Each tool call
   * has a name, input, and eventually an output when it completes.
   *
   * @param cb - Callback receiving each new tool call
   * @returns Cleanup function to remove the handler
   *
   * @example Streaming tool call events
   * ```typescript
   * message.onToolCallStart((toolCall) => {
   *   const { toolName, input } = toolCall.startEvent;
   *   console.log(`Calling ${toolName}:`, JSON.parse(input ?? '{}'));
   *
   *   toolCall.onToolCallEnd((end) => {
   *     console.log(`Result:`, JSON.parse(end.output ?? '{}'));
   *   });
   * });
   * ```
   */
  onToolCallStart(cb: (toolCall: ToolCallStream) => void): () => void;

  /**
   * Registers a handler for message end events
   *
   * @param cb - Callback receiving the end event
   * @returns Cleanup function to remove the handler
   *
   * @example Tracking message lifecycle
   * ```typescript
   * message.onMessageEnd((endEvent) => {
   *   console.log('Message ended');
   * });
   * ```
   */
  onMessageEnd(cb: (endMessage: MessageEndEvent) => void): () => void;

  // ==================== Completed Handlers ====================

  /**
   * Registers a handler called when a content part finishes
   *
   * Convenience method that combines onContentPartStart + onContentPartEnd.
   * The handler receives the full buffered content part data including
   * text, citations, and any citation errors.
   *
   * @param cb - Callback receiving the completed content part data
   *
   * @example Getting completed content parts with citations
   * ```typescript
   * message.onContentPartCompleted((completed) => {
   *   console.log(`[${completed.mimeType}] ${completed.data}`);
   *
   *   // Access citations if present
   *   for (const citation of completed.citations) {
   *     const citedText = completed.data.substring(citation.offset, citation.offset + citation.length);
   *     console.log(`Citation "${citedText}" from:`, citation.sources);
   *   }
   *
   *   // Check for citation errors
   *   for (const error of completed.citationErrors) {
   *     console.warn(`Citation error [${error.citationId}]: ${error.errorType}`);
   *   }
   * });
   * ```
   */
  onContentPartCompleted(cb: (completedContentPart: CompletedContentPart) => void): void;

  /**
   * Registers a handler called when a tool call finishes
   *
   * Convenience method that combines onToolCallStart + onToolCallEnd.
   * The handler receives the merged start and end event data.
   *
   * @param cb - Callback receiving the completed tool call data
   *
   * @example Getting completed tool calls
   * ```typescript
   * message.onToolCallCompleted((toolCall) => {
   *   console.log(`Tool: ${toolCall.toolName}`);
   *   console.log(`Input: ${toolCall.input}`);
   *   console.log(`Output: ${toolCall.output}`);
   * });
   * ```
   */
  onToolCallCompleted(cb: (completedToolCall: CompletedToolCall) => void): void;

  /**
   * Registers a handler called when the entire message finishes
   *
   * The handler receives the aggregated message data including
   * all completed content parts and tool calls.
   *
   * @param cb - Callback receiving the completed message data
   *
   * @example Getting the full buffered message
   * ```typescript
   * message.onCompleted((completed) => {
   *   console.log(`Message ${completed.messageId} (role: ${completed.role})`);
   *   console.log('Text:', completed.contentParts.map(p => p.data).join(''));
   *   console.log('Tool calls:', completed.toolCalls.length);
   * });
   * ```
   */
  onCompleted(cb: (completedMessage: CompletedMessage) => void): void;

  // ==================== Interrupt Handlers ====================

  /**
   * Registers a handler for interrupt start events
   *
   * Interrupts represent pause points where the agent needs external input,
   * such as tool call confirmation requests.
   *
   * @param cb - Callback receiving the interrupt ID and start event
   * @returns Cleanup function to remove the handler
   *
   * @example Handling tool call confirmation
   * ```typescript
   * message.onInterruptStart(({ interruptId, startEvent }) => {
   *   if (startEvent.type === 'uipath_cas_tool_call_confirmation') {
   *     // Show confirmation UI, then respond
   *     message.sendInterruptEnd(interruptId, { approved: true });
   *   }
   * });
   * ```
   */
  onInterruptStart(cb: (interrupt: { interruptId: string; startEvent: InterruptStartEvent }) => void): () => void;

  /**
   * Registers a handler for interrupt end events
   *
   * @param cb - Callback receiving the interrupt ID and end event
   * @returns Cleanup function to remove the handler
   *
   * @example Tracking interrupt resolution
   * ```typescript
   * message.onInterruptEnd(({ interruptId, endEvent }) => {
   *   console.log(`Interrupt ${interruptId} resolved`);
   * });
   * ```
   */
  onInterruptEnd(cb: (interrupt: { interruptId: string; endEvent: InterruptEndEvent }) => void): () => void;

  /**
   * Sends an interrupt end event to resolve a pending interrupt
   *
   * Call this to respond to an interrupt received via onInterruptStart.
   *
   * @param interruptId - The interrupt ID to respond to
   * @param endInterrupt - The response data (e.g., approval for tool call confirmation)
   *
   * @example Approving a tool call confirmation
   * ```typescript
   * message.sendInterruptEnd(interruptId, { approved: true });
   * ```
   */
  sendInterruptEnd(interruptId: string, endInterrupt: InterruptEndEvent): void;

  // ==================== Content Part Management ====================

  /**
   * Starts a new content part stream in this message
   *
   * Use this for streaming content in chunks. For sending
   * complete content in one call, prefer {@link sendContentPart}.
   *
   * @param args - Content part start options including mime type
   * @returns The content part stream for sending chunks
   *
   * @example Streaming text content in chunks
   * ```typescript
   * const part = message.startContentPart({ mimeType: 'text/markdown' });
   * part.sendChunk({ data: '# Hello\n' });
   * part.sendChunk({ data: 'This is **markdown** content.' });
   * part.sendContentPartEnd();
   * ```
   */
  startContentPart(args: { contentPartId?: string } & ContentPartStartEvent): ContentPartStream;

  /**
   * Sends a complete content part with data in one step
   *
   * Convenience method that creates a content part, sends the data as a chunk,
   * and ends the content part. Defaults to mimeType "text/markdown".
   *
   * @param args - Content part data and optional mime type
   *
   * @example Sending a text content part
   * ```typescript
   * await message.sendContentPart({ data: 'Hello world!' });
   * ```
   *
   * @example Sending with explicit mime type
   * ```typescript
   * await message.sendContentPart({
   *   data: 'Plain text content',
   *   mimeType: 'text/plain'
   * });
   * ```
   */
  sendContentPart(args: { data?: string; mimeType?: string }): Promise<void>;

  /**
   * Iterator over all active content parts in this message
   */
  readonly contentParts: Iterable<ContentPartStream>;

  /**
   * Retrieves a content part by ID
   * @param contentPartId - The content part ID to look up
   * @returns The content part stream, or undefined if not found
   */
  getContentPart(contentPartId: string): ContentPartStream | undefined;

  // ==================== Tool Call Management ====================

  /**
   * Starts a new tool call in this message
   *
   * @param args - Tool call start options including tool name
   * @returns The tool call stream for managing the tool call lifecycle
   *
   * @example Creating and completing a tool call
   * ```typescript
   * const toolCall = message.startToolCall({
   *   toolName: 'get-weather',
   *   input: JSON.stringify({ city: 'London' })
   * });
   * toolCall.sendToolCallEnd({
   *   output: JSON.stringify({ temperature: 18, condition: 'cloudy' })
   * });
   * ```
   */
  startToolCall(args: { toolCallId?: string } & ToolCallStartEvent): ToolCallStream;

  /**
   * Iterator over all active tool calls in this message
   */
  readonly toolCalls: Iterable<ToolCallStream>;

  /**
   * Retrieves a tool call by ID
   * @param toolCallId - The tool call ID to look up
   * @returns The tool call stream, or undefined if not found
   */
  getToolCall(toolCallId: string): ToolCallStream | undefined;

  /**
   * Ends the message
   *
   * @param endMessage - Optional end event data
   *
   * @example Ending a message
   * ```typescript
   * message.sendMessageEnd();
   * ```
   */
  sendMessageEnd(endMessage?: MessageEndEvent): void;

  // ==================== Advanced ====================

  /**
   * Sends an error start event for this message
   * @param args - Error details including optional error ID and message
   * @internal
   */
  sendErrorStart(args: { errorId?: string } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this message
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: string } & ErrorEndEvent): void;

  /**
   * Sends a metadata event for this message
   * @param metaEvent - Metadata to send
   * @internal
   */
  sendMetaEvent(metaEvent: MetaEvent): void;

  /**
   * Emits a raw message event
   * @param messageEvent - The event to emit (messageId is added automatically)
   * @internal
   */
  emit(messageEvent: Omit<MessageEvent, 'messageId'>): void;

  /**
   * Sends an interrupt start event
   * @param interruptId - The interrupt ID
   * @param startInterrupt - The interrupt start event data
   * @internal
   */
  sendInterrupt(interruptId: string, startInterrupt: InterruptStartEvent): void;

  /**
   * Returns a string representation of this message
   * @internal
   */
  toString(): string;
}
