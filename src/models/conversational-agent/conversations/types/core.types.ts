/**
 * Core data model types for Conversational Agent REST endpoints
 * Contains: Conversation, Exchange, Message, ContentPart, ToolCall, etc.
 */

import {
  CitationId,
  CitationSource,
  ContentPartId,
  ConversationId,
  ExchangeId,
  InlineOrExternalValue,
  InterruptId,
  InterruptType,
  MessageId,
  MessageRole,
  MimeType,
  Simplify,
  ToolCallId,
  ToolCallInputValue,
  ToolCallOutputValue,
  ToolName,
  UTCTimeStamp
} from './common.types';

/**
 * Represents the order in which items should be sorted.
 */
export enum SortOrder {
  Ascending = 'ascending',
  Descending = 'descending'
}

/**
 * Trace ID - can be UUID (legacy) or OpenTelemetry-format (32-char hex).
 */
export type TraceId = string;

/**
 * Span ID - can be UUID (legacy) or OpenTelemetry-format (16-char hex).
 */
export type SpanId = string;

/**
 * Represents a citation or reference to an external source within a content part.
 */
export interface Citation {
  /**
   * Unique identifier for the citation.
   */
  id: CitationId;
  /**
   * Unique identifier for the citation within its content part.
   */
  citationId: CitationId;
  /**
   * The offset of the start of the citation target in the content part data.
   */
  offset: number;
  /**
   * The length of the citation target in the content part data.
   */
  length: number;
  /**
   * The source being referenced by this citation.
   */
  sources: CitationSource[];
  /**
   * Timestamp indicating when the citation was created.
   */
  createdTime: UTCTimeStamp;
  /**
   * Timestamp indicating when the citation was last updated.
   */
  updatedTime: UTCTimeStamp;
}

/**
 * Citation options for input operations (without timestamps).
 */
export interface CitationOptions {
  citationId: CitationId;
  offset: number;
  length: number;
  sources: CitationSource[];
}

/**
 * Content part data type - can be inline or external.
 */
export type ContentPartData = Simplify<InlineOrExternalValue<string>>;

/**
 * Represents a single part of message content.
 */
export interface ContentPart {
  /**
   * Unique identifier for the content part.
   */
  id: ContentPartId;
  /**
   * Unique identifier for the content part within the message.
   */
  contentPartId: ContentPartId;
  /**
   * The MIME type of the content.
   */
  mimeType: MimeType;
  /**
   * The actual content data.
   */
  data: ContentPartData;
  /**
   * Array of citations referenced in this content part.
   */
  citations: Citation[];
  /**
   * Indicates whether this content part is a transcript produced by the LLM.
   */
  isTranscript?: boolean;
  /**
   * Indicates whether this content part may be incomplete.
   */
  isIncomplete?: boolean;
  /**
   * Optional name for the content part.
   */
  name?: string;
  /**
   * Timestamp indicating when the content part was created.
   */
  createdTime: UTCTimeStamp;
  /**
   * Timestamp indicating when the content part was last updated.
   */
  updatedTime: UTCTimeStamp;
}

/**
 * Represents the result of a tool call execution.
 */
export interface ToolCallResult {
  /**
   * Timestamp indicating when the result was generated.
   */
  timestamp?: UTCTimeStamp;
  /**
   * The value returned by the tool.
   */
  output?: ToolCallOutputValue;
  /**
   * field for the tool call output value.
   */
  value?: InlineOrExternalValue<ToolCallOutputValue>;
  /**
   * Indicates whether the tool call resulted in an error.
   */
  isError?: boolean;
  /**
   * Indicates whether the tool call was cancelled.
   */
  cancelled?: boolean;
}

/**
 * Represents a call to an external tool or function within a message.
 */
export interface ToolCall {
  /**
   * Unique identifier for the tool call.
   */
  id: ToolCallId;
  /**
   * Unique identifier for the tool call within the message.
   */
  toolCallId: ToolCallId;
  /**
   * The name of the tool being called.
   */
  name: ToolName;
  /**
   * Optional input value provided to the tool.
   */
  input?: ToolCallInputValue;
  /**
   * Legacy field for tool call input arguments.
   */
  arguments?: InlineOrExternalValue<ToolCallInputValue>;
  /**
   * Timestamp indicating when the tool call was initiated.
   */
  timestamp?: UTCTimeStamp;
  /**
   * Optional output value returned by the tool's execution.
   */
  result?: ToolCallResult;
  /**
   * Timestamp indicating when the tool call was created.
   */
  createdTime: UTCTimeStamp;
  /**
   * Timestamp indicating when the tool call was last updated.
   */
  updatedTime: UTCTimeStamp;
}

