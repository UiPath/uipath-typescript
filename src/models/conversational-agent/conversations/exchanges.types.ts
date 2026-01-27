/**
 * Types for Exchange Service
 */

import type { SortOrder, FeedbackRating } from '@/models/conversational-agent/conversations-api.types';
import type { PaginationCursor } from '@/utils/pagination/types';

// Re-export for convenience
export type { FeedbackRating };

// ==================== Exchange Options ====================

export interface ExchangeGetAllOptions {
  exchangeSort?: SortOrder;
  messageSort?: SortOrder;
  /** Size of the page to fetch (items per page) */
  pageSize?: number;
  /** Cursor for pagination */
  cursor?: PaginationCursor;
}

export interface ExchangeGetByIdOptions {
  messageSort?: SortOrder;
  /** Index signature for QueryParams compatibility */
  [key: string]: SortOrder | undefined;
}

// ==================== Feedback Types ====================

export interface CreateFeedbackInput {
  rating: FeedbackRating;
  /** Optional text comment for the feedback (matches AgentInterfaces 'comment' field) */
  comment?: string;
}

export interface FeedbackCreateResponse {}
