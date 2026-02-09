/**
 * Consumer-facing interface for ContentPartEventHelper
 *
 * Defines the public API for interacting with streaming content parts
 * within a message. Content parts represent text, audio, images, etc.
 */

import type { CitationId, CitationSource, ContentPartId, MakeRequired } from '../types';
import type {
  ContentPartChunkEvent,
  ContentPartEndEvent,
  ContentPartEvent,
  ContentPartStartEvent,
  ErrorEndEvent,
  ErrorId,
  ErrorStartEvent,
  MetaEvent
} from './protocol.types';
import type { CompletedContentPart } from './completed.types';

/**
 * Consumer-facing model for content part event helpers.
 *
 * A content part is a single piece of content within a message — text,
 * audio, an image, or a transcript. Use the type-check properties
 * (`isText`, `isAudio`, `isImage`, `isMarkdown`, `isTranscript`) to
 * determine the content type and handle it accordingly.
 *
 * @example Streaming text content
 * ```typescript
 * message.onContentPartStart((part) => {
 *   if (part.isText) {
 *     part.onChunk((chunk) => {
 *       process.stdout.write(chunk.data ?? '');
 *     });
 *   }
 * });
 * ```
 *
 * @example Handling different content types
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
 *
 * @example Getting complete content with citations (buffered)
 * ```typescript
 * message.onContentPartStart((part) => {
 *   part.onComplete((completed) => {
 *     console.log(`Full text: ${completed.data}`);
 *
 *     // Access citations — each has offset, length, and sources
 *     for (const citation of completed.citations) {
 *       const citedText = completed.data.substring(
 *         citation.offset,
 *         citation.offset + citation.length
 *       );
 *       console.log(`"${citedText}" cited from:`, citation.sources);
 *     }
 *   });
 * });
 * ```
 *
 * @example Using the content part completed handler at the message level
 * ```typescript
 * message.onContentPartCompleted((completed) => {
 *   console.log(`[${completed.mimeType}] ${completed.data}`);
 * });
 * ```
 */
export interface ContentPartStream {
  /** Unique identifier for this content part */
  readonly contentPartId: ContentPartId;

  /** The MIME type of this content part, or undefined if start event not yet received */
  readonly mimeType: string | undefined;

  /** Whether this content part is text (text/plain, text/markdown, etc.) */
  readonly isText: boolean;

  /** Whether this content part is audio content */
  readonly isAudio: boolean;

  /** Whether this content part is an image */
  readonly isImage: boolean;

  /** Whether this content part is markdown text */
  readonly isMarkdown: boolean;

  /** Whether this content part is a transcript (from speech-to-text) */
  readonly isTranscript: boolean;

  /**
   * The start event, or undefined if not yet received
   * @internal
   */
  readonly startEventMaybe: ContentPartStartEvent | undefined;

  /**
   * The start event (throws if not yet received)
   * @internal
   */
  readonly startEvent: MakeRequired<ContentPartStartEvent, 'timestamp'>;

  /** Whether this content part has ended */
  readonly ended: boolean;

  /**
   * Registers a handler for error start events
   *
   * @param cb - Callback receiving the error event
   * @returns Cleanup function to remove the handler
   *
   * @example Content part error handling
   * ```typescript
   * part.onErrorStart((error) => {
   *   console.error(`Content part error: ${error.message}`);
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
   * Registers a handler for content part chunks
   *
   * Chunks are the fundamental unit of streaming data. Each chunk
   * contains a piece of the content (text, audio data, etc.).
   *
   * @param cb - Callback receiving each chunk
   * @returns Cleanup function to remove the handler
   *
   * @example Streaming text output
   * ```typescript
   * part.onChunk((chunk) => {
   *   process.stdout.write(chunk.data ?? '');
   * });
   * ```
   */
  onChunk(cb: (chunk: ContentPartChunkEvent) => void): () => void;

