import type {
  FeedbackGetResponse,
  FeedbackGetAllOptions,
} from './feedback.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';

/**
 * Service for managing UiPath Agent Feedback.
 *
 * Feedback allows you to collect and manage user feedback on AI agent responses,
 * including positive/negative ratings, comments, and categorized feedback.
 * This is useful for monitoring agent quality, identifying areas for improvement,
 * and building datasets for fine-tuning. [Feedback on agent runs](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/agent-traces#feedback-on-agent-runs)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Feedback } from '@uipath/uipath-typescript/feedback';
 *
 * const feedback = new Feedback(sdk);
 * const allFeedback = await feedback.getAll();
 * ```
 */
export interface FeedbackServiceModel {
  /**
   * Gets all feedback across all agents in the tenant, with optional filters.
   *
   * Retrieves a list of feedback entries, optionally filtered by agent, trace, span, status, or agent version.
   * When no pagination options are provided, the API returns its default page size.
   *
   * @param options - Optional query parameters for filtering and pagination
   * @returns Promise resolving to {@link NonPaginatedResponse} of {@link FeedbackGetResponse} without pagination options, or {@link PaginatedResponse} of {@link FeedbackGetResponse} when pagination options are used.
   * @example
   * ```typescript
   * import { Feedback, FeedbackStatus } from '@uipath/uipath-typescript/feedback';
   *
   * // Get all feedback (returns API default page size)
   * const allFeedback = await feedback.getAll();
   *
   * // Get the agentId from a feedback entry
   * const agentId = allFeedback.items[0].agentId;
   *
   * // Get feedback for a specific agent
   * const agentFeedback = await feedback.getAll({
   *   agentId,
   * });
   *
   * // First page with pagination
   * const page1 = await feedback.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await feedback.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Filter by status
   * const activeFeedback = await feedback.getAll({
   *   status: FeedbackStatus.Pending,
   * });
   * ```
   */
  getAll<T extends FeedbackGetAllOptions = FeedbackGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FeedbackGetResponse>
      : NonPaginatedResponse<FeedbackGetResponse>
  >;
}
