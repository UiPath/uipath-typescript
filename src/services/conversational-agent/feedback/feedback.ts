import { BaseService } from '../../base';
import {
  FeedbackResponse,
  FeedbackGetAllOptions,
} from '../../../models/conversational-agent/feedback/feedback.types';
import { FeedbackServiceModel } from '../../../models/conversational-agent/feedback/feedback.models';
import { FEEDBACK_ENDPOINTS } from '../../../utils/constants/endpoints';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { PaginationManager } from '../../../utils/pagination/pagination-manager';
import { getLimitedPageSize } from '../../../utils/pagination/constants';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Agent Feedback API
 */
export class FeedbackService extends BaseService implements FeedbackServiceModel {
  /**
   * Gets all feedback with optional filters
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
    const { pageSize, cursor, jumpToPage, ...filterOptions } = options || {} as any;
    const isPaginated = PaginationHelpers.hasPaginationParameters(options || {});

    if (isPaginated) {
      const paginationOptions = { pageSize, cursor, jumpToPage };
      const params = PaginationHelpers.validatePaginationOptions(paginationOptions, PaginationType.OFFSET);
      const limitedPageSize = getLimitedPageSize(params.pageSize);
      const currentPage = params.pageNumber || 1;
      const skip = (currentPage - 1) * limitedPageSize;

      const response = await this.get<FeedbackResponse[]>(
        FEEDBACK_ENDPOINTS.GET_ALL,
        { params: { ...filterOptions, skip, take: limitedPageSize } }
      );

      const items = response.data || [];
      const hasMore = items.length === limitedPageSize;

      return PaginationManager.createPaginatedResponse<FeedbackResponse>(
        {
          pageInfo: {
            hasMore,
            currentPage,
            pageSize: limitedPageSize,
          },
          type: PaginationType.OFFSET,
        },
        items
      ) as any;
    }

    const response = await this.get<FeedbackResponse[]>(
      FEEDBACK_ENDPOINTS.GET_ALL,
      { params: filterOptions }
    );

    return {
      items: response.data || [],
    } as any;
  }
}