/**
 * Represents an interrupt within a message.
 */
export interface Interrupt {
  /**
   * Unique identifier for the interrupt.
   */
  id: InterruptId;
  /**
   * Unique identifier for the interrupt within the message.
   */
  interruptId: InterruptId;
  /**
   * The type of interrupt.
   */
  type: InterruptType;
  /**
   * The value associated with the interrupt start event.
   */
  interruptValue: unknown;
  /**
   * The value provided to end/resolve the interrupt.
   */
  endValue?: unknown;
  /**
   * Timestamp indicating when the interrupt was created.
   */
  createdTime: UTCTimeStamp;
  /**
   * Timestamp indicating when the interrupt was last updated.
   */
  updatedTime: UTCTimeStamp;
}

/**
 * Represents a single message within a conversation exchange.
 */
export interface Message {
  /**
   * Unique identifier for the message.
   */
  id: MessageId;
  /**
   * Unique identifier for the message within its exchange.
   */
  messageId: MessageId;
  /**
   * The role of the message sender.
   */
  role: MessageRole;
  /**
   * Contains the message's content parts.
   */
  contentParts: ContentPart[];
  /**
   * Array of tool calls made within this message.
   */
  toolCalls: ToolCall[];
  /**
   * Array of interrupts within this message.
   */
  interrupts: Interrupt[];
  /**
   * Timestamp indicating when the message was created.
   */
  createdTime: UTCTimeStamp;
  /**
   * Timestamp indicating when the message was last updated.
   */
  updatedTime: UTCTimeStamp;
  /**
   * Span identifier for distributed tracing.
   */
  spanId?: SpanId;
}

/**
 * Feedback rating type.
 */
export enum FeedbackRating {
  Positive = 'positive',
  Negative = 'negative'
}

/**
 * Represents a group of related messages (exchange).
 */
export interface Exchange {
  /**
   * Unique identifier for the exchange.
   */
  id: ExchangeId;
  /**
   * Identifies the exchange.
   */
  exchangeId: ExchangeId;
  /**
   * Messages in the exchange.
   */
  messages: Message[];
  /**
   * Timestamp indicating when the exchange was created.
   */
  createdTime: UTCTimeStamp;
  /**
   * Timestamp indicating when the exchange was last updated.
   */
  updatedTime: UTCTimeStamp;
  /**
   * Span identifier for distributed tracing.
   */
  spanId?: SpanId;
  /**
   * The optional feedback rating given by the user.
   */
  feedbackRating?: FeedbackRating;
}

/**
 * Optional configuration options for when the service automatically starts agent job(s) to serve the conversation.
 * When not provided, service uses default configuration with RunAsMe set to false.
 */
export interface ConversationJobStartOverrides {
  /**
   * Whether the job(s) should run with the user's identity (RunAsMe). Defaults to false when not provided.
   */
  runAsMe?: boolean;
}

/**
 * Raw response type for conversation operations (without methods).
 * Represents a conversation between users and AI agents.
 */
export interface RawConversationGetResponse {
  /**
   * A globally unique identifier for the conversation.
   */
  id: ConversationId;
  /**
   * Timestamp indicating when the conversation was created.
   */
  createdTime: UTCTimeStamp;
  /**
   * Timestamp indicating when any conversation field(s) are updated.
   */
  updatedTime: UTCTimeStamp;
  /**
   * Timestamp indicating when the conversation last had activity.
   */
  lastActivityTime: UTCTimeStamp;
  /**
   * The human-readable label or title for the conversation.
   */
  label: string;
  /**
   * Whether the conversation label was automatically generated.
   */
  autogenerateLabel: boolean;
  /**
   * Identifier of the user who owns or initiated the conversation.
   */
  userId: string;
  /**
   * Identifier of the organization.
   */
  orgId: string;
  /**
   * Identifier of the tenant within the organization.
   */
  tenantId: string;
  /**
   * Identifier of the folder where the conversation is stored.
   */
  folderId: number;
  /**
   * Identifier of the agent used for this conversation
   */
  agentId?: number;
  /**
   * Trace identifier for distributed tracing.
   */
  traceId: TraceId;
  /**
   * Span identifier for distributed tracing.
   */
  spanId?: SpanId;
  /**
   * Optional configuration options for when the service automatically starts agent job(s).
   */
  jobStartOverrides?: ConversationJobStartOverrides;
  /**
   * Optional job key for conversations that are part of a larger job.
   */
  jobKey?: string;
  /**
   * Whether the conversation's job is running locally.
   */
  isLocalJobExecution?: boolean;
}

