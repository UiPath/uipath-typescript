import { FolderScopedService } from '../folder-scoped-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse, NonPaginatedResponse } from '../../models/common/common-types';
import { 
  QueueGetResponse, 
  QueueGetAllOptions, 
  QueueGetByIdOptions
} from '../../models/orchestrator/queue.types';
import { QueueServiceModel } from '../../models/orchestrator/queue.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ID } from '../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION } from '../../utils/constants/common';
import { PaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/pagination-helpers';
import { PaginationType } from '../../utils/pagination/pagination.internal-types';
import { QueueMap } from '../../models/orchestrator/queues.constants';

/**
 * Service for interacting with UiPath Orchestrator Queues API
 */
export class QueueService extends FolderScopedService implements QueueServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

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
   * // Standard array return
   * const queues = await sdk.queue.getAll();
   * 
   * // Get queues within a specific folder
   * const queues = await sdk.queue.getAll({ 
   *   folderId: 123
   * });
   * 
   * // Get queues with filtering
   * const queues = await sdk.queue.getAll({ 
   *   filter: "name eq 'MyQueue'"
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.queue.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.queue.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.queue.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  async getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueGetResponse>
      : NonPaginatedResponse<QueueGetResponse>
  > {
    const { folderId, ...restOptions } = options || {};
    const cursor = options?.cursor;
    const pageSize = options?.pageSize;
    const jumpToPage = options?.jumpToPage;
    
    // Determine if pagination is requested
    const isPaginationRequested = PaginationHelpers.hasPaginationParameters(options || {});
    
    // Use the transformation function for queues
    const transformQueue = (queue: any) => 
      transformData(pascalToCamelCaseKeys(queue) as QueueGetResponse, QueueMap);
    
    // Paginated flow
    if (isPaginationRequested) {
      return PaginationHelpers.getAllPaginated<any, QueueGetResponse>({
        serviceAccess: this.createPaginationServiceAccess(),
        getEndpoint: (folderId) => folderId ? QUEUE_ENDPOINTS.GET_BY_FOLDER : QUEUE_ENDPOINTS.GET_ALL,
        folderId,
        paginationParams: cursor ? { cursor, pageSize } : jumpToPage ? { jumpToPage, pageSize } : { pageSize },
        additionalParams: restOptions,
        transformFn: transformQueue,
        options: {
          paginationType: PaginationType.ODATA,
          itemsField: ODATA_PAGINATION.ITEMS_FIELD,
          totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD
        }
      }) as any; // Type assertion needed due to conditional return
    }
    
    // Non-paginated flow
    return PaginationHelpers.getAllNonPaginated<any, QueueGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getAllEndpoint: QUEUE_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: QUEUE_ENDPOINTS.GET_BY_FOLDER,
      folderId,
      additionalParams: restOptions,
      transformFn: transformQueue,
      options: {
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD
      }
    }) as any;
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
   * // Get queue by ID 
   * const queue = await sdk.queue.getById(123, 456);
   * ```
   */
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
}
