/**
 * Event types for Conversational Agent WebSocket protocol
 */

import type {
  CitationSource,
  ExternalValue,
  JSONValue,
  MessageRole,
  MetaData,
  ToolCallInputValue,
  ToolCallOutputValue
} from '../types/common.types';
import { InterruptType } from '../types/common.types';

/**
 * Identifies how sensitive the LLM should be when detecting the start or end of speech.
 *
 *     * UNSPECIFIED - the default is HIGH
 *     * HIGH - Will detect the start/end of speech more often.
 *     * LOW - Will detect the start/end of speech less often.
 */
export enum InputStreamSpeechSensitivity {
  Unspecified = 'UNSPECIFIED',
  High = 'HIGH',
  Low = 'LOW'
}

/**
 * Signals that a content stream was interrupted.
 */
export interface ContentPartInterrupted {}

/**
 * Describes the capabilities of the sender. This type allows custom properties, in addition to the ones defined.
 */
export interface SessionCapabilities {
  /**
   * Indicates the sender may produce a cross exchange input stream events if the receiver indicates they can be handled.
   */
  asyncInputStreamEmitter?: boolean;
  /**
   * Indicates the sender can handle cross exchange input stream events.
   */
  asyncInputStreamHandler?: boolean;
  /**
   * Indicates the sender may produce cross exchange tool calls if the receiver indicates they can be handled.
   */
  asyncToolCallEmitter?: boolean;
  /**
   * Indicates the sender can handle cross exchange tool calls.
   */
  asyncToolCallHandler?: boolean;
  /**
   * Indicates the mime types which the sender can send in input streams and as message content, provided the receiver
   * indicates they can handle the mime type.
   */
  mimeTypesEmitted?: string[];
  /**
   * Indicates the mime types the sender can handle. Wildcards such as "*\/*" and "text/*" are allowed.
   */
  mimeTypesHandled?: string[];
  /** Allow custom properties */
  [key: string]: unknown;
}

/**
 * Signals the start of a session.
 */
export interface SessionStartEvent {
  /**
   * Indicates the capabilities of the end point that sent the session start event.
   */
  capabilities?: SessionCapabilities;
  /**
   * Optional metadata that can be used for any data pertaining to the starting event stream.
   */
  metaData?: MetaData;
}

/**
 * Signals the acceptance of the start of a session.
 */
export interface SessionStartedEvent {
  /**
   * Indicates the capabilities of the end point that received the session start event.
   */
  capabilities?: SessionCapabilities;
}

/**
 * Indicates the end of a session.
 */
export interface SessionEndEvent {
  /**
   * Optional metadata that can be used for any data having to do with the completion of the session.
   */
  metaData?: MetaData;
}

/**
 * Indicates the service wants the client to end the current session.
 */
export interface SessionEndingEvent {
  /**
   * Number of milliseconds before the websocket is closed by the service to force the session to end.
   */
  timeToLiveMS: number;
}

/**
 * Signals the start of an exchange of messages within a conversation.
 */
export interface ExchangeStartEvent {
  /**
   * Optional value specifying the sequence number of the exchange within the conversation.
   */
  conversationSequence?: number;
  /**
   * Optional metadata that can be used for any data pertaining to the starting event stream.
   */
  metadata?: MetaData;
  /**
   * The time the exchange started.
   */
  timestamp?: string;
}

/**
 * Signals the end of an exchange of messages within a conversation.
 */
export interface ExchangeEndEvent {
  /**
   * Optional metadata that can be used for any data having to do with the completion of the event stream.
   */
  metaData?: MetaData;
}

/**
 * Signals the start of a message.
 */
export interface MessageStartEvent {
  /**
   * Optional value that provides the sequence of the message within the exchange.
   */
  exchangeSequence?: number;
  /**
   * Message timestamp.
   */
  timestamp?: string;
  /**
   * Required value that identifies the origin of the message (system, user, or agent).
   */
  role: MessageRole;
  /**
   * Optional metadata that can be used for any data pertaining to the starting event stream.
   */
  metaData?: MetaData;
}

/**
 * Signals the end of a message.
 */
export interface MessageEndEvent {
  /**
   * Optional metadata that can be used for any data having to do with the completion of the event stream.
   */
  metaData?: MetaData;
}

/**
 * Content part start event metadata with transcript indicator.
 */
