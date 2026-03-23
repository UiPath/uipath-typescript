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

type QueueMethodHandlers = {
  getAllItems: <T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(options?: T) => Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  >;
  insertItem: (
    specificData: Record<string, unknown>,
    options?: QueueInsertItemOptions
  ) => Promise<QueueItemResponse>;
  startTransaction: () => Promise<TransactionItemResponse>;
  completeTransaction: (
    itemId: number,
    options: TransactionCompletionOptions
  ) => Promise<TransactionCompletionResponse>;
};

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
   * @returns Promise resolving to either an array of queues with bound queue methods or a paginated response when pagination options are used.
   * {@link QueueWithMethods}
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
      ? PaginatedResponse<QueueWithMethods>
      : NonPaginatedResponse<QueueWithMethods>
  >;

  /**
   * Gets a single queue by ID
   *
   * @param id Queue ID
   * @param folderId Required folder ID
   * @param options Query options
   * @returns Promise resolving to a queue definition with bound queue methods
   * {@link QueueWithMethods}
   * @example
   * ```typescript
   * const queue = await queues.getById(<queueId>, <folderId>);
   * const items = await queue.getAllItems();
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueWithMethods>;

  /**
   * Gets all items for a queue by queue ID.
   *
   * @param queueId Required queue ID
   * @param folderId Required folder ID
   * @param options Query options including filtering and pagination
   * @returns Promise resolving to queue items
   * {@link QueueItemResponse}
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

}

/**
 * Queue methods interface - operations bound to a queue returned by getAll/getById.
 */
export interface QueueMethods {
  /**
   * Gets queue items for this queue.
   *
   * @param options Query options including filtering and pagination
   * @returns Promise resolving to queue items
   * {@link QueueItemResponse}
   */
  getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  >;

  /**
   * Inserts a new item into this queue.
   *
   * @param specificData Work item payload persisted to the Orchestrator
   * `SpecificContent` field and exposed by the SDK as `specificData`
   * @param options Optional queue item metadata
   * @returns Promise resolving to the created queue item
   * {@link QueueItemResponse}
   * @example
   * ```typescript
   * const queue = await queues.getById(<queueId>, <folderId>);
   *
   * const item = await queue.insertItem({
   *   invoiceNumber: 'INV-1001',
   *   amount: 1500
   * }, {
   *   reference: 'INV-1001'
   * });
   *
   * console.log(item.specificData.invoiceNumber);
   * ```
   */
  insertItem(
    specificData: Record<string, unknown>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItemResponse>;

  /**
   * Starts processing by acquiring the next transaction item from this queue.
   *
   * @returns Promise resolving to the acquired transaction item
   * {@link TransactionItemResponse}
   * @example
   * ```typescript
   * const queue = await queues.getById(<queueId>, <folderId>);
   * const transaction = await queue.startTransaction();
   *
   * console.log(transaction.specificData);
   * ```
   */
  startTransaction(): Promise<TransactionItemResponse>;

  /**
   * Completes a transaction item in this queue.
   *
   * @param itemId Queue item ID
   * @param options Completion options
   * @returns Promise resolving to a completion response object
   * {@link TransactionCompletionResponse}
   * @example
   * ```typescript
   * const queue = await queues.getById(<queueId>, <folderId>);
   *
   * await queue.completeTransaction(<itemId>, {
   *   isSuccessful: true,
   *   outputData: { completed: true }
   * });
   * ```
   */
  completeTransaction(
    itemId: number,
    options: TransactionCompletionOptions
  ): Promise<TransactionCompletionResponse>;
}

/**
 * Queue metadata combined with queue-bound helper methods.
 */
export type QueueWithMethods = QueueGetResponse & QueueMethods;

function createQueueMethods(queueData: QueueGetResponse, handlers: QueueMethodHandlers): QueueMethods {
  return {
    async getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(options?: T): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<QueueItemResponse>
        : NonPaginatedResponse<QueueItemResponse>
    > {
      if (queueData.id === undefined) throw new Error('Queue ID is undefined');
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');

      return handlers.getAllItems(options) as any;
    },

    async insertItem(
      specificData: Record<string, unknown>,
      options?: QueueInsertItemOptions
    ): Promise<QueueItemResponse> {
      if (!queueData.name) throw new Error('Queue name is undefined');
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');

      return handlers.insertItem(specificData, options);
    },

    async startTransaction(): Promise<TransactionItemResponse> {
      if (!queueData.name) throw new Error('Queue name is undefined');
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');

      return handlers.startTransaction();
    },

    async completeTransaction(
      itemId: number,
      options: TransactionCompletionOptions
    ): Promise<TransactionCompletionResponse> {
      if (queueData.id === undefined) throw new Error('Queue ID is undefined');
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');

      return handlers.completeTransaction(itemId, options);
    }
  };
}

export function createQueueWithMethods(
  queueData: QueueGetResponse,
  handlers: QueueMethodHandlers
): QueueWithMethods {
  return Object.assign({}, queueData, createQueueMethods(queueData, handlers)) as QueueWithMethods;
}
