import { BaseService } from '../../base';
import {
  FeedbackResponse,
  FeedbackGetAllOptions,
} from '../../../models/conversational-agent/feedback/feedback.types';
import { FeedbackServiceModel } from '../../../models/conversational-agent/feedback/feedback.models';
import { FEEDBACK_ENDPOINTS } from '../../../utils/constants/endpoints';
import { FEEDBACK_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Agent Feedback API
 */
export class FeedbackService extends BaseService implements FeedbackServiceModel {
  /**
   * Gets all feedback across all agents in the tenant, with optional filters
   *
   * @param options - Optional query parameters for filtering and pagination
   * @returns Promise resolving to array of feedback or paginated response
   *
   * @example
   * ```typescript
   * import { Feedback } from '@uipath/uipath-typescript/feedback';
   *
   * const feedback = new Feedback(sdk);
   *
   * // Get all feedback
   * const allFeedback = await feedback.getAll();
   *
   * // First page with pagination
   * const page1 = await feedback.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await feedback.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Feedback.GetAll')
  async getAll<T extends FeedbackGetAllOptions = FeedbackGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FeedbackResponse>
      : NonPaginatedResponse<FeedbackResponse>
  > {
    return PaginationHelpers.getAll<T, FeedbackResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => FEEDBACK_ENDPOINTS.GET_ALL,
      pagination: {
        paginationType: PaginationType.OFFSET,
        paginationParams: {
          pageSizeParam: FEEDBACK_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: FEEDBACK_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: FEEDBACK_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
      excludeFromPrefix: ['agentId', 'agentVersion', 'status', 'traceId', FEEDBACK_OFFSET_PARAMS.OFFSET_PARAM, FEEDBACK_OFFSET_PARAMS.PAGE_SIZE_PARAM],
    }, options);
  }
}