export type ContentPartStartMetaData = MetaData & {
  /**
   * Indicates that the content part is transcript produced by the LLM from user voice input.
   */
  isTranscript?: boolean;
};

/**
 * Signals the start of a message content part.
 */
export interface ContentPartStartEvent {
  /**
   * Describes the type and format of a content part.
   */
  mimeType: string;
  /**
   * Optional metadata that can be used for any data pertaining to the starting event stream.
   */
  metaData?: ContentPartStartMetaData;
  /**
   * If present, indicates that the content part's data is stored externally.
   */
  externalValue?: ExternalValue;
  /**
   * Optional name for the content part. Typically used for file attachment names.
   */
  name?: string;
  /**
   * The time the content part was created.
   */
  timestamp?: string;
}

/**
 * Signals the end of a message content part.
 */
export interface ContentPartEndEvent {
  /**
   * Optional value that provides the contentPartSequence sent in the last content part chunk sent.
   */
  lastChunkContentPartSequence?: number;
  /**
   * Indicates if the content part stream was interrupted.
   */
  interrupted?: ContentPartInterrupted;
  /**
   * Optional metadata that can be used for any data having to do with the completion of the event stream.
   */
  metaData?: MetaData;
}

/**
 * Represents the start of an error condition.
 */
export interface ErrorStartEvent {
  /**
   * A message that can be displayed to the user.
   */
  message: string;
  /**
   * An optional property that contains error related details.
   */
  details?: JSONValue;
}

/**
 * Represents the end of an error condition.
 */
export interface ErrorEndEvent {}

/**
 * Encapsulates sub-events that represent the start and end of an error condition.
 */
export interface ErrorEvent {
  /**
   * An identifier for the error.
   */
  errorId: string;
  /**
   * If present, indicates the start of an error condition.
   */
  startError?: ErrorStartEvent;
  /**
   * If present, indicates the end of an error condition.
   */
  endError?: ErrorEndEvent;
}

/**
 * Indicates the start of a citation target in the stream of content part chunks.
 */
export interface CitationStartEvent {}

/**
 * Indicates the end of a citation target in the stream of content part chunks.
 */
export interface CitationEndEvent {
  /**
   * Provides data concerning the citation sources.
   */
  sources: CitationSource[];
}

/**
 * Encapsulates sub-events related to citations.
 */
export interface CitationEvent {
  /**
   * Identifies a set of citation sources.
   */
  citationId: string;
  /**
   * Indicates the start of a citation target.
   */
  startCitation?: CitationStartEvent;
  /**
   * Indicates the end of a citation target.
   */
  endCitation?: CitationEndEvent;
  /**
   * Sent by the service to indicate an error condition impacting a citation.
   */
  citationError?: ErrorEvent;
}

/**
 * Contains a chunk of a message content part.
 */
export interface ContentPartChunkEvent {
  /**
   * Content part data.
   */
  data?: string;
  /**
   * Sub-event for attaching citations to content chunks.
   */
  citation?: CitationEvent;
}

/**
 * Signals the start of an input stream.
 */
export interface AsyncInputStreamStartEvent {
  /**
   * Describes the type of data sent over the input stream.
   */
  mimeType: string;
  /**
   * Determines how sensitive the LLM should be in detecting the start of speech.
   */
  startOfSpeechSensitivity?: InputStreamSpeechSensitivity;
  /**
   * Determines how sensitive the LLM should be in detecting the end of speech.
   */
  endOfSpeechSensitivity?: InputStreamSpeechSensitivity;
  /**
   * The required duration of detected speech before start-of-speech is committed.
   */
  prefixPaddingMs?: number;
  /**
   * The required duration of detected non-speech before end-of-speech is committed.
   */
  silenceDurationMs?: number;
  /**
   * Optional metadata that can be used for any data pertaining to the starting event stream.
   */
  metaData?: MetaData;
}

/**
 * Signals the end of a cross exchange input stream.
 */
export interface AsyncInputStreamEndEvent {
  /**
   * Optional metadata that can be used for any data having to do with the completion of the event stream.
   */
  metaData?: MetaData;
  /**
   * Optional value that provides the contentPartSequence value in the last content part chunk sent.
   */
  lastChunkContentPartSequence?: number;
}

/**
 * Async input stream chunk event.
 */
export interface AsyncInputStreamChunkEvent {
  data: string;
}

