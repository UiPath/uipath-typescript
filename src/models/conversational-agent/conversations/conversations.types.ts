/**
 * Types for Conversation Service
 */

import type { Conversation, SortOrder, ConversationJobStartOverrides } from './core.types';
import type { PaginationCursor } from '@/utils/pagination/types';

// Re-export for convenience
export type { SortOrder, ConversationJobStartOverrides };

// ==================== Conversation Response Types ====================

/**
 * Response for creating a conversation - returns full Conversation object
 * Matches AgentInterfaces: ConversationCreateOutput = ConversationSchema
 */
export interface ConversationCreateResponse extends Conversation {}

/**
 * Response for getting a conversation - returns full Conversation object
 */
export interface ConversationGetResponse extends Conversation {}

/**
 * Response for deleting a conversation - returns the deleted Conversation object
 * Matches AgentInterfaces: ConversationDeleteOutput = ConversationSchema
 */
export interface ConversationDeleteResponse extends Conversation {}

// ==================== Conversation Request Types ====================

export interface CreateConversationInput {
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

export interface UpdateConversationInput {
  /** Human-readable label for the conversation */
  label?: string;
  /** Whether the label should be auto-generated and updated after exchanges */
  autogenerateLabel?: boolean;
  /** The key of the current/latest job serving the conversation */
  jobKey?: string;
  /** Whether the conversation's job is running locally */
  isLocalJobExecution?: boolean;
}

export interface ConversationGetAllOptions {
  sort?: SortOrder;
  /** Size of the page to fetch (items per page) */
  pageSize?: number;
  /** Cursor for pagination */
  cursor?: PaginationCursor;
}
