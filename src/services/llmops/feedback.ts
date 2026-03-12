import { BaseService } from '../base';
import {
  FeedbackResponse,
  FeedbackGetAllOptions,
} from '../../models/llmops/feedback.types';
import { FeedbackServiceModel } from '../../models/llmops/feedback.models';
import { FEEDBACK_ENDPOINTS } from '../../utils/constants/endpoints';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with UiPath LLMOps Feedback API
 */
export class FeedbackService extends BaseService implements FeedbackServiceModel {
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
}