/**
 * Signals the start of a tool call.
 */
export interface ToolCallStartEvent {
  /**
   * Identifies the tool that is to be called.
   */
  toolName: string;
  /**
   * The time the tool call was made.
   */
  timestamp?: string;
  /**
   * Optional input value provided to the tool when executed.
   */
  input?: ToolCallInputValue;
  /**
   * Optional metadata pertaining to the tool call.
   */
  metaData?: MetaData;
}

/**
 * Signals the end of a tool call.
 */
export interface ToolCallEndEvent {
  /**
   * The time the result was generated.
   */
  timestamp?: string;
  /**
   * Optional output value returned by the tool's execution.
   */
  output?: ToolCallOutputValue;
  /**
   * Indicates if the tool call resulted in an error.
   */
  isError?: boolean;
  /**
   * Indicates if the tool call was canceled before the result was generated.
   */
  cancelled?: boolean;
  /**
   * Metadata pertaining to the tool call's execution or result.
   */
  metaData?: MetaData;
}

/**
 * Allows additional events to be sent in the context of the enclosing event stream.
 */
export interface MetaEvent {
  [key: string]: unknown;
}

/**
 * Indicates the update of the conversation label.
 */
export interface LabelUpdatedEvent {
  /**
   * The new label for the conversation.
   */
  label: string;
  /**
   * Whether the label was autogenerated by the system, or manually updated through the API.
   */
  autogenerated: boolean;
}

/**
 * Encapsulates the data related to a tool call event.
 */
export interface ToolCallEvent {
  /**
   * Identifies the tool call.
   */
  toolCallId: string;
  /**
   * Signals the start of a tool call.
   */
  startToolCall?: ToolCallStartEvent;
  /**
   * Signals the end of a tool call.
   */
  endToolCall?: ToolCallEndEvent;
  /**
   * Allows additional events to be sent in the context of the enclosing event stream.
   */
  metaEvent?: MetaEvent;
  /**
   * Sent by the service to indicate an error condition impacting a tool call.
   */
  toolCallError?: ErrorEvent;
}

/**
 * Schema for tool call confirmation interrupt value.
 */
export interface ToolCallConfirmationValue {
  /**
   * The ID of the tool call being confirmed.
   */
  toolCallId: string;
  /**
   * The name of the tool to be called.
   */
  toolName: string;
  /**
   * The input schema for the tool call.
   */
  inputSchema: JSONValue;
  /**
   * The input value for the tool call.
   */
  inputValue?: JSONValue;
}

/**
 * Schema for tool call confirmation end value.
 */
export interface ToolCallConfirmationEndValue {
  /**
   * Whether the tool call was approved.
   */
  approved: boolean;
  /**
   * Modified input parameters for the tool call.
   */
  input?: JSONValue;
}

/**
 * Known interrupt start event for tool call confirmation.
 */
export interface ToolCallConfirmationInterruptStartEvent {
  /**
   * Tool call confirmation interrupt type.
   */
  type: typeof InterruptType.ToolCallConfirmation;
  /**
   * The tool call confirmation data.
   */
  value: ToolCallConfirmationValue;
}

/**
 * Generic interrupt start event for custom interrupts.
 */
export interface GenericInterruptStartEvent {
  /**
   * The type of the interrupt.
   */
  type: string;
  /**
   * The value of the interrupt.
   */
  value: unknown;
}

/**
 * Signals the start of an interrupt - a pause point where the agent needs external input.
 */
export type InterruptStartEvent = ToolCallConfirmationInterruptStartEvent | GenericInterruptStartEvent;

/**
 * Signals the interrupt end event with the provided value.
 */
export type InterruptEndEvent = unknown;

/**
 * Encapsulates interrupt-related events within a message.
 */
export interface InterruptEvent {
  /**
   * Identifies the interrupt.
   */
  interruptId: string;
  /**
   * Signals the start of an interrupt.
   */
  startInterrupt?: InterruptStartEvent;
  /**
   * Signals the end of an interrupt.
   */
  endInterrupt?: InterruptEndEvent;
}

/**
 * Encapsulates sub-events related to message content parts.
 */
