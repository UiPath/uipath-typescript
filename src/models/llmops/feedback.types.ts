/**
 * Feedback Category Interface
 * Represents a category that can be associated with feedback
 */
export interface FeedbackCategory {
  id: string;
  category: string;
  createdAt?: string;
  isDefault?: boolean;
}

/**
 * Feedback Status Enum
 * Represents the current status of feedback
 */
export enum FeedbackStatus {
  Active = 0,
  Archived = 1,
  Deleted = 2
}

/**
 * Feedback Response
 * Complete feedback object returned from API
 */
export interface FeedbackResponse {
  id: string;
  traceId: string;
  spanId: string;
  agentId: string;
  agentVersion?: string;
  comment?: string;
  metadata?: string;
  isPositive: boolean;
  feedbackCategories?: FeedbackCategory[];
  userEmail?: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Feedback Get All Options
 * Options for retrieving multiple feedback entries
 */
export interface FeedbackGetAllOptions {
  skip?: number;
  take?: number;
  agentId?: string;
  agentVersion?: string;
  status?: FeedbackStatus;
  traceId?: string;
  spanId?: string;
  [key: string]: string | number | boolean | undefined;
}
