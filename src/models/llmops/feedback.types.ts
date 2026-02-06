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
 * Feedback Category Input
 * Used when creating or updating feedback categories
 */
export interface FeedbackCategoryInput {
  id?: string;
  category: string;
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
 * Feedback Create Options
 * Options for creating new feedback
 */
export interface FeedbackCreateOptions {
  traceId: string;
  spanId: string;
  agentId: string;
  agentVersion?: string;
  comment?: string;
  metadata?: string;
  isPositive: boolean;
  categories?: FeedbackCategoryInput[];
}

/**
 * Feedback Edit Options
 * Options for editing existing feedback
 */
export interface FeedbackEditOptions {
  comment?: string;
  metadata?: string;
  isPositive?: boolean;
  categories?: FeedbackCategoryInput[];
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
  filter?: string;
  orderby?: string;
  top?: number;
  skip?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Feedback Category Create Options
 * Options for creating a new feedback category
 */
export interface FeedbackCategoryCreateOptions {
  category: string;
}

/**
 * Feedback Category Response
 * Response when creating or retrieving feedback categories
 */
export interface FeedbackCategoryResponse {
  id: string;
  category: string;
  createdAt: string;
  isDefault: boolean;
}
