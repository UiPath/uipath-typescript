import type {
  FeedbackCreateOptions,
  FeedbackResponse,
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
}
