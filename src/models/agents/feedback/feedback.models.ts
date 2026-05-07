import type {
  FeedbackResponse,
  FeedbackCategory,
  FeedbackGetAllOptions,
  FeedbackGetCategoriesOptions,
  FeedbackOptions,
  FeedbackSubmitOptions,
  FeedbackUpdateOptions,
  FeedbackCreateCategoryOptions,
  FeedbackDeleteCategoryOptions,
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
   * When no pagination options are provided, the API returns up to 100 items. When pagination options are provided without a pageSize, the SDK defaults to 50 items per page.
   *
   * @param options - Optional query parameters for filtering and pagination
   * @returns Promise resolving to {@link NonPaginatedResponse} of {@link FeedbackResponse} without pagination options, or {@link PaginatedResponse} of {@link FeedbackResponse} when pagination options are used.
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
      ? PaginatedResponse<FeedbackResponse>
      : NonPaginatedResponse<FeedbackResponse>
  >;

  /**
   * Gets a single feedback entry by its feedback ID.
   *
   * @param id - Feedback ID (GUID) of the feedback entry
   * @param options - Required options including folderKey for folder-level authorization {@link FeedbackOptions}
   * @returns Promise resolving to {@link FeedbackResponse}
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * // First, get feedback entries to obtain the ID and folder key
   * const allFeedback = await feedback.getAll({ pageSize: 10 });
   * const feedbackId = allFeedback.items[0].id;
   * const folderKey = allFeedback.items[0].folderKey;
   *
   * const item = await feedback.getById(feedbackId, { folderKey });
   * console.log(item.isPositive, item.comment, item.status);
   * ```
   */
  getById(id: string, options: FeedbackOptions): Promise<FeedbackResponse>;

  /**
   * Submits a feedback entry.
   *
   * @param traceId - Trace identifier linking feedback to a specific agent execution
   * @param isPositive - Whether the feedback is positive (thumbs up) or negative (thumbs down)
   * @param options - Additional feedback data and folderKey for authorization {@link FeedbackSubmitOptions}
   * @returns Promise resolving to the submitted {@link FeedbackResponse}
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * // Obtain traceId and folderKey from an existing feedback entry
   * const allFeedback = await feedback.getAll({ pageSize: 1 });
   * const traceId = allFeedback.items[0].traceId;
   * const folderKey = allFeedback.items[0].folderKey!;
   *
   * const item = await feedback.submit(traceId, true, { folderKey });
   * console.log(item.id, item.status);
   * ```
   */
  submit(traceId: string, isPositive: boolean, options: FeedbackSubmitOptions): Promise<FeedbackResponse>;

  /**
   * Updates already submitted feedback.
   *
   * @param id - Feedback ID (GUID) of the entry to update
   * @param isPositive - Whether the feedback is positive (thumbs up) or negative (thumbs down)
   * @param options - Updated feedback data and folderKey for authorization {@link FeedbackUpdateOptions}
   * @returns Promise resolving to the updated {@link FeedbackResponse}
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * const allFeedback = await feedback.getAll({ pageSize: 1 });
   * const feedbackId = allFeedback.items[0].id;
   * const folderKey = allFeedback.items[0].folderKey!;
   *
   * const updated = await feedback.updateById(feedbackId, false, {
   *   comment: 'On reflection, not great.',
   *   folderKey,
   * });
   * console.log(updated.isPositive, updated.comment);
   * ```
   */
  updateById(id: string, isPositive: boolean, options: FeedbackUpdateOptions): Promise<FeedbackResponse>;

  /**
   * Deletes a feedback entry by its ID.
   *
   * @param id - Feedback ID (GUID) of the entry to delete
   * @param options - Required options including folderKey for folder-level authorization {@link FeedbackOptions}
   * @returns Promise resolving to void on success
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * const allFeedback = await feedback.getAll({ pageSize: 1 });
   * const feedbackId = allFeedback.items[0].id;
   * const folderKey = allFeedback.items[0].folderKey!;
   *
   * await feedback.deleteById(feedbackId, { folderKey });
   * ```
   */
  deleteById(id: string, options: FeedbackOptions): Promise<void>;

  /**
   * Creates a new feedback category.
   *
   * Custom categories can be used to label feedback entries beyond the default system categories.
   * Once created, reference the category by its `id` when submitting or updating feedback.
   *
   * @param category - Name of the category to create (max 256 characters, unique per tenant)
   * @param options - Whether the category applies to positive and/or negative feedback {@link FeedbackCreateCategoryOptions}
   * @returns Promise resolving to the created {@link FeedbackCategory}
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * const category = await feedback.createCategory('Hallucination', {
   *   isPositive: false,
   *   isNegative: true,
   * });
   * console.log(category.id, category.category);
   * ```
   */
  createCategory(category: string, options: FeedbackCreateCategoryOptions): Promise<FeedbackCategory>;

  /**
   * Gets all feedback categories for the tenant.
   *
   * Returns both system default categories (Output, Agent Error, Agent Plan Execution)
   * and any custom categories created for this tenant.
   * When no pagination options are provided, the API returns up to 100 items. When pagination options are provided without a pageSize, the SDK defaults to 50 items per page.
   *
   * @param options - Optional filters and pagination options {@link FeedbackGetCategoriesOptions}
   * @returns Promise resolving to {@link NonPaginatedResponse} of {@link FeedbackCategory} without pagination options, or {@link PaginatedResponse} of {@link FeedbackCategory} when pagination options are used.
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * // Get all categories
   * const categories = await feedback.getCategories();
   * console.log(categories.items.map(c => c.category));
   *
   * // Get only categories applicable to negative feedback
   * const negativeCategories = await feedback.getCategories({ isNegative: true });
   *
   * // Paginated
   * const page1 = await feedback.getCategories({ pageSize: 10 });
   * ```
   */
  getCategories<T extends FeedbackGetCategoriesOptions = FeedbackGetCategoriesOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FeedbackCategory>
      : NonPaginatedResponse<FeedbackCategory>
  >;

  /**
   * Deletes a feedback category by its ID.
   *
   * Default system categories cannot be deleted. Use `forceDelete` to delete a category
   * that already has feedback entries associated with it.
   *
   * @param id - Category ID (GUID) of the category to delete
   * @param options - Optional deletion options {@link FeedbackDeleteCategoryOptions}
   * @returns Promise resolving to void on success
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * // Get categories to obtain the ID of the one to delete
   * const categories = await feedback.getCategories();
   * const customCategory = categories.find(c => !c.isDefault);
   * if (customCategory) {
   *   await feedback.deleteCategory(customCategory.id);
   * }
   * ```
   */
  deleteCategory(id: string, options?: FeedbackDeleteCategoryOptions): Promise<void>;
}
