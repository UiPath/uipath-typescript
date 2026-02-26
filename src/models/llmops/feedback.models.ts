import type {
  FeedbackCreateOptions,
  FeedbackResponse,
  FeedbackGetAllOptions,
  FeedbackEditOptions,
  FeedbackCategoryCreateOptions,
  FeedbackCategoryResponse,
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
   * Creates new feedback for an agent response.
   *
   * Submits user feedback associated with a specific trace and span from an agent interaction.
   * Feedback can include a positive/negative rating, free-text comment, metadata, and categories.
   *
   * @param feedback - The feedback data to create
   * @returns Promise resolving to the created feedback
   * {@link FeedbackCreateOptions}
   * {@link FeedbackResponse}
   * @example
   * ```typescript
   * // Create positive feedback with a comment
   * const result = await feedback.create({
   *   traceId: 'a4c50af53062e52571fbadebb9a3274a',
   *   spanId: '86638bb028e36681',
   *   agentId: 'c3d2f644-a1a4-4cb1-90db-d0df5491a8d3',
   *   isPositive: true,
   *   comment: 'Great response!',
   * });
   *
   * // Create negative feedback with categories
   * const result = await feedback.create({
   *   traceId: 'a4c50af53062e52571fbadebb9a3274a',
   *   spanId: '86638bb028e36681',
   *   agentId: 'c3d2f644-a1a4-4cb1-90db-d0df5491a8d3',
   *   isPositive: false,
   *   comment: 'Response was inaccurate',
   *   categories: [{ category: 'Accuracy' }],
   * });
   *
   * // Create feedback with metadata and agent version
   * const result = await feedback.create({
   *   traceId: 'a4c50af53062e52571fbadebb9a3274a',
   *   spanId: '86638bb028e36681',
   *   agentId: 'c3d2f644-a1a4-4cb1-90db-d0df5491a8d3',
   *   agentVersion: '1.2.0',
   *   isPositive: true,
   *   metadata: JSON.stringify({ source: 'web-app', sessionId: 'abc123' }),
   * });
   * ```
   */
  create(feedback: FeedbackCreateOptions): Promise<FeedbackResponse>;

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

  /**
   * Gets feedback by ID.
   *
   * Retrieves a single feedback entry by its unique identifier.
   *
   * @param id - The unique identifier of the feedback to retrieve
   * @returns Promise resolving to the feedback
   * {@link FeedbackResponse}
   * @example
   * ```typescript
   * const singleFeedback = await feedback.getById('feedback-uuid');
   * console.log(singleFeedback.isPositive); // true or false
   * console.log(singleFeedback.comment);    // user comment
   * ```
   */
  getById(id: string): Promise<FeedbackResponse>;

  /**
   * Updates existing feedback.
   *
   * Modifies an existing feedback entry. Only the fields provided in the options
   * will be updated; omitted fields remain unchanged.
   *
   * @param id - The unique identifier of the feedback to update
   * @param feedback - The feedback fields to update
   * @returns Promise resolving to the updated feedback
   * {@link FeedbackEditOptions}
   * {@link FeedbackResponse}
   * @example
   * ```typescript
   * // Update the comment on existing feedback
   * const updated = await feedback.update('feedback-uuid', {
   *   comment: 'Updated comment after further review',
   * });
   *
   * // Change rating and add categories
   * const updated = await feedback.update('feedback-uuid', {
   *   isPositive: false,
   *   categories: [{ category: 'Relevance' }, { category: 'Accuracy' }],
   * });
   *
   * // Update metadata
   * const updated = await feedback.update('feedback-uuid', {
   *   metadata: JSON.stringify({ reviewed: true, reviewer: 'admin' }),
   * });
   * ```
   */
  update(id: string, feedback: FeedbackEditOptions): Promise<FeedbackResponse>;

  /**
   * Deletes feedback.
   *
   * Permanently removes a feedback entry by its unique identifier.
   *
   * @param id - The unique identifier of the feedback to delete
   * @returns Promise resolving when deletion is complete
   * @example
   * ```typescript
   * await feedback.deleteFeedback('feedback-uuid');
   * ```
   */
  deleteFeedback(id: string): Promise<void>;

  /**
   * Creates a new feedback category.
   *
   * Feedback categories allow you to organize and classify feedback entries
   * (e.g., "Accuracy", "Relevance", "Helpfulness"). Categories can then be
   * attached to individual feedback entries during creation or update.
   *
   * @param category - The category data to create
   * @returns Promise resolving to the created category
   * {@link FeedbackCategoryCreateOptions}
   * {@link FeedbackCategoryResponse}
   * @example
   * ```typescript
   * // Create a new category
   * const category = await feedback.createCategory({
   *   category: 'Accuracy',
   * });
   * console.log(category.id); // newly created category ID
   *
   * // Create multiple categories
   * const categories = ['Accuracy', 'Relevance', 'Helpfulness'];
   * for (const name of categories) {
   *   await feedback.createCategory({ category: name });
   * }
   * ```
   */
  createCategory(category: FeedbackCategoryCreateOptions): Promise<FeedbackCategoryResponse>;

  /**
   * Gets all feedback categories.
   *
   * Retrieves the complete list of available feedback categories,
   * including both custom and default categories.
   *
   * @returns Promise resolving to array of categories
   * {@link FeedbackCategoryResponse}
   * @example
   * ```typescript
   * const categories = await feedback.getCategories();
   *
   * // List all category names
   * categories.forEach(cat => {
   *   console.log(`${cat.category} (default: ${cat.isDefault})`);
   * });
   *
   * // Find a specific category by name
   * const accuracy = categories.find(cat => cat.category === 'Accuracy');
   * ```
   */
  getCategories(): Promise<FeedbackCategoryResponse[]>;

  /**
   * Deletes a feedback category.
   *
   * Permanently removes a feedback category by its unique identifier.
   * IMPORTANT: Deleting a category will disassociate it from any feedback entries
   * that reference it.
   *
   * @param id - The unique identifier of the category to delete
   * @returns Promise resolving when deletion is complete
   * @example
   * ```typescript
   * await feedback.deleteCategory('category-uuid');
   *
   * // Delete all non-default categories
   * const categories = await feedback.getCategories();
   * for (const cat of categories) {
   *   if (!cat.isDefault) {
   *     await feedback.deleteCategory(cat.id);
   *   }
   * }
   * ```
   */
  deleteCategory(id: string): Promise<void>;
}
