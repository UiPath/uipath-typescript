/**
 * Common types for Conversational Agent
 * Contains IDs, primitives, and utility types used across conversation types.
 */

/**
 * Identifies a conversation.
 */
export type ConversationId = string;

/**
 * Identifies an exchange.
 */
export type ExchangeId = string;

/**
 * Identifies a message.
 */
export type MessageId = string;

/**
 * Identifies the origin of a message in the conversation.
 */
export enum MessageRole {
  System = 'system',
  User = 'user',
  Assistant = 'assistant'
}

/**
 * Identifies a message content part.
 */
export type ContentPartId = string;

/**
 * Identifies an interrupt.
 */
export type InterruptId = string;

/**
 * Identifies the type of an interrupt.
 */
export enum InterruptType {
  ToolCallConfirmation = 'uipath_cas_tool_call_confirmation'
}

/**
 * Identifies a citation.
 */
export type CitationId = string;

/**
 * Base interface for citation sources.
 */
export interface CitationSourceBase {
  /**
   * Title for the citation source, suitable for display to users.
   */
  title: string;
  /**
   * Label number for the citation source, suitable for display to users
   * (e.g. [1] for the first unique source, [2] for the second, etc.).
   */
  number: number;
}

/**
 * Used when the citation can be rendered as a link.
 */
export interface CitationSourceUrl extends CitationSourceBase {
  /**
   * Citation url.
   */
  url: string;
}

/**
 * Identifies the format and type of a message content part. Must conform to the MIME type standard.
 */
export type MimeType = string;

/**
 * Used when the citation references media, such as a PDF document.
 */
export interface CitationSourceMedia extends CitationSourceBase {
  /** The mime type of the media. If non-specified, should be discovered through the downloadUrl. */
  mimeType?: MimeType;
  /** Download URL for the media */
  downloadUrl?: string;
  /** The page number for the media, if applicable (e.g. for application/pdf documents) */
  pageNumber?: string;
}

/**
 * Citation sources can target either an Url or a media (e.g. a pdf document).
 * Repeated citation sources within a content part are identified by the same title and number.
 */
export type CitationSource = CitationSourceUrl | CitationSourceMedia;

/**
 * Identifies a tool.
 */
export type ToolName = string;

/**
 * Identifies a tool call and its result.
 */
export type ToolCallId = string;

/**
 * JSON compatible primitive type.
 */
export type JSONPrimitive = string | number | boolean | null;

/**
 * JSON compatible value type.
 */
export type JSONValue = JSONPrimitive | Record<string, any> | any[];

/**
 * JSON compatible object type.
 */
export type JSONObject = Record<string, JSONValue>;

/**
 * JSON compatible array type.
 */
export type JSONArray = JSONValue[];

/**
 * An arbitrary JSON serializable object.
 */
export type MetaData = JSONObject;

/**
 * Produces the provided object type with specified properties changed to optional.
 */
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Produces the provided object type with specified properties changed to required.
 */
export type MakeRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Causes typescript to simplify the display of object types created using MakeOptional, MakeRequired, and other utility
 * types. This doesn't change the effective type, but makes popups in the ide and compile error messages cleaner.
 */
export type Simplify<T> = T extends any[] | Date
  ? T
  : {
    [K in keyof T]: T[K];
  } & {};

/**
 * Inline value - used when a value is small enough to be returned inline with an API result.
 */
export interface InlineValue<T> {
  inline: T;
}

/**
 * External value - used when a value is too large to be returned inline with an API result.
 */
export interface ExternalValue {
  uri: string;
  byteCount?: number;
}

/**
 * Inline or external value - used when a value can be too large to include inline in input or output data.
 * If the inline property is set, it contains the full value, otherwise the uri property is set and it contains an uri
 * from which the data can be downloaded.
 */
export type InlineOrExternalValue<T> = InlineValue<T> | ExternalValue;

/**
 * Tool call input value type.
 */
export type ToolCallInputValue = JSONObject;

/**
 * Tool call output value type.
 */
export type ToolCallOutputValue = JSONValue;
