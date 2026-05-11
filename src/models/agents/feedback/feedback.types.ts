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
  createdTime: string;
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
  /** Trace identifier linking feedback to a specific agent execution */
  traceId: string;
  /** Span identifier representing a specific operation within the trace */
  spanId: string;
  /** Identifier of the agent that generated the response being reviewed */
  agentId: string | null;
  /** Version of the agent at the time the feedback was given (max 100 characters) */
  agentVersion?: string;
  /** Optional text comment provided by the user (max 4000 characters) */
  comment?: string;
  /** Optional metadata string associated with the feedback (max 4000 characters) */
  metadata?: string;
  /** Whether the feedback is positive (thumbs up) or negative (thumbs down) */
  isPositive: boolean;
  /** Categories associated with this feedback entry */
  feedbackCategories: FeedbackCategory[];
  /** Folder key (GUID) of the folder the feedback belongs to */
  folderKey?: string;
  /** Email address of the user who submitted the feedback */
  userEmail?: string;
  /** Current status of the feedback in the review workflow */
  status: FeedbackStatus;
  /** Timestamp when the feedback was created */
  createdTime: string;
  /** Timestamp when the feedback was last updated */
  updatedTime: string;
}

/**
 * Feedback object returned by getAll and getById.
 * Extends {@link FeedbackResponse} — use this type for getAll/getById return values.
 */
export interface FeedbackGetResponse extends FeedbackResponse {}

/**
 * Options shared across feedback operations
 */
export interface FeedbackOptions {
  /** Folder key for authorization */
  folderKey: string;
}

/**
 * A category reference used when creating or updating feedback
 */
export interface FeedbackCategoryInput {
  /** Unique identifier of the category */
  id: string;
  /** Category name (e.g., 'Output', 'Agent Error', 'Agent Plan Execution') */
  category: string;
}

/**
 * Options for submitting a new feedback entry
 */
export interface FeedbackSubmitOptions extends FeedbackOptions {
  /** Span identifier representing a specific operation within the trace */
  spanId?: string;
  /** Identifier of the agent that generated the response being reviewed */
  agentId?: string;
  /** Version of the agent at the time the feedback was given (max 100 characters) */
  agentVersion?: string;
  /** Span type (e.g., 'agentRun', 'llm', 'tool', 'retriever') (max 100 characters) */
  spanType?: string;
  /** Optional text comment provided by the user (max 4000 characters) */
  comment?: string;
  /** Optional metadata string associated with the feedback (max 4000 characters) */
  metadata?: string;
  /** Categories to associate with this feedback entry */
  categories?: FeedbackCategoryInput[];
}

/**
 * Options for updating an existing feedback entry
 */
export interface FeedbackUpdateOptions extends FeedbackOptions {
  /** Optional text comment provided by the user (max 4000 characters) */
  comment?: string;
  /** Optional metadata string associated with the feedback (max 4000 characters) */
  metadata?: string;
  /** Categories to associate with this feedback entry */
  categories?: FeedbackCategoryInput[];
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

/**
 * Options for creating a new feedback category
 */
export interface FeedbackCreateCategoryOptions {
  /** Whether the category applies to positive feedback (defaults to true) */
  isPositive?: boolean;
  /** Whether the category applies to negative feedback (defaults to true) */
  isNegative?: boolean;
}

/**
 * Options for deleting a feedback category
 */
export interface FeedbackDeleteCategoryOptions {
  /** When true, deletes the category even if it has associated feedback entries */
  forceDelete?: boolean;
}

/**
 * Options for retrieving feedback categories
 */
export type FeedbackGetCategoriesOptions = PaginationOptions & {
  /** Filter by whether the category applies to positive feedback */
  isPositive?: boolean;
  /** Filter by whether the category applies to negative feedback */
  isNegative?: boolean;
}
