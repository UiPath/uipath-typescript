import { PaginationOptions } from '../../../utils/pagination';

/**
 * Represents a category that can be associated with feedback.
 * Default categories (Output, Agent Error, Agent Plan Execution) are auto-created per tenant.
 */
export interface FeedbackCategory {
  /** Unique identifier of the feedback category */
  id: string;
  /** Category name (max 256 characters, unique per tenant) */
  category: string;
  /** Timestamp when the category was created */
  createdAt: string;
  /** Whether this is a system default category (e.g., Output, Agent Error, Agent Plan Execution) */
  isDefault: boolean;
  /** Whether this category applies to positive feedback */
  isPositive: boolean;
  /** Whether this category applies to negative feedback */
  isNegative: boolean;
}

/**
 * Status of a feedback entry in the review workflow
 */
export enum FeedbackStatus {
  /** Feedback is awaiting review */
  Pending = 0,
  /** Feedback has been approved and confirmed */
  Approved = 1,
  /** Feedback has been dismissed */
  Dismissed = 2,
}

/**
 * Complete feedback object returned from the API
 */
export interface FeedbackResponse {
  /** Unique identifier of the feedback entry */
  id: string;
  /** OpenTelemetry trace identifier (32-character hexadecimal string) linking feedback to a specific agent execution */
  traceId: string;
  /** OpenTelemetry span identifier (16-character hexadecimal string) representing a specific operation within the trace */
  spanId: string;
  /** Identifier of the agent that generated the response being reviewed */
  agentId: string | null;
  /** Version of the agent at the time the feedback was given (max 100 characters) */
  agentVersion?: string;
  /** Optional text comment provided by the user (max 4000 characters) */
  comment?: string;
  /** Optional JSON metadata for structured data associated with the feedback (max 4000 characters) */
  metadata?: string;
  /** Whether the feedback is positive (thumbs up) or negative (thumbs down) */
  isPositive: boolean;
  /** Categories associated with this feedback entry */
  feedbackCategories: FeedbackCategory[];
  /** Email address of the user who submitted the feedback */
  userEmail?: string;
  /** Current status of the feedback in the review workflow */
  status: FeedbackStatus;
  /** Timestamp when the feedback was created */
  createdAt: string;
  /** Timestamp when the feedback was last updated */
  updatedAt: string;
}

/**
 * Options for retrieving multiple feedback entries
 */
export type FeedbackGetAllOptions = PaginationOptions & {
  /** Filter by agent identifier */
  agentId?: string;
  /** Filter by agent version */
  agentVersion?: string;
  /** Filter by feedback status */
  status?: FeedbackStatus;
  /** Filter by OpenTelemetry trace identifier */
  traceId?: string;
  /** Filter by OpenTelemetry span identifier */
  spanId?: string;
}
