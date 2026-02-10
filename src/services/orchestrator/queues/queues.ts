import { FolderScopedService } from '../../folder-scoped';
import {
  QueueGetResponse,
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueItem,
  QueueItemPayload,
  QueueItemGetAllOptions
} from '../../../models/orchestrator/queues.types';
import { QueueServiceModel } from '../../../models/orchestrator/queues.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { QueueMap, QueueItemMap } from '../../../models/orchestrator/queues.constants';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Queues API
 */
export class QueueService extends FolderScopedService implements QueueServiceModel {
  /**
   * Gets all queues across folders with optional filtering and folder scoping
   * 
   * The method returns either:
   * - An array of queues (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of queues or paginated result
   * 
   * @example
   * ```typescript
   * import { Queues } from '@uipath/uipath-typescript/queues';
   *
   * const queues = new Queues(sdk);
   *
   * // Standard array return
   * const allQueues = await queues.getAll();
   *
   * // Get queues within a specific folder
   * const folderQueues = await queues.getAll({
   *   folderId: 123
   * });
   *
   * // Get queues with filtering
   * const filteredQueues = await queues.getAll({
   *   filter: "name eq 'MyQueue'"
   * });
   *
   * // First page with pagination
   * const page1 = await queues.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await queues.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await queues.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  @track('Queues.GetAll')
  async getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<QueueGetResponse>
    : NonPaginatedResponse<QueueGetResponse>
  > {
    // Transformation function for queues
    const transformQueueResponse = (queue: any) =>
      transformData(pascalToCamelCaseKeys(queue) as QueueGetResponse, QueueMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: (folderId) => folderId ? QUEUE_ENDPOINTS.GET_BY_FOLDER : QUEUE_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: QUEUE_ENDPOINTS.GET_BY_FOLDER,
      transformFn: transformQueueResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, options) as any;
  }

  /**
   * Gets a single queue by ID
   * 
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @returns Promise resolving to a queue definition
   * 
   * @example
   * ```typescript
   * import { Queues } from '@uipath/uipath-typescript/queues';
   *
   * const queues = new Queues(sdk);
   *
   * // Get queue by ID
   * const queue = await queues.getById(123, 456);
   * ```
   */
  @track('Queues.GetById')
  async getById(id: number, folderId: number, options: QueueGetByIdOptions = {}): Promise<QueueGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<QueueGetResponse>(
      QUEUE_ENDPOINTS.GET_BY_ID(id),
      {
        headers,
        params: apiOptions
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data) as QueueGetResponse, QueueMap);
  }

  /**
   * Gets queue items with optional filtering and folder scoping
   *
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of queue items or paginated result
   */
  @track('Queues.GetItems')
  async getItems<T extends QueueItemGetAllOptions = QueueItemGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItem>
      : NonPaginatedResponse<QueueItem>
  > {
    const transformQueueItemResponse = (queueItem: any) =>
      transformData(pascalToCamelCaseKeys(queueItem) as QueueItem, QueueItemMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => QUEUE_ENDPOINTS.GET_ITEMS,
      getByFolderEndpoint: QUEUE_ENDPOINTS.GET_ITEMS,
      transformFn: transformQueueItemResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, options) as any;
  }

  /**
   * Adds a new item to a queue
   *
   * @param folderId - Required folder ID
   * @param queueName - The name of the queue
   * @param content - The specific data for the item
   * @param priority - Optional priority (High, Normal, Low)
   * @param reference - Optional reference string
   * @returns Promise resolving to the created Queue Item
   */
  @track('Queues.AddQueueItem')
  async addQueueItem(
    folderId: number,
    queueName: string,
    content: Record<string, any>,
    priority: 'High' | 'Normal' | 'Low' = 'Normal',
    reference?: string
  ): Promise<QueueItem> {
    const payload: QueueItemPayload = {
      itemData: {
        Name: queueName,
        Priority: priority,
        SpecificContent: content,
        Reference: reference
      }
    };

    const response = await this.post<QueueItem>(
      QUEUE_ENDPOINTS.ADD_ITEM,
      payload,
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data) as QueueItem, QueueItemMap);
  }
}
