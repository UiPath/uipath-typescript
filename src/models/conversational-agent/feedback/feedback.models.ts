import type {
  FeedbackResponse,
  FeedbackGetAllOptions,
} from './feedback.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';

/**
 * Service for managing UiPath Agent Feedback.
 *
 * Feedback allows you to collect and manage user feedback on AI agent responses,
 * including positive/negative ratings, comments, and categorized feedback.
 * This is useful for monitoring agent quality, identifying areas for improvement,
 * and building datasets for fine-tuning.
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
   * Gets all feedback with optional filters.
   *
   * Retrieves a list of feedback entries, optionally filtered by agent, trace, span,
   * status, or agent version.
   *
   * @param options - Optional query parameters for filtering and pagination
   * @returns Promise resolving to array of feedback or paginated response
   * {@link FeedbackGetAllOptions}
   * {@link FeedbackResponse}
   * @example
   * ```typescript
   * // Get all feedback
   * const allFeedback = await feedback.getAll();
   *
   * // Get feedback for a specific agent
   * const agentFeedback = await feedback.getAll({
   *   agentId: 'c3d2f644-a1a4-4cb1-90db-d0df5491a8d3',
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
      ? PaginatedResponse<FeedbackResponse>
      : NonPaginatedResponse<FeedbackResponse>
  >;
}
