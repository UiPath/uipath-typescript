import type {
  AsyncInputStreamChunkEvent,
  AsyncInputStreamEndEvent,
  AsyncInputStreamId,
  AsyncInputStreamStartEvent,
  CitationId,
  CitationInput,
  ContentPartChunkEvent,
  ContentPartEndEvent,
  ContentPartId,
  ContentPartStartEvent,
  ConversationEvent,
  ConversationId,
  ErrorEndEvent,
  ErrorId,
  ErrorStartEvent,
  ExchangeEndEvent,
  ExchangeId,
  ExchangeStartEvent,
  InterruptEndEvent,
  InterruptId,
  InterruptStartEvent,
  LabelUpdatedEvent,
  MakeOptional,
  MakeRequired,
  MessageEndEvent,
  MessageId,
  MessageStartEvent,
  MetaEvent,
  SessionEndEvent,
  SessionEndingEvent,
  SessionStartedEvent,
  SessionStartEvent,
  Simplify,
  ToolCallEndEvent,
  ToolCallId,
  ToolCallStartEvent
} from '@/models/conversational-agent';

import type { AsyncInputStreamEventHelper } from './async-input-stream-event-helper';
import type { AsyncToolCallEventHelper } from './async-tool-call-event-helper';
import type { ContentPartEventHelper } from './content-part-event-helper';
import type { ConversationEventHelperBase } from './conversation-event-helper-base';
import type { ExchangeEventHelper } from './exchange-event-helper';
import type { MessageEventHelper } from './message-event-helper';
import type { SessionEventHelper } from './session-event-helper';
import type { ToolCallEventHelper } from './tool-call-event-helper';

export type ConversationEventEmitter = (e: ConversationEvent) => void;
export type ConversationEventHandler = (e: ConversationEvent) => void;

export type AsyncInputStreamChunkHandler = (chunk: AsyncInputStreamChunkEvent) => void;
export type AsyncInputStreamEndHandler = (endAsyncInputStreamEnd: AsyncInputStreamEndEvent) => void;
export type AsyncToolCallStartHandler = (asyncToolCall: AsyncToolCallEventHelper) => void;
export type AsyncToolCallStartHandlerAsync = (toolCall: AsyncToolCallEventHelper) => Promise<ToolCallEndEvent | void>;
export type ChunkHandler = (chunk: ContentPartChunkEvent) => void;
export type ContentPartEndHandler = (endContentPart: ContentPartEndEvent) => void;
export type ContentPartStartHandler = (contentPart: ContentPartEventHelper) => void;
export type ContentPartStartHandlerAsync = (contentPart: ContentPartEventHelper) => Promise<ContentPartEndEvent | void>;
export type DeletedHandler = () => void;
export type ErrorStartHandler = (errorStart: ErrorStartHandlerArgs) => void;
export type ErrorEndHandler = (errorEnd: ErrorEndHandlerArgs) => void;
export type AnyErrorStartHandler = (errorStart: AnyErrorStartHandlerArgs) => void;
export type AnyErrorEndHandler = (errorEnd: AnyErrorEndHandlerArgs) => void;
export type UnhandledErrorStartHandler = (errorStart: UnhandledErrorStartHandlerArgs) => void;
export type UnhandledErrorEndHandler = (errorStart: UnhandledErrorEndHandlerArgs) => void;
export type ExchangeEndHandler = (endExchange: ExchangeEndEvent) => void;
export type ExchangeStartHandler = (exchange: ExchangeEventHelper) => void;
export type ExchangeStartHandlerAsync = (exchange: ExchangeEventHelper) => Promise<ExchangeEndEvent | void>;
export type InputStreamStartHandler = (inputStream: AsyncInputStreamEventHelper) => void;
export type LabelUpdatedHandler = (labelUpdated: LabelUpdatedEvent) => void;
export type MessageEndHandler = (endMessage: MessageEndEvent) => void;
export type MessageStartHandler = (message: MessageEventHelper) => void;
export type MessageStartHandlerAsync = (x: MessageEventHelper) => Promise<MessageEndEvent | void>;
export type MetaEventHandler = (meta: MetaEvent) => void;
export type SessionEndHandler = (sessionEndEvent: SessionEndEvent) => void;
export type SessionStartedHandler = (sessionStartedEvent: SessionStartedEvent) => void;
export type SessionEndingHandler = (sessionEndingEvent: SessionEndingEvent) => void;
export type SessionStartHandler = (session: SessionEventHelper) => void;
export type SessionStartHandlerAsync = (session: SessionEventHelper) => Promise<SessionEndEvent | void>;
export type ToolCallEndHandler = (endToolCall: ToolCallEndEvent) => void;
export type ToolCallStartHandler = (toolCall: ToolCallEventHelper) => void;
export type ToolCallStartHandlerAsync = (toolCall: ToolCallEventHelper) => Promise<ToolCallEndEvent | void>;
export type ToolCallCompletedHandler = (completedToolCall: CompletedToolCall) => void;
export type ContentPartCompletedHandler = (completedContentPart: CompletedContentPart) => void;
export type MessageCompletedHandler = (completedMessage: CompletedMessage) => void;
export type InterruptStartHandler = (interruptStart: InterruptStartHandlerArgs) => void;
export type InterruptEndHandler = (interruptEnd: InterruptEndHandlerArgs) => void;
export type InterruptCompletedHandler = (interruptCompleted: InterruptCompletedHandlerArgs) => void;

