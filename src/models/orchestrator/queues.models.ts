import { QueueGetAllOptions, QueueGetByIdOptions, QueueGetResponse, QueueItemGetAllOptions, QueueItem } from './queues.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Queues
 *
 * Queues are a fundamental component of UiPath automation that enable distributed and scalable processing of work items. [UiPath Queues Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-queues-and-transactions)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Queues } from '@uipath/uipath-typescript/queues';
 *
 * const queues = new Queues(sdk);
 * const allQueues = await queues.getAll();
 * ```
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
   * const allQueues = await queues.getAll();
   *
   * // Get queues within a specific folder
   * const folderQueues = await queues.getAll({
   *   folderId: <folderId>
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
   * const queue = await queues.getById(<queueId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;

  /**
   * Gets queue items with optional filtering and folder scoping
   *
   * @signature getItems(options?) → Promise&lt;QueueItem[]&gt;
   * @param options Query options including optional folderId and pagination options
   * @returns Promise resolving to either an array of queue items NonPaginatedResponse<QueueItem> or a PaginatedResponse<QueueItem> when pagination options are used.
   * {@link QueueItem}
   */
  getItems<T extends QueueItemGetAllOptions = QueueItemGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItem>
      : NonPaginatedResponse<QueueItem>
  >;

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
  addQueueItem(
    folderId: number,
    queueName: string,
    content: Record<string, any>,
    priority?: 'High' | 'Normal' | 'Low',
    reference?: string
  ): Promise<QueueItem>;
}
