/**
 * Consumer-facing interface for ExchangeEventHelper
 *
 * Defines the public API for interacting with exchange events
 * within a session. Exchanges represent request-response pairs
 * containing user and assistant messages.
 */

import type { MakeRequired, MessageRole } from '..';
import type { ErrorEndEvent, ErrorStartEvent, ExchangeEndEvent, ExchangeEvent, ExchangeStartEvent, MessageStartEvent, MetaEvent } from './protocol.types';
import type { CompletedMessage, MessageStream } from './message.types';

/**
 * Consumer-facing model for exchange event helpers.
 *
 * An exchange represents a single request-response cycle within a session.
 * Each exchange contains one or more messages (typically a user message
 * followed by an assistant response). Use exchanges to group related
 * turns in a multi-turn conversation.
 *
 * @example Streaming assistant response
 * ```typescript
 * session.onExchangeStart((exchange) => {
 *   exchange.onMessageStart((message) => {
 *     if (message.isAssistant) {
 *       message.onContentPartStart((part) => {
 *         if (part.isMarkdown) {
 *           part.onChunk((chunk) => {
 *             process.stdout.write(chunk.data ?? '');
 *           });
 *         }
 *       });
 *     }
 *   });
 * });
 * ```
 *
 * @example Getting the completed message at once (no streaming)
 * ```typescript
 * session.onExchangeStart((exchange) => {
 *   exchange.onMessageCompleted((completed) => {
 *     for (const part of completed.contentParts) {
 *       console.log(part.data);
 *     }
 *     for (const tool of completed.toolCalls) {
 *       console.log(`${tool.toolName}: ${tool.output}`);
 *     }
 *   });
 * });
 * ```
 *
 * @example Sending a user message with convenience method
 * ```typescript
 * const exchange = session.startExchange();
 * await exchange.sendMessageWithContentPart({
 *   data: 'Hello, how can you help me?',
 *   role: MessageRole.User
 * });
 * ```
 *
 * @example Sending a user message with streaming parts
 * ```typescript
 * const exchange = session.startExchange();
 * const message = exchange.startMessage({ role: MessageRole.User });
 * const part = message.startContentPart({ mimeType: 'text/plain' });
 * part.sendChunk({ data: 'Hello, ' });
 * part.sendChunk({ data: 'how can you help me?' });
 * part.sendContentPartEnd();
 * message.sendMessageEnd();
 * ```
 */
export interface ExchangeStream {
  /** Unique identifier for this exchange */
  readonly exchangeId: string;

  /**
   * The start event, or undefined if not yet received
   * @internal
   */
  readonly startEventMaybe: ExchangeStartEvent | undefined;

  /**
   * The start event (throws if not yet received)
   * @internal
   */
  readonly startEvent: MakeRequired<ExchangeStartEvent, 'timestamp'>;

  /** Whether this exchange has ended */
  readonly ended: boolean;

  /**
   * Registers a handler for error start events
   *
   * @param cb - Callback receiving the error event
   * @returns Cleanup function to remove the handler
   *
   * @example Exchange-level error handling
   * ```typescript
   * exchange.onErrorStart((error) => {
   *   console.error(`Exchange error [${error.errorId}]: ${error.message}`);
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
   * Registers a handler for message start events
   *
   * Each exchange typically contains a user message and an assistant
   * response. Use `message.isAssistant` or `message.isUser` to filter.
   *
   * @param cb - Callback receiving each new message
   * @returns Cleanup function to remove the handler
   *
   * @example Filtering by message role
   * ```typescript
   * exchange.onMessageStart((message) => {
   *   if (message.isAssistant) {
   *     message.onContentPartStart((part) => {
   *       if (part.isMarkdown) {
   *         part.onChunk((chunk) => process.stdout.write(chunk.data ?? ''));
   *       }
   *     });
   *   }
   * });
   * ```
   */
  onMessageStart(cb: (message: MessageStream) => void): () => void;

  /**
   * Registers a handler for exchange end events
   *
   * @param cb - Callback receiving the end event
   * @returns Cleanup function to remove the handler
   *
   * @example Tracking exchange lifecycle
   * ```typescript
   * exchange.onExchangeEnd((endEvent) => {
   *   console.log('Exchange completed');
   * });
   * ```
   */
  onExchangeEnd(cb: (endExchange: ExchangeEndEvent) => void): () => void;

  /**
   * Registers a handler called when a message finishes
   *
   * Convenience method that combines onMessageStart + message.onCompleted.
   * The handler receives the aggregated message data including all
   * content parts and tool calls.
   *
   * @param cb - Callback receiving the completed message data
   *
   * @example Getting buffered message with all content and tool calls
   * ```typescript
   * exchange.onMessageCompleted((message) => {
   *   console.log(`Message ${message.messageId} (role: ${message.role})`);
   *   console.log(`Content parts: ${message.contentParts.length}`);
   *   console.log(`Tool calls: ${message.toolCalls.length}`);
   * });
   * ```
   */
  onMessageCompleted(cb: (completedMessage: CompletedMessage) => void): void;

  // ==================== Message Management ====================

  /**
   * Starts a new message in this exchange
   *
   * Use this for fine-grained control over message construction.
   * For simple text messages, prefer {@link sendMessageWithContentPart}.
   *
   * @param args - Optional message start options including role
   * @returns The message stream for sending content
   *
   * @example Building a message with multiple content parts
   * ```typescript
   * const message = exchange.startMessage({ role: MessageRole.User });
   * const part = message.startContentPart({ mimeType: 'text/plain' });
   * part.sendChunk({ data: 'Analyze this image: ' });
   * part.sendContentPartEnd();
   * message.sendMessageEnd();
   * ```
   */
  startMessage(args?: { messageId?: string } & Partial<MessageStartEvent>): MessageStream;

  /**
   * Sends a complete message with a content part in one step
   *
   * Convenience method that creates a message, adds a content part with the given data,
   * and ends both the content part and message.
   *
   * @param options - Message content options
   *
   * @example Sending a user message
   * ```typescript
   * await exchange.sendMessageWithContentPart({
   *   data: 'What is the weather today?',
   *   role: MessageRole.User
   * });
   * ```
   */
  sendMessageWithContentPart(options: { data: string; role?: MessageRole; mimeType?: string }): Promise<void>;

  /**
   * Iterator over all active messages in this exchange
   */
  readonly messages: Iterable<MessageStream>;

  /**
   * Retrieves a message by ID
   * @param messageId - The message ID to look up
   * @returns The message stream, or undefined if not found
   */
  getMessage(messageId: string): MessageStream | undefined;

  /**
   * Ends the exchange
   *
   * @param endExchange - Optional end event data
   *
   * @example Manually ending an exchange
   * ```typescript
   * exchange.sendExchangeEnd();
   * ```
   */
  sendExchangeEnd(endExchange?: ExchangeEndEvent): void;

  // ==================== Advanced ====================

  /**
   * Sends an error start event for this exchange
   * @param args - Error details including optional error ID and message
   * @internal
   */
  sendErrorStart(args: { errorId?: string } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this exchange
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: string } & ErrorEndEvent): void;

  /**
   * Sends a metadata event for this exchange
   * @param metaEvent - Metadata to send
   * @internal
   */
  sendMetaEvent(metaEvent: MetaEvent): void;

  /**
   * Emits a raw exchange event
   * @param exchangeEvent - The event to emit (exchangeId is added automatically)
   * @internal
   */
  emit(exchangeEvent: Omit<ExchangeEvent, 'exchangeId'>): void;

  /**
   * Returns a string representation of this exchange
   * @internal
   */
  toString(): string;
}
