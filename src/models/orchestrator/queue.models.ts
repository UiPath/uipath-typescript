import { QueueGetAllOptions, QueueGetByIdOptions, QueueGetResponse } from './queue.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Queues
 * 
 * Queues are a fundamental component of UiPath automation that enable distributed and scalable processing of work items. [UiPath Queues Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions)
 */
export interface QueueServiceModel {
  /**
   * Gets all queues across folders with optional filtering and folder scoping
   * 
   * @signature getAll(options?) → Promise&lt;QueueGetResponse[]&gt;
   * @param options Query options including optional folderId and pagination options
   * @returns Promise resolving to either an array of queues NonPaginatedResponse<QueueGetResponse> or a PaginatedResponse<QueueGetResponse> when pagination options are used.
   * {@link QueueGetResponse}
   * @example
   * ```typescript
   * // Standard array return
   * const queues = await sdk.queues.getAll();
   * 
   * // Get queues within a specific folder
   * const queues = await sdk.queues.getAll({ 
   *   folderId: <folderId>
   * });
   * 
   * // Get queues with filtering
   * const queues = await sdk.queues.getAll({ 
   *   filter: "name eq 'MyQueue'"
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.queues.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.queues.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.queues.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueGetResponse>
      : NonPaginatedResponse<QueueGetResponse>
  >;

  /**
   * Gets a single queue by ID
   * 
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @returns Promise resolving to a queue definition
   * @example
   * ```typescript
   * // Get queue by ID 
   * const queue = await sdk.queues.getById(<queueId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;
} 