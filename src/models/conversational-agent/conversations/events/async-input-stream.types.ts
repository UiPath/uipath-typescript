/**
 * Consumer-facing interface for AsyncInputStreamEventHelper
 *
 * Defines the public API for interacting with async input streams
 * at the session level. Async input streams are used for streaming
 * audio or other media data to the agent.
 */

import type {
  AsyncInputStreamChunkEvent,
  AsyncInputStreamEndEvent,
  AsyncInputStreamEvent,
  AsyncInputStreamId,
  AsyncInputStreamStartEvent,
  ErrorEndEvent,
  ErrorId,
  ErrorStartEvent,
  MetaEvent
} from './protocol.types';

/**
 * Consumer-facing model for async input stream event helpers.
 *
 * Async input streams operate at the session level and are used for
 * streaming audio or other media data to the agent in real-time.
 * They persist across exchanges, making them ideal for continuous
 * audio input from a microphone.
 *
 * Unlike content parts (which carry agent output), async input streams
 * carry user input to the agent via the {@link SessionStream}.
 *
 * @example Streaming microphone audio
 * ```typescript
 * const stream = session.startAsyncInputStream({
 *   mimeType: 'audio/pcm;rate=24000'
 * });
 *
 * // Stream microphone PCM data
 * microphone.on('data', (pcmData: string) => {
 *   stream.sendChunk({ data: pcmData });
 * });
 *
 * // End when user stops speaking
 * microphone.on('end', () => {
 *   stream.sendAsyncInputStreamEnd();
 * });
 * ```
 *
 * @example Receiving audio input (agent-side)
 * ```typescript
 * session.onInputStreamStart((inputStream) => {
 *   console.log(`Receiving audio: ${inputStream.startEvent.mimeType}`);
 *
 *   inputStream.onChunk((chunk) => {
 *     // Process incoming audio data
 *     audioProcessor.process(chunk.data);
 *   });
 *
 *   inputStream.onAsyncInputStreamEnd(() => {
 *     console.log('Audio stream ended');
 *   });
 * });
 * ```
 *
 * @example Handling stream errors
 * ```typescript
 * const stream = session.startAsyncInputStream({
 *   mimeType: 'audio/pcm;rate=24000'
 * });
 *
 * stream.onErrorStart((error) => {
 *   console.error(`Stream error: ${error.message}`);
 *   // Clean up microphone resources
 *   microphone.stop();
 * });
 * ```
 */
export interface AsyncInputStreamStream {
  /** Unique identifier for this input stream */
  readonly streamId: AsyncInputStreamId;

  /**
   * The start event, or undefined if not yet received
   * @internal
   */
  readonly startEventMaybe: AsyncInputStreamStartEvent | undefined;

  /**
   * The start event (throws if not yet received)
   * @internal
   */
  readonly startEvent: AsyncInputStreamStartEvent;

  /** Whether this input stream has ended */
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
   * Sends a stream chunk
   * @param chunk - Chunk data to send (e.g., audio data)
   */
  sendChunk(chunk: AsyncInputStreamChunkEvent): void;

  /**
   * Registers a handler for stream chunks
   * @param cb - Callback receiving each chunk
   * @returns Cleanup function to remove the handler
   */
  onChunk(cb: (chunk: AsyncInputStreamChunkEvent) => void): () => void;

  /**
   * Ends the input stream
   * @param endAsyncInputStream - Optional end event data
   */
  sendAsyncInputStreamEnd(endAsyncInputStream?: AsyncInputStreamEndEvent): void;

  /**
   * Registers a handler for stream end events
   * @param cb - Callback receiving the end event
   * @returns Cleanup function to remove the handler
   */
  onAsyncInputStreamEnd(cb: (endAsyncInputStream: AsyncInputStreamEndEvent) => void): () => void;

  // ==================== Advanced ====================

  /**
   * Sends an error start event for this stream
   * @param args - Error details including optional error ID and message
   * @internal
   */
  sendErrorStart(args: { errorId?: ErrorId } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this stream
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: ErrorId } & ErrorEndEvent): void;

  /**
   * Sends a metadata event for this stream
   * @param metaEvent - Metadata to send
   * @internal
   */
  sendMetaEvent(metaEvent: MetaEvent): void;

  /**
   * Emits a raw async input stream event
   * @param streamEvent - The event to emit (streamId is added automatically)
   * @internal
   */
  emit(streamEvent: Omit<AsyncInputStreamEvent, 'streamId'>): void;

  /**
   * Returns a string representation of this input stream
   * @internal
   */
  toString(): string;
}
