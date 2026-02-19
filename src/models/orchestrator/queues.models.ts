import {
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueGetResponse,
  QueueItemQueryOptions,
  QueueItemInsertOptions,
  QueueItemResponse,
  TransactionItemResponse,
  TransactionResult
} from './queues.types';
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
   * Gets queue items for a specific queue in a folder.
   *
   * @param queueId Required queue ID
   * @param folderId - Required folder ID
   * @param options Query options including filtering and pagination
   * @returns Promise resolving to either an array of queue items NonPaginatedResponse<QueueItemResponse> or a PaginatedResponse<QueueItemResponse> when pagination options are used.
   * @example
   * ```typescript
   * const queueItems = await queues.getQueueItems(<queueId>, <folderId>, {
   *   pageSize: 10,
   *   filter: "status eq 'New'"
   * });
   * ```
   */
  getQueueItems<T extends QueueItemQueryOptions = QueueItemQueryOptions>(
    queueId: number,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  >;

  /**
   * Inserts a new item into a queue.
   *
   * @param queueName The queue name
   * @param folderId Required folder ID
   * @param content The work item payload to persist in queue item content
   * @param options Optional queue item metadata (priority, reference, due/defer/progress)
   * @returns Promise resolving to the created Queue Item
   * @example
   * ```typescript
   * const queueItem = await queues.insertQueueItem(
   *   'InvoiceQueue',
   *   12345,
   *   { invoiceNumber: 'INV-1001', amount: 1500 },
   *   { priority: 'High', reference: 'INV-1001' }
   * );
   * ```
   */
  insertQueueItem(
    queueName: string,
    folderId: number,
    content: Record<string, any>,
    options?: QueueItemInsertOptions
  ): Promise<QueueItemResponse>;

  /**
   * Starts processing by acquiring the next transaction item from a queue.
   *
   * @param queueName Queue name
   * @param folderId Required folder ID
   * @returns Promise resolving to the acquired transaction item
   * @example
   * ```typescript
   * const transaction = await queues.startTransaction('InvoiceQueue', <folderId>);
   * ```
   */
  startTransaction(queueName: string, folderId: number): Promise<TransactionItemResponse>;

  /**
   * Sets the processing result for a queue transaction item.
   *
   * @param folderId Required folder ID
   * @param queueItemId Queue item ID
   * @param transactionResult Transaction result payload
   * @example
   * ```typescript
   * await queues.setTransactionResult(<folderId>, <queueItemId>, {
   *   isSuccessful: true,
   *   output: { completed: true }
   * });
   * ```
   */
  setTransactionResult(
    folderId: number,
    queueItemId: number,
    transactionResult: TransactionResult
  ): Promise<void>;
}