export interface ContentPartEvent {
  /**
   * Identifies the content part.
   */
  contentPartId: string;
  /**
   * Optional value that signals the start of message content.
   */
  startContentPart?: ContentPartStartEvent;
  /**
   * Optional value that signals the end of message content.
   */
  endContentPart?: ContentPartEndEvent;
  /**
   * Optional content part chunk sub-event.
   */
  chunk?: ContentPartChunkEvent;
  /**
   * Allows additional events to be sent in the context of the enclosing event stream.
   */
  metaEvent?: MetaEvent;
  /**
   * Sent by the service to indicate an error condition impacting a content part.
   */
  contentPartError?: ErrorEvent;
}

/**
 * Encapsulates sub-events related to a message within an exchange.
 */
export interface MessageEvent {
  /**
   * Identifies a message.
   */
  messageId: string;
  /**
   * Optional value that signals that start of a message.
   */
  startMessage?: MessageStartEvent;
  /**
   * Optional value that signals the end of a message.
   */
  endMessage?: MessageEndEvent;
  /**
   * Optional content part sub-event.
   */
  contentPart?: ContentPartEvent;
  /**
   * Optional tool call sub-event.
   */
  toolCall?: ToolCallEvent;
  /**
   * Optional interrupt sub-event for human-in-the-loop patterns.
   */
  interrupt?: InterruptEvent;
  /**
   * Allows additional events to be sent in the context of the enclosing event stream.
   */
  metaEvent?: MetaEvent;
  /**
   * Sent by the service to indicate an error condition impacting a message.
   */
  messageError?: ErrorEvent;
}

/**
 * Encapsulates events related to a cross exchange input stream for the conversation.
 */
export interface AsyncInputStreamEvent {
  /**
   * Identifies the input stream.
   */
  streamId: string;
  /**
   * Optional value that signals the start of an input stream.
   */
  startAsyncInputStream?: AsyncInputStreamStartEvent;
  /**
   * Optional value that signals the end of an input stream.
   */
  endAsyncInputStream?: AsyncInputStreamEndEvent;
  /**
   * Optional input stream chunk sub-event.
   */
  chunk?: AsyncInputStreamChunkEvent;
  /**
   * Allows additional events to be sent in the context of the enclosing event stream.
   */
  metaEvent?: MetaEvent;
  /**
   * Sent by the service to indicate an error condition impacting an async input stream.
   */
  asyncInputStreamError?: ErrorEvent;
}

/**
 * An event that applies to a single exchange of messages within a conversation.
 */
export interface ExchangeEvent {
  /**
   * Identifies the exchange.
   */
  exchangeId: string;
  /**
   * Optional value that signals the start of an exchange.
   */
  startExchange?: ExchangeStartEvent;
  /**
   * Optional value that signals the end of an exchange.
   */
  endExchange?: ExchangeEndEvent;
  /**
   * Optional message sub-events related to the exchange.
   */
  message?: MessageEvent;
  /**
   * Allows additional events to be sent in the context of the enclosing event stream.
   */
  metaEvent?: MetaEvent;
  /**
   * Sent by the service to indicate an error condition impacting an exchange.
   */
  exchangeError?: ErrorEvent;
}

/**
 * The ConversationEvent type represents an event in a conversation with an LLM.
 */
export interface ConversationEvent {
  /**
   * A globally unique identifier for conversation to which the other sub-event and data properties apply.
   */
  conversationId: string;
  /**
   * Signals the start of session for a conversation.
   */
  startSession?: SessionStartEvent;
  /**
   * Sent in response to a SessionStartEvent to signal the acceptance of the session.
   */
  sessionStarted?: SessionStartedEvent;
  /**
   * Sent by the service when the client needs to end the current session.
   */
  sessionEnding?: SessionEndingEvent;
  /**
   * Signals the end of a session for a conversation.
   */
  endSession?: SessionEndEvent;
  /**
   * Optional exchange sub-event.
   */
  exchange?: ExchangeEvent;
  /**
   * Optional input stream sub-events.
   */
  asyncInputStream?: AsyncInputStreamEvent;
  /**
   * Optional async tool call sub-event.
   */
  asyncToolCall?: ToolCallEvent;
  /**
   * Indicates that the conversation's label has been updated.
   */
  labelUpdated?: LabelUpdatedEvent;
  /**
   * Allows additional events to be sent in the context of the enclosing event stream.
   */
  metaEvent?: MetaEvent;
  /**
   * Sent by the service to indicate an error condition impacting a conversation.
   */
  conversationError?: ErrorEvent;
}
