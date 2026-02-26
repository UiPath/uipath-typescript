import type {
  FeedbackResponse,
  FeedbackGetAllOptions,
} from './feedback.types';

/**
 * Service for managing UiPath LLMOps Feedback.
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
   * status, or agent version. Supports pagination via `skip` and `take` parameters.
   *
   * @param options - Optional query parameters for filtering and pagination
   * @returns Promise resolving to array of feedback
   * {@link FeedbackGetAllOptions}
   * {@link FeedbackResponse}
   * @example
   * ```typescript
   * // Get all feedback (default pagination)
   * const allFeedback = await feedback.getAll();
   *
   * // Get feedback for a specific agent
   * const agentFeedback = await feedback.getAll({
   *   agentId: 'c3d2f644-a1a4-4cb1-90db-d0df5491a8d3',
   * });
   *
   * // Get feedback for a specific trace and span
   * const traceFeedback = await feedback.getAll({
   *   traceId: 'a4c50af53062e52571fbadebb9a3274a',
   *   spanId: '86638bb028e36681',
   * });
   *
   * // Paginate through feedback
   * const page1 = await feedback.getAll({ skip: 0, take: 10 });
   * const page2 = await feedback.getAll({ skip: 10, take: 10 });
   *
   * // Filter by status
   * const activeFeedback = await feedback.getAll({
   *   status: FeedbackStatus.Active,
   * });
   * ```
   */
  getAll(options?: FeedbackGetAllOptions): Promise<FeedbackResponse[]>;
}
