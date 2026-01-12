/**
 * Request/Input types for Conversational Agent Service
 */

import type { SortOrder, FeedbackRating, ConversationJobStartOverrides } from './conversation-api.types';
import type { PaginationCursor } from '../../utils/pagination/types';

// Re-export for convenience
export type { SortOrder, FeedbackRating, ConversationJobStartOverrides };

// ==================== Conversation Requests ====================

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

export interface ListConversationsInput {
  sort?: SortOrder;
  /** Size of the page to fetch (items per page) */
  pageSize?: number;
  /** Cursor for pagination */
  cursor?: PaginationCursor;
}

// ==================== Exchange Requests ====================

export interface ListExchangesInput {
  exchangeSort?: SortOrder;
  messageSort?: SortOrder;
  /** Size of the page to fetch (items per page) */
  pageSize?: number;
  /** Cursor for pagination */
  cursor?: PaginationCursor;
}

export interface GetExchangeInput {
  messageSort?: SortOrder;
  /** Index signature for QueryParams compatibility */
  [key: string]: SortOrder | undefined;
}

// ==================== Feedback Requests ====================

export interface CreateFeedbackInput {
  rating: FeedbackRating;
  /** Optional text comment for the feedback (matches AgentInterfaces 'comment' field) */
  comment?: string;
}

// ==================== User Settings Requests ====================

/**
 * Input for updating user settings
 *
 * All fields are optional - only send the fields you want to change.
 * Set fields to `null` to explicitly clear them.
 * Omitting fields means no change.
 *
 * @example
 * ```typescript
 * // Update specific fields
 * await agent.user.updateSettings({
 *   name: 'John Doe',
 *   timezone: 'America/New_York'
 * });
 *
 * // Clear a field by setting to null
 * await agent.user.updateSettings({
 *   department: null
 * });
 * ```
 */
export interface UpdateUserSettingsInput {
  /** Name of the user (max 100 chars) */
  name?: string | null;
  /** Email address (max 255 chars, must be valid email) */
  email?: string | null;
  /** Role of the user (max 100 chars) */
  role?: string | null;
  /** Department (max 100 chars) */
  department?: string | null;
  /** Company (max 100 chars) */
  company?: string | null;
  /** Country (max 100 chars) */
  country?: string | null;
  /** Timezone (max 50 chars) */
  timezone?: string | null;
}
