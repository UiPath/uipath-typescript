import { FeedbackCategory, FeedbackStatus } from './feedback.types';

/**
 * Raw feedback response shape as returned by the API, before the transform pipeline
 * renames createdAt → createdTime and updatedAt → updatedTime.
 */
export interface RawFeedbackGetResponse {
  id: string;
  traceId: string;
  spanId: string;
  agentId: string | null;
  agentVersion?: string;
  comment?: string;
  metadata?: string;
  isPositive: boolean;
  feedbackCategories: FeedbackCategory[];
  userEmail?: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}
