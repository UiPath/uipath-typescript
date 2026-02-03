/**
 * Types for Conversation Service
 */

import type { SortOrder, ConversationJobStartOverrides, RawConversationGetResponse } from './core.types';
import type { ConversationGetResponse } from './conversations.models';
import type { PaginationOptions } from '@/utils/pagination/types';

// ==================== Conversation Response Types ====================

/** Response for creating a conversation (includes methods) */
export type ConversationCreateResponse = ConversationGetResponse;

/** Response for deleting a conversation (raw data, no methods needed) */
export type ConversationDeleteResponse = RawConversationGetResponse;

// ==================== Conversation Request Types ====================

export interface CreateConversationOptions {
  /** Agent release ID (required) */
  agentReleaseId: number;
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