  /**
   * Registers a handler for content part end events
   *
   * @param cb - Callback receiving the end event
   * @returns Cleanup function to remove the handler
   *
   * @example Tracking content part lifecycle
   * ```typescript
   * part.onContentPartEnd((endEvent) => {
   *   console.log('Content part finished');
   * });
   * ```
   */
  onContentPartEnd(cb: (endContentPart: ContentPartEndEvent) => void): () => void;

  /**
   * Registers a handler called when this content part finishes
   *
   * The handler receives the aggregated content part data including
   * all buffered text, citations, and any citation errors.
   *
   * @param cb - Callback receiving the completed content part data
   *
   * @example Getting buffered content with citation data
   * ```typescript
   * part.onComplete((completed) => {
   *   console.log(`Content type: ${completed.mimeType}`);
   *   console.log(`Full text: ${completed.data}`);
   *
   *   // Citations provide offset/length into the text and source references
   *   for (const citation of completed.citations) {
   *     const citedText = completed.data.substring(
   *       citation.offset,
   *       citation.offset + citation.length
   *     );
   *     console.log(`"${citedText}" — sources:`, citation.sources);
   *   }
   *
   *   // Citation errors indicate malformed citation ranges
   *   if (completed.citationErrors.length > 0) {
   *     console.warn('Citation errors:', completed.citationErrors);
   *   }
   * });
   * ```
   */
  onComplete(cb: (completedContentPart: CompletedContentPart) => void): void;

  // ==================== Sending ====================

  /**
   * Sends a content part chunk
   *
   * @param chunk - Chunk data to send
   *
   * @example Sending text chunks
   * ```typescript
   * part.sendChunk({ data: 'Hello ' });
   * part.sendChunk({ data: 'world!' });
   * ```
   */
  sendChunk(chunk: ContentPartChunkEvent): void;

  /**
   * Ends the content part stream
   *
   * @param endContentPart - Optional end event data
   *
   * @example Ending a content part
   * ```typescript
   * part.sendContentPartEnd();
   * ```
   */
  sendContentPartEnd(endContentPart?: ContentPartEndEvent): void;

  // ==================== Advanced ====================

  /**
   * Sends an error start event for this content part
   * @param args - Error details including optional error ID and message
   * @internal
   */
  sendErrorStart(args: { errorId?: ErrorId } & ErrorStartEvent): void;

  /**
   * Sends an error end event for this content part
   * @param args - Error end details including the error ID
   * @internal
   */
  sendErrorEnd(args: { errorId: ErrorId } & ErrorEndEvent): void;

  /**
   * Sends a metadata event for this content part
   * @param metaEvent - Metadata to send
   * @internal
   */
  sendMetaEvent(metaEvent: MetaEvent): void;

  /**
   * Sends a chunk that starts a citation range
   *
   * Marks the beginning of a cited passage. All subsequent chunks
   * until `sendChunkWithCitationEnd` are considered part of this citation.
   *
   * @param chunk - Chunk data with citation ID
   * @internal
   */
  sendChunkWithCitationStart(chunk: Omit<ContentPartChunkEvent, 'citation'> & { citationId: CitationId }): void;

  /**
   * Sends a chunk that ends a citation range
   *
   * Marks the end of a cited passage and provides the citation sources.
   *
   * @param chunk - Chunk data with citation ID and sources
   * @internal
   */
  sendChunkWithCitationEnd(chunk: Omit<ContentPartChunkEvent, 'citation'> & { citationId: CitationId; sources: CitationSource[] }): void;

  /**
   * Sends a chunk that is a complete citation (start and end in one)
   *
   * Use this for inline citations where the entire cited text is in a single chunk.
   *
   * @param chunk - Chunk data with citation ID and sources
   * @internal
   */
  sendChunkWithCitation(chunk: Omit<ContentPartChunkEvent, 'citation'> & { citationId: CitationId; sources: CitationSource[] }): void;

  /**
   * Emits a raw content part event
   * @param contentPartEvent - The event to emit (contentPartId is added automatically)
   * @internal
   */
  emit(contentPartEvent: Omit<ContentPartEvent, 'contentPartId'>): void;

  /**
   * Returns a string representation of this content part
   * @internal
   */
  toString(): string;
}
