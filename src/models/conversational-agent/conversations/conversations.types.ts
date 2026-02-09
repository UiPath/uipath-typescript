/**
 * Types for Conversation Service
 */

import type { SortOrder, ConversationJobStartOverrides, RawConversationGetResponse } from './types/core.types';
import type { ConversationGetResponse } from './conversations.models';
import type { PaginationOptions } from '@/utils/pagination/types';

// ==================== Conversation Response Types ====================

/** Response for creating a conversation (includes methods) */
export type ConversationCreateResponse = ConversationGetResponse;

/** Response for deleting a conversation (raw data, no methods needed) */
export type ConversationDeleteResponse = RawConversationGetResponse;

// ==================== Conversation Request Types ====================

export interface CreateConversationOptions {
  /** Agent ID (required) */
  agentId: number;
  /** Folder ID (required) */
  folderId: number;
  /** Human-readable label for the conversation (max 100 chars) */
  label?: string;
  /** Whether the label should be auto-generated and updated after exchanges */
  autogenerateLabel?: boolean;
  /** Trace identifier for distributed tracing */
  traceId?: string;
  /** Optional configuration for job start behavior */
  jobStartOverrides?: ConversationJobStartOverrides;
}

export interface UpdateConversationOptions {
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
export interface AttachmentCreateResponse {
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
export interface AttachmentUploadResponse {
  /** URI to reference this attachment in messages */
  uri: string;
  /** File name */
  name: string;
  /** MIME type of the uploaded file */
  mimeType: string;
}
