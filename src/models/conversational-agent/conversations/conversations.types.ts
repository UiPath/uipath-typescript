/**
 * Types for Conversation Service
 */

import type { SortOrder, ConversationJobStartOverrides, RawConversationGetResponse } from './types/core.types';
import type { ConversationGetResponse } from './conversations.models';
import type { PaginationOptions } from '@/utils/pagination/types';
import type { LogLevel } from '@/core/websocket';

// ==================== Session Options ====================

/**
 * Options for starting a session on a conversation object.
 * Unlike SessionStartEventOptions, conversationId is not needed since it's implicit from the conversation.
 */
export interface ConversationSessionOptions {
  /**
   * When set, causes events emitted to also be dispatched to event handlers.
   * This option is useful when the event helper objects are bound to UI components
   * as it allows a single code path for rendering both user and assistant messages.
   */
  echo?: boolean;


  /**
   * Sets the log level for WebSocket session debugging.
   * When set, enables logging at the specified level for the underlying WebSocket connection.
   *
   * @example
   * ```typescript
   * import { LogLevel } from '@uipath/uipath-typescript/conversational-agent';
   *
   * const session = conversation.startSession({ logLevel: LogLevel.Debug });
   * ```
   */
  logLevel?: LogLevel;
}

// ==================== Conversation Response Types ====================

/** Response for creating a conversation (includes methods) */
export type ConversationCreateResponse = ConversationGetResponse;

/** Response for updating a conversation (includes methods) */
export type ConversationUpdateResponse = ConversationGetResponse;

/** Response for deleting a conversation (raw data, no methods needed) */
export type ConversationDeleteResponse = RawConversationGetResponse;

// ==================== Conversation Request Types ====================

export interface ConversationCreateOptions {
  /** Human-readable label for the conversation (max 100 chars) */
  label?: string;
  /** Whether the label should be auto-generated and updated after exchanges */
  autogenerateLabel?: boolean;
  /** Trace identifier for distributed tracing */
  traceId?: string;
  /** Optional configuration for job start behavior */
  jobStartOverrides?: ConversationJobStartOverrides;
}

export interface ConversationUpdateOptions {
  /** Human-readable label for the conversation */
  label?: string;
  /** Whether the label should be auto-generated and updated after exchanges */
  autogenerateLabel?: boolean;
  /** The key of the current/latest job serving the conversation */
  jobKey?: string;
  /** Whether the conversation's job is running locally */
  isLocalJobExecution?: boolean;
}

export type ConversationGetAllOptions = PaginationOptions & {
  /** Sort order for conversations */
  sort?: SortOrder;
}

// ==================== Attachment Types ====================

/**
 * File upload access details for uploading file content to blob storage
 */
export interface FileUploadAccess {
  /** URL to upload the file to */
  url: string;
  /** HTTP verb to use (e.g., 'PUT') */
  verb: string;
  /** Headers to include in the upload request */
  headers: { keys: string[]; values: string[] };
  /** Whether authentication is required for the upload */
  requiresAuth?: boolean;
}

/**
 * Response for creating a file attachment entry
 *
 * Contains the attachment URI and upload access details for uploading
 * the file content to blob storage.
 */
export interface ConversationAttachmentCreateResponse {
  /** URI to reference this attachment in messages */
  uri: string;
  /** File name */
  name: string;
  /** Details for uploading the file content */
  fileUploadAccess: FileUploadAccess;
}

/**
 * Response for uploading an attachment (after file content is uploaded)
 */
export interface ConversationAttachmentUploadResponse {
  /** URI to reference this attachment in messages */
  uri: string;
  /** File name */
  name: string;
  /** MIME type of the uploaded file */
  mimeType: string;
}
