import { BaseService } from '../base';
import type { IUiPath } from '../../core/types';
import {
  FeedbackCreateOptions,
  FeedbackResponse,
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
}
