import { BaseService } from '../../base';
import {
  FeedbackResponse,
  FeedbackCategoryResponse,
  FeedbackGetAllOptions,
  FeedbackGetCategoriesOptions,
  FeedbackOptions,
  FeedbackSubmitOptions,
  FeedbackUpdateOptions,
  FeedbackCreateCategoryOptions,
  FeedbackDeleteCategoryOptions,
} from '../../../models/agents/feedback/feedback.types';
import { FeedbackServiceModel } from '../../../models/agents/feedback/feedback.models';
import { FeedbackMap } from '../../../models/agents/feedback/feedback.constants';
import { RawFeedbackResponse, RawFeedbackCategory } from '../../../models/agents/feedback/feedback.internal-types';
import { transformData } from '../../../utils/transform';
import { FEEDBACK_ENDPOINTS } from '../../../utils/constants/endpoints';
import { FEEDBACK_OFFSET_PARAMS, FEEDBACK_CATEGORY_PAGINATION } from '../../../utils/constants/common';
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
  @track('Feedback.GetAll')
  async getAll<T extends FeedbackGetAllOptions = FeedbackGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FeedbackResponse>
      : NonPaginatedResponse<FeedbackResponse>
  > {
    const transformFeedbackResponse = (item: RawFeedbackResponse): FeedbackResponse =>
      transformData(item, FeedbackMap) as unknown as FeedbackResponse;

    return PaginationHelpers.getAll<T, RawFeedbackResponse, FeedbackResponse>({
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

  @track('Feedback.GetById')
  async getById(id: string, options: FeedbackOptions): Promise<FeedbackResponse> {
    if (!id) throw new ValidationError({ message: 'Feedback ID is required for getById' });
    if (!options.folderKey) throw new ValidationError({ message: 'folderKey is required for getById' });

    const response = await this.get<RawFeedbackResponse>(
      FEEDBACK_ENDPOINTS.GET_BY_ID(id),
      { headers: createHeaders({ [FOLDER_KEY]: options?.folderKey }) }
    );
    return transformData(response.data, FeedbackMap) as unknown as FeedbackResponse;
  }

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

  @track('Feedback.DeleteById')
  async deleteById(id: string, options: FeedbackOptions): Promise<void> {
    if (!id) throw new ValidationError({ message: 'Feedback ID is required for deleteById' });
    if (!options.folderKey) throw new ValidationError({ message: 'folderKey is required for deleteById' });

    await this.delete(
      FEEDBACK_ENDPOINTS.DELETE(id),
      { headers: createHeaders({ [FOLDER_KEY]: options.folderKey }) }
    );
  }

  @track('Feedback.CreateCategory')
  async createCategory(category: string, options?: FeedbackCreateCategoryOptions): Promise<FeedbackCategoryResponse> {
    if (!category) throw new ValidationError({ message: 'category name is required for createCategory' });

    const body: Record<string, unknown> = { category };
    if (options?.isPositive !== undefined) body.isPositive = options.isPositive;
    if (options?.isNegative !== undefined) body.isNegative = options.isNegative;

    const response = await this.post<RawFeedbackCategory>(
      FEEDBACK_ENDPOINTS.CATEGORY.CREATE,
      body
    );
    return transformData(response.data, FeedbackMap) as unknown as FeedbackCategoryResponse;
  }

  @track('Feedback.GetCategories')
  async getCategories<T extends FeedbackGetCategoriesOptions = FeedbackGetCategoriesOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FeedbackCategoryResponse>
      : NonPaginatedResponse<FeedbackCategoryResponse>
  > {
    const transformCategory = (item: RawFeedbackCategory): FeedbackCategoryResponse =>
      transformData(item, FeedbackMap) as unknown as FeedbackCategoryResponse;

    return PaginationHelpers.getAll<T, RawFeedbackCategory, FeedbackCategoryResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => FEEDBACK_ENDPOINTS.CATEGORY.GET_ALL,
      transformFn: transformCategory,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: FEEDBACK_CATEGORY_PAGINATION.ITEMS_FIELD,
        totalCountField: FEEDBACK_CATEGORY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: FEEDBACK_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: FEEDBACK_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: FEEDBACK_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
      excludeFromPrefix: Object.keys(options || {}),
    }, options);
  }

  @track('Feedback.DeleteCategory')
  async deleteCategory(id: string, options?: FeedbackDeleteCategoryOptions): Promise<void> {
    if (!id) throw new ValidationError({ message: 'Category ID is required for deleteCategory' });

    const params = options?.forceDelete !== undefined ? { forceDelete: options.forceDelete } : undefined;
    await this.delete(
      FEEDBACK_ENDPOINTS.CATEGORY.DELETE(id),
      { params }
    );
  }
}