export type SessionStartEventOptions = {
  conversationId: ConversationId;

  /**
   * When set, causes events emitted to also be dispatched to event handlers. This option is useful
   * when the event helper objects are bound to UI components as it allows a single code path for
   * rendering both user and assistant messages.
   */
  echo?: boolean;

  properties?: ConversationEventHelperProperties;

} & SessionStartEvent;
export type ErrorEndEventOptions = { errorId: ErrorId } & ErrorEndEvent;
export type ErrorStartEventOptions = { errorId?: ErrorId } & ErrorStartEvent;
export type ExchangeStartEventOptions = { exchangeId?: ExchangeId; properties?: ConversationEventHelperProperties } & ExchangeStartEvent;
export type InputStreamStartEventOptions = { streamId?: AsyncInputStreamId; properties?: ConversationEventHelperProperties } & AsyncInputStreamStartEvent;
export type MessageStartEventOptions = { messageId?: MessageId; properties?: ConversationEventHelperProperties } & MakeOptional<MessageStartEvent, 'role'>;
export type ToolCallStartEventWithId = { toolCallId?: ToolCallId; properties?: ConversationEventHelperProperties } & ToolCallStartEvent;
export type ContentPartStartEventOptions = { contentPartId?: ContentPartId; properties?: ConversationEventHelperProperties } & ContentPartStartEvent;

export type ConversationEventHelperProperties = Record<string, unknown>;

export type ErrorStartHandlerArgs = { errorId: ErrorId } & ErrorStartEvent;
export type ErrorEndHandlerArgs = { errorId: ErrorId } & ErrorEndEvent;

export type AnyErrorStartHandlerArgs = { source: ConversationEventErrorSource } & ErrorStartHandlerArgs;
export type AnyErrorEndHandlerArgs = { source: ConversationEventErrorSource } & ErrorEndHandlerArgs;

export type UnhandledErrorStartHandlerArgs = AnyErrorStartHandlerArgs;
export type UnhandledErrorEndHandlerArgs = AnyErrorEndHandlerArgs;

export type InterruptStartHandlerArgs = { interruptId: InterruptId; startEvent: InterruptStartEvent };
export type InterruptEndHandlerArgs = { interruptId: InterruptId; endEvent: InterruptEndEvent };
export type InterruptCompletedHandlerArgs = { interruptId: InterruptId; startEvent: InterruptStartEvent; endEvent: InterruptEndEvent };

export type ConversationEventErrorSource = ConversationEventHelperBase<any, any>;

export type CitationError = {
  citationId: CitationId;
  errorType: CitationErrorType;
};

export enum CitationErrorType {
  CitationNotEnded = 'CitationNotEnded',
  CitationNotStarted = 'CitationNotStarted'
};

