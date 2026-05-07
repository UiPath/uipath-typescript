import { FeedbackCategory, FeedbackStatus } from './feedback.types';

/**
 * Raw shape of the GET /api/Feedback/category response
 */
export interface RawFeedbackCategoryListResponse {
  categories: RawFeedbackCategory[];
  totalCount: number;
}

/**
 * Raw category shape before createdAt → createdTime rename
 */
export interface RawFeedbackCategory {
  id: string;
  category: string;
  createdAt: string;
  isDefault: boolean;
  isPositive: boolean;
  isNegative: boolean;
}

/**
 * Raw feedback response shape as returned by the API, before the transform pipeline
 * renames createdAt → createdTime and updatedAt → updatedTime.
 */
export interface RawFeedbackResponse {
  id: string;
  traceId: string;
  spanId: string;
  agentId: string | null;
  agentVersion?: string;
  comment?: string;
  metadata?: string;
  isPositive: boolean;
  feedbackCategories: FeedbackCategory[];
  folderKey?: string;
  userEmail?: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}
