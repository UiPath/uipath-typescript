/**
 * Completed event types for convenience handlers
 *
 * These types represent the aggregated data available when a stream
 * entity (content part, tool call, or message) has fully completed.
 */

import type {
  CitationId,
  CitationOptions,
  ContentPartId,
  MessageId,
  Simplify,
  ToolCallId
} from '../types';
import type {
  ContentPartEndEvent,
  ContentPartStartEvent,
  MessageEndEvent,
  MessageStartEvent,
  ToolCallEndEvent,
  ToolCallStartEvent
} from './protocol.types';

/**
 * Error encountered during citation processing
 */
export type CitationError = {
  citationId: CitationId;
  errorType: CitationErrorType;
};

/**
 * Types of citation processing errors
 */
export enum CitationErrorType {
  CitationNotEnded = 'CitationNotEnded',
  CitationNotStarted = 'CitationNotStarted'
}

/**
 * Aggregated data for a completed content part
 *
 * Contains the full buffered text, citations, and metadata
 * available after a content part stream has ended.
 */
export type CompletedContentPart = ContentPartStartEvent & ContentPartEndEvent & {
  contentPartId: ContentPartId;
  data: string;
  citations: CitationOptions[];
  citationErrors: CitationError[];
};

/**
 * Aggregated data for a completed tool call
 *
 * Contains the merged start and end event data
 * available after a tool call has ended.
 */
export type CompletedToolCall = ToolCallStartEvent & ToolCallEndEvent & {
  toolCallId: ToolCallId;
};

/**
 * Aggregated data for a completed message
 *
 * Contains all content parts, tool calls, and metadata
 * available after a message stream has ended.
 */
export type CompletedMessage = Simplify<
  {
    messageId: MessageId;
    contentParts: Array<CompletedContentPart>;
    toolCalls: Array<CompletedToolCall>;
  }
  & Partial<MessageStartEvent>
  & MessageEndEvent
>;
