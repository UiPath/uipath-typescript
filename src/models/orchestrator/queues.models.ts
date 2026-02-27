import {
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueGetResponse,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  QueueItemResponse,
  TransactionItemResponse,
  TransactionCompletionOptions,
  TransactionCompletionResponse
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
   * @param id Queue ID
   * @param folderId Required folder ID
   * @param options Query options
   * @returns Promise resolving to a queue definition
   * @example
   * ```typescript
   * const queue = await queues.getById(<queueId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;

  /**
   * Gets all items for a queue by queue ID.
   *
   * @param queueId Required queue ID
   * @param folderId Required folder ID
   * @param options Query options including filtering and pagination
   * @returns Promise resolving to queue items
   * @example
   * ```typescript
   * const queueItems = await queues.getAllItems(<queueId>, <folderId>, {
   *   pageSize: 10,
   *   filter: "status eq 'New'"
   * });
   * ```
   */
  getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(
    queueId: number,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  >;

  /**
   * Gets all items for a queue by queue name.
   *
   * @param queueName Required queue name
   * @param folderId Required folder ID
   * @param options Query options including filtering and pagination
   * @returns Promise resolving to queue items
   * @example
   * ```typescript
   * const queueItems = await queues.getAllItemsByName('InvoiceQueue', <folderId>, {
   *   pageSize: 10
   * });
   * ```
   */
  getAllItemsByName<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(
    queueName: string,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  >;

  /**
   * Inserts a new item into a queue by queue ID.
   *
   * @param queueId Required queue ID
   * @param folderId Required folder ID
   * @param content Work item payload persisted in queue item content
   * @param options Optional queue item metadata (priority, reference, due/defer/progress)
   * @returns Promise resolving to the created queue item
   */
  insertItem(
    queueId: number,
    folderId: number,
    content: Record<string, unknown>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItemResponse>;

  /**
   * Inserts a new item into a queue by queue name.
   *
   * @param queueName Required queue name
   * @param folderId Required folder ID
   * @param content Work item payload persisted in queue item content
   * @param options Optional queue item metadata (priority, reference, due/defer/progress)
   * @returns Promise resolving to the created queue item
   */
  insertItemByName(
    queueName: string,
    folderId: number,
    content: Record<string, unknown>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItemResponse>;

  /**
   * Starts processing by acquiring the next transaction item by queue ID.
   *
   * @param queueId Required queue ID
   * @param folderId Required folder ID
   * @returns Promise resolving to the acquired transaction item
   */
  startTransaction(queueId: number, folderId: number): Promise<TransactionItemResponse>;

  /**
   * Starts processing by acquiring the next transaction item by queue name.
   *
   * @param queueName Required queue name
   * @param folderId Required folder ID
   * @returns Promise resolving to the acquired transaction item
   */
  startTransactionByName(queueName: string, folderId: number): Promise<TransactionItemResponse>;

  /**
   * Completes a transaction item by item ID.
   *
   * @param itemId Queue item ID
   * @param folderId Required folder ID
   * @param options Completion options
   * @returns Promise resolving to a completion response object
   * @example
   * ```typescript
   * await queues.completeTransaction(<itemId>, <folderId>, {
   *   isSuccessful: true,
   *   output: { completed: true }
   * });
   * ```
   */
  completeTransaction(
    itemId: number,
    folderId: number,
    options: TransactionCompletionOptions
  ): Promise<TransactionCompletionResponse>;

  /**
   * Completes a transaction item by queue name and item ID.
   *
   * @param queueName Queue name
   * @param itemId Queue item ID
   * @param folderId Required folder ID
   * @param options Completion options
   * @returns Promise resolving to a completion response object
   */
  completeTransactionByName(
    queueName: string,
    itemId: number,
    folderId: number,
    options: TransactionCompletionOptions
  ): Promise<TransactionCompletionResponse>;
}
