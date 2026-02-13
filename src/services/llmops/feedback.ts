import { BaseService } from '../base';
import type { IUiPath } from '../../core/types';
import {
  FeedbackCreateOptions,
  FeedbackResponse,
  FeedbackGetAllOptions,
  FeedbackEditOptions,
  FeedbackCategoryCreateOptions,
  FeedbackCategoryResponse,
} from '../../models/llmops/feedback.types';
import { FeedbackServiceModel } from '../../models/llmops/feedback.models';
import { FEEDBACK_ENDPOINTS } from '../../utils/constants/endpoints';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with UiPath LLMOps Feedback API
 */
export class FeedbackService extends BaseService implements FeedbackServiceModel {
  /**
   * Creates an instance of the Feedback service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
  }

  /**
   * Creates new feedback
   *
   * @param feedback - The feedback data to create
   * @returns Promise resolving to the created feedback
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * const result = await feedback.create({
   *   traceId: "trace-123",
   *   spanId: "span-456",
   *   agentId: "agent-789",
   *   isPositive: true,
   *   comment: "Great response!",
   *   categories: [{ category: "Helpful" }]
   * });
   * ```
   */
  @track('Feedback.Create')
  async create(feedback: FeedbackCreateOptions): Promise<FeedbackResponse> {
    const response = await this.post<FeedbackResponse>(
      FEEDBACK_ENDPOINTS.CREATE,
      feedback
    );
    return response.data;
  }

  /**
   * Gets all feedback with optional filters
   *
   * @param options - Optional query parameters for filtering
   * @returns Promise resolving to array of feedback
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * const allFeedback = await feedback.getAll({
   *   skip: 0,
   *   take: 100,
   *   agentId: "agent-789"
   * });
   * ```
   */
  @track('Feedback.GetAll')
  async getAll(options?: FeedbackGetAllOptions): Promise<FeedbackResponse[]> {
    const response = await this.get<FeedbackResponse[]>(
      FEEDBACK_ENDPOINTS.GET_ALL,
      { params: options }
    );
    return response.data;
  }

  /**
   * Gets feedback by ID
   *
   * @param id - Feedback ID
   * @returns Promise resolving to the feedback
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * const result = await feedback.getById("feedback-id");
   * ```
   */
  @track('Feedback.GetById')
  async getById(id: string): Promise<FeedbackResponse> {
    const response = await this.get<FeedbackResponse>(
      FEEDBACK_ENDPOINTS.GET_BY_ID(id)
    );
    return response.data;
  }

  /**
   * Updates existing feedback
   *
   * @param id - Feedback ID
   * @param feedback - The feedback data to update
   * @returns Promise resolving to the updated feedback
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * const updated = await feedback.update("feedback-id", {
   *   comment: "Updated comment",
   *   isPositive: false
   * });
   * ```
   */
  @track('Feedback.Update')
  async update(id: string, feedback: FeedbackEditOptions): Promise<FeedbackResponse> {
    const response = await this.post<FeedbackResponse>(
      FEEDBACK_ENDPOINTS.UPDATE(id),
      feedback
    );
    return response.data;
  }

  /**
   * Deletes feedback
   *
   * @param id - Feedback ID
   * @returns Promise resolving when deletion is complete
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * await feedback.deleteFeedback("feedback-id");
   * ```
   */
  @track('Feedback.Delete')
  async deleteFeedback(id: string): Promise<void> {
    await super.delete(FEEDBACK_ENDPOINTS.DELETE(id));
  }

  /**
   * Creates a new feedback category
   *
   * @param category - The category data to create
   * @returns Promise resolving to the created category
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * const category = await feedback.createCategory({
   *   category: "Helpful"
   * });
   * ```
   */
  @track('Feedback.CreateCategory')
  async createCategory(category: FeedbackCategoryCreateOptions): Promise<FeedbackCategoryResponse> {
    const response = await this.post<FeedbackCategoryResponse>(
      FEEDBACK_ENDPOINTS.CREATE_CATEGORY,
      category
    );
    return response.data;
  }

  /**
   * Gets all feedback categories
   *
   * @returns Promise resolving to array of categories
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * const categories = await feedback.getCategories();
   * ```
   */
  @track('Feedback.GetCategories')
  async getCategories(): Promise<FeedbackCategoryResponse[]> {
    const response = await this.get<FeedbackCategoryResponse[]>(
      FEEDBACK_ENDPOINTS.GET_CATEGORIES
    );
    return response.data;
  }

  /**
   * Deletes a feedback category
   *
   * @param id - Category ID
   * @returns Promise resolving when deletion is complete
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   * await feedback.deleteCategory("category-id");
   * ```
   */
  @track('Feedback.DeleteCategory')
  async deleteCategory(id: string): Promise<void> {
    await super.delete(FEEDBACK_ENDPOINTS.DELETE_CATEGORY(id));
  }
}
