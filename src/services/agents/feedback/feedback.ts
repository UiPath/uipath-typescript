import { BaseService } from '../../base';
import {
  FeedbackResponse,
  FeedbackGetResponse,
  FeedbackGetAllOptions,
  FeedbackOptions,
  FeedbackSubmitOptions,
  FeedbackUpdateOptions,
} from '../../../models/agents/feedback/feedback.types';
import { FeedbackServiceModel } from '../../../models/agents/feedback/feedback.models';
import { FeedbackMap } from '../../../models/agents/feedback/feedback.constants';
import { RawFeedbackResponse } from '../../../models/agents/feedback/feedback.internal-types';
import { transformData } from '../../../utils/transform';
import { FEEDBACK_ENDPOINTS } from '../../../utils/constants/endpoints';
import { FEEDBACK_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_KEY } from '../../../utils/constants/headers';

/**
 * Service for interacting with UiPath Agent Feedback API
 */
export class FeedbackService extends BaseService implements FeedbackServiceModel {
  /**
   * Gets all feedback across all agents in the tenant, with optional filters.
   *
   * Retrieves a list of feedback entries, optionally filtered by agent, trace, span, status, or agent version.
   * When no pagination options are provided, the API returns up to 100 items. When pagination options are provided without a pageSize, the SDK defaults to 50 items per page.
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
    const transformFeedbackResponse = (item: RawFeedbackResponse): FeedbackGetResponse =>
      transformData(item, FeedbackMap) as unknown as FeedbackGetResponse;

    return PaginationHelpers.getAll<T, RawFeedbackResponse, FeedbackGetResponse>({
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

  /**
   * Gets a single feedback entry by its feedback ID.
   *
   * @param id - Feedback ID (GUID) of the feedback entry
   * @param options - Required options including folderKey for folder-level authorization {@link FeedbackOptions}
   * @returns Promise resolving to {@link FeedbackGetResponse}
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
   * const item = await feedback.getById(feedbackId, { folderKey });
   * console.log(item.isPositive, item.comment, item.status);
   * ```
   */
  @track('Feedback.GetById')
  async getById(id: string, options: FeedbackOptions): Promise<FeedbackGetResponse> {
    if (!id) throw new ValidationError({ message: 'Feedback ID is required for getById' });
    if (!options.folderKey) throw new ValidationError({ message: 'folderKey is required for getById' });

    const response = await this.get<RawFeedbackResponse>(
      FEEDBACK_ENDPOINTS.GET_BY_ID(id),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return transformData(response.data, FeedbackMap) as unknown as FeedbackGetResponse;
  }

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
  @track('Feedback.Submit')
  async submit(traceId: string, isPositive: boolean, options: FeedbackSubmitOptions): Promise<FeedbackResponse> {
    if (!traceId) throw new ValidationError({ message: 'traceId is required for submit' });
    if (!options.folderKey) throw new ValidationError({ message: 'folderKey is required for submit' });

    const { folderKey, ...rest } = options;
    const response = await this.post<RawFeedbackResponse>(
      FEEDBACK_ENDPOINTS.SUBMIT,
      { traceId, isPositive, ...rest },
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return transformData(response.data, FeedbackMap) as unknown as FeedbackResponse;
  }

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
  @track('Feedback.UpdateById')
  async updateById(id: string, isPositive: boolean, options: FeedbackUpdateOptions): Promise<FeedbackResponse> {
    if (!id) throw new ValidationError({ message: 'Feedback ID is required for updateById' });
    if (!options.folderKey) throw new ValidationError({ message: 'folderKey is required for updateById' });

    const { folderKey, ...rest } = options;
    const response = await this.post<RawFeedbackResponse>(
      FEEDBACK_ENDPOINTS.UPDATE(id),
      { isPositive, ...rest },
      { headers: createHeaders({ [FOLDER_KEY]: folderKey }) }
    );
    return transformData(response.data, FeedbackMap) as unknown as FeedbackResponse;
  }

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
  @track('Feedback.DeleteById')
  async deleteById(id: string, options: FeedbackOptions): Promise<void> {
    if (!id) throw new ValidationError({ message: 'Feedback ID is required for deleteById' });
    if (!options.folderKey) throw new ValidationError({ message: 'folderKey is required for deleteById' });

    await this.delete(
      FEEDBACK_ENDPOINTS.DELETE(id),
      { headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
  }
}
