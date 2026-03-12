/**
 * Feedback Category Interface
 * Represents a category that can be associated with feedback
 */
export interface FeedbackCategory {
  id: string;
  category: string;
  createdAt?: string;
  isDefault?: boolean;
  isPositive?: boolean;
  isNegative?: boolean;
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
  status: number;
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
  status?: number;
  traceId?: string;
  spanId?: string;
  [key: string]: string | number | boolean | undefined;
}