export type CompletedContentPart = ContentPartStartEvent & ContentPartEndEvent & {
  contentPartId: ContentPartId;
  data: string;
  citations: CitationInput[];
  citationErrors: CitationError[];
};

export type CompletedToolCall = ToolCallStartEvent & ToolCallEndEvent & {
  toolCallId: ToolCallId;
};

export type CompletedMessage = Simplify<
  {
    messageId: MessageId;
    contentParts: Array<CompletedContentPart>;
    toolCalls: Array<CompletedToolCall>;
  }
  & Partial<MessageStartEvent>
  & MessageEndEvent
>;

export type SendMessageWithContentPartOptions = Simplify<
MakeRequired<
  Omit<ContentPartChunkEvent, 'contentPartSequence'>,
  'data'
> & MessageStartEventOptions & MakeOptional<ContentPartStartEvent, 'mimeType'>
>;

export type ConversationEventHelperManagerConfig = {
  emit: ConversationEventEmitter;
};

/**
 * Thrown by conversation event helper classes when invalid event content is detected. This error can be returned to
 * clients to inform them of the invalid input.
 */
export class ConversationEventValidationError extends Error {

}

/**
 * Thrown by conversation event helper classes when an operation was performed while the helper is in state that doesn't
 * allow that operation. This error should be treated as an internal error and not returned to clients.
 */
export class ConversationEventInvalidOperationError extends Error {

}

export enum EventErrorId {
  AGENT_COULD_NOT_BE_STARTED = 'AGENT_COULD_NOT_BE_STARTED',
  SESSION_START_PROCESSING_FAILED = 'SESSION_START_PROCESSING_FAILED',
  CLIENT_EVENT_PROCESSING_FAILED = 'CLIENT_EVENT_PROCESSING_FAILED',
  EXCHANGE_COULD_NOT_BE_CREATED = 'EXCHANGE_COULD_NOT_BE_CREATED',
  MESSAGE_COULD_NOT_BE_CREATED = 'MESSAGE_COULD_NOT_BE_CREATED',
  COULD_NOT_CREATE_CONTENT_PART = 'COULD_NOT_CREATE_CONTENT_PART',
  COULD_SIGNAL_USER_ACTIVITY = 'COULD_SIGNAL_USER_ACTIVITY',
  AGENT_EVENT_PROCESSING_FAILED = 'AGENT_EVENT_PROCESSING_FAILED',
  COULD_NOT_ENSURE_EXCHANGE = 'COULD_NOT_ENSURE_EXCHANGE',
  COULD_NOT_CREATE_MESSAGE = 'COULD_NOT_CREATE_MESSAGE',
  CONTENT_PART_HAS_CITATION_ERRORS = 'CONTENT_PART_HAS_CITATION_ERRORS',
  EXCHANGE_START_PROCESSING_FAILED = 'EXCHANGE_START_PROCESSING_FAILED',
  EXCHANGE_END_PROCESSING_FAILED = 'EXCHANGE_END_PROCESSING_FAILED',
  MESSAGE_START_PROCESSING_FAILED = 'MESSAGE_START_PROCESSING_FAILED',
  MESSAGE_END_PROCESSING_FAILED = 'MESSAGE_END_PROCESSING_FAILED',
  CONTENT_PART_START_PROCESSING_FAILED = 'CONTENT_PART_START_PROCESSING_FAILED',
  COULD_NOT_CREATE_TOOL_CALL = 'COULD_NOT_CREATE_TOOL_CALL',
  TOOL_CALL_START_PROCESSING_FAILED = 'TOOL_CALL_START_PROCESSING_FAILED',
  TOOL_CALL_END_PROCESSING_FAILED = 'TOOL_CALL_END_PROCESSING_FAILED',
  COULD_NOT_CREATE_INTERRUPT = 'COULD_NOT_CREATE_INTERRUPT',
  COULD_NOT_END_INTERRUPT = 'COULD_NOT_END_INTERRUPT',
  TEXT_CONTENT_PART_PROCESSING_FAILED = 'TEXT_CONTENT_PART_PROCESSING_FAILED',
  EXTERNAL_CONTENT_PART_PROCESSING_FAILED = 'EXTERNAL_CONTENT_PART_PROCESSING_FAILED'
}
