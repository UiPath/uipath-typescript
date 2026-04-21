import { BaseService } from '../../base';
import {
  FeedbackGetResponse,
  FeedbackGetAllOptions,
} from '../../../models/agents/feedback/feedback.types';
import { FeedbackServiceModel } from '../../../models/agents/feedback/feedback.models';
import { FeedbackMap } from '../../../models/agents/feedback/feedback.constants';
import { RawFeedbackGetResponse } from '../../../models/agents/feedback/feedback.internal-types';
import { transformData } from '../../../utils/transform';
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
   * Gets all feedback across all agents in the tenant, with optional filters.
   *
   * Retrieves a list of feedback entries, optionally filtered by agent, trace, span, status, or agent version.
   * When no pagination options are provided, the API returns its default page size.
   *
   * @param options - Optional query parameters for filtering and pagination
   * @returns Promise resolving to {@link NonPaginatedResponse} of {@link FeedbackGetResponse} without pagination options, or {@link PaginatedResponse} of {@link FeedbackGetResponse} when pagination options are used.
   * @example
   * ```typescript
   * import { Feedback, FeedbackStatus } from '@uipath/uipath-typescript/feedback';
   *
   * // Get all feedback (default pagination: returns first 50 items)
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
  @track('Feedback.GetAll')
  async getAll<T extends FeedbackGetAllOptions = FeedbackGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FeedbackGetResponse>
      : NonPaginatedResponse<FeedbackGetResponse>
  > {
    const transformFeedbackResponse = (item: RawFeedbackGetResponse): FeedbackGetResponse =>
      transformData(item, FeedbackMap) as unknown as FeedbackGetResponse;

    return PaginationHelpers.getAll<T, RawFeedbackGetResponse, FeedbackGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => FEEDBACK_ENDPOINTS.GET_ALL,
      transformFn: transformFeedbackResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        paginationParams: {
          pageSizeParam: FEEDBACK_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: FEEDBACK_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: FEEDBACK_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
      excludeFromPrefix: Object.keys(options || {}),
    }, options);
  }
}
