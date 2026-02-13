import type {
  FeedbackCreateOptions,
  FeedbackResponse,
  FeedbackGetAllOptions,
  FeedbackEditOptions,
  FeedbackCategoryCreateOptions,
  FeedbackCategoryResponse,
} from './feedback.types';

/**
 * Service Model Interface for Feedback Service
 * Defines the contract that the FeedbackService must implement
 */
export interface FeedbackServiceModel {
  /**
   * Creates new feedback
   * @param feedback - The feedback data to create
   * @returns Promise resolving to the created feedback
   */
  create(feedback: FeedbackCreateOptions): Promise<FeedbackResponse>;

  /**
   * Gets all feedback with optional filters
   * @param options - Optional query parameters for filtering
   * @returns Promise resolving to array of feedback
   */
  getAll(options?: FeedbackGetAllOptions): Promise<FeedbackResponse[]>;

  /**
   * Gets feedback by ID
   * @param id - Feedback ID
   * @returns Promise resolving to the feedback
   */
  getById(id: string): Promise<FeedbackResponse>;

  /**
   * Updates existing feedback
   * @param id - Feedback ID
   * @param feedback - The feedback data to update
   * @returns Promise resolving to the updated feedback
   */
  update(id: string, feedback: FeedbackEditOptions): Promise<FeedbackResponse>;

  /**
   * Deletes feedback
   * @param id - Feedback ID
   * @returns Promise resolving when deletion is complete
   */
  deleteFeedback(id: string): Promise<void>;

  /**
   * Creates a new feedback category
   * @param category - The category data to create
   * @returns Promise resolving to the created category
   */
  createCategory(category: FeedbackCategoryCreateOptions): Promise<FeedbackCategoryResponse>;

  /**
   * Gets all feedback categories
   * @returns Promise resolving to array of categories
   */
  getCategories(): Promise<FeedbackCategoryResponse[]>;

  /**
   * Deletes a feedback category
   * @param id - Category ID
   * @returns Promise resolving when deletion is complete
   */
  deleteCategory(id: string): Promise<void>;
}
