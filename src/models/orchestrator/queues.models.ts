import {
  QueueGetAllOptions,
  QueueGetByIdOptions,
  RawQueueGetResponse,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  QueueItem,
  QueueItemValue
} from './queues.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/** Combined response type for queue data with bound methods. */
export type QueueGetResponse = RawQueueGetResponse & QueueMethods;

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
   * @returns Promise resolving to either a {@link QueueGetResponse} array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueGetResponse>` when pagination options are used. Each queue has methods attached for operating on its items.
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
   * @returns Promise resolving to a {@link QueueGetResponse} — the queue definition with methods attached for operating on its items
   * @example
   * ```typescript
   * // Get queue by ID
   * const queue = await queues.getById(<queueId>, <folderId>);
   *
   * // Operate on the queue directly via the attached methods
   * const items = await queue.getAllItems();
   * const item = await queue.insertItem({
   *   invoiceId: 'INV-1001',
   *   amount: 1520
   * });
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;

  /**
   * Gets the items of a queue with optional filtering and pagination
   *
   * Returns the queue's work items including their status, business payload
   * (`specificData`), output, timing fields, and failure details.
   *
   * @param queueId - Queue ID
   * @param folderId - Required folder ID
   * @param options Query options including filtering and pagination options
   * @returns Promise resolving to either a {@link QueueItem} array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueItem>` when pagination options are used.
   * @example
   * ```typescript
   * const items = await queues.getAllItems(<queueId>, <folderId>);
   *
   * // Failed items only, newest first
   * const failed = await queues.getAllItems(<queueId>, <folderId>, {
   *   filter: "status eq 'Failed'",
   *   orderby: 'createdTime desc',
   *   pageSize: 25
   * });
   * ```
   * @example
   * ```typescript
   * // Or operate on a queue returned by getById/getAll
   * const queue = await queues.getById(<queueId>, <folderId>);
   * const items = await queue.getAllItems();
   * ```
   */
  getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(
    queueId: number,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItem>
      : NonPaginatedResponse<QueueItem>
  >;

  /**
   * Inserts a new item into a queue by queue name
   *
   * Returns the created queue item including its id, status, and the stored
   * payload. Payload keys keep their original casing — the SDK performs no
   * case conversion on them, while method options and response fields still
   * use the SDK's usual camelCase; `Date` values in the payload are
   * serialized to ISO-8601 strings.
   *
   * The payload must be flat — values are simple scalars (see
   * {@link QueueItemValue}); nested objects and arrays are rejected.
   *
   * @param queueName - Name of the queue to insert into
   * @param folderId - Required folder ID
   * @param specificData - The item's business payload (stored as the queue item's specific content)
   * @param options Optional item metadata (priority, reference, defer/due dates)
   * @returns Promise resolving to the created {@link QueueItem}
   * @example
   * ```typescript
   * import { QueuePriority } from '@uipath/uipath-typescript/queues';
   *
   * // Minimal insert
   * const item = await queues.insertItemByName('<queueName>', <folderId>, {
   *   invoiceId: 'INV-1001',
   *   amount: 1520
   * });
   *
   * // With metadata
   * const rushItem = await queues.insertItemByName('<queueName>', <folderId>, {
   *   invoiceId: 'INV-1002'
   * }, {
   *   priority: QueuePriority.High,
   *   reference: 'INV-1002',
   *   dueDate: new Date('2026-08-15')
   * });
   * ```
   */
  insertItemByName(
    queueName: string,
    folderId: number,
    specificData: Record<string, QueueItemValue>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItem>;
}

/**
 * Queue methods interface - operations bound to a queue returned by
 * getAll/getById. The queue's own id, name, and folder are filled in
 * automatically.
 */
export interface QueueMethods {
  /**
   * Gets this queue's items with optional filtering and pagination.
   *
   * @param options Query options including filtering and pagination options
   * @returns Promise resolving to the queue's {@link QueueItem} entries
   */
  getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItem>
      : NonPaginatedResponse<QueueItem>
  >;

  /**
   * Inserts a new item into this queue.
   *
   * The payload must be flat — nested objects and arrays are rejected.
   *
   * @param specificData - The item's business payload (keys are stored exactly as provided)
   * @param options Optional item metadata (priority, reference, defer/due dates)
   * @returns Promise resolving to the created {@link QueueItem}
   */
  insertItem(
    specificData: Record<string, QueueItemValue>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItem>;
}

/**
 * Creates queue methods bound to a specific queue's data
 * @param queueData - The queue data
 * @param service - The queue service instance
 * @returns Object containing queue methods
 */
function createQueueMethods(queueData: RawQueueGetResponse, service: QueueServiceModel): QueueMethods {
  return {
    async getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(options?: T): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<QueueItem>
        : NonPaginatedResponse<QueueItem>
    > {
      if (!queueData.id) throw new Error('Queue ID is undefined');
      if (!queueData.folderId) throw new Error('Folder ID is undefined');
      return service.getAllItems(queueData.id, queueData.folderId, options);
    },

    async insertItem(specificData: Record<string, QueueItemValue>, options?: QueueInsertItemOptions): Promise<QueueItem> {
      if (!queueData.name) throw new Error('Queue name is undefined');
      if (!queueData.folderId) throw new Error('Folder ID is undefined');
      return service.insertItemByName(queueData.name, queueData.folderId, specificData, options);
    }
  };
}

/**
 * Creates a queue object with methods attached
 * @param queueData - The queue data
 * @param service - The queue service instance
 * @returns Queue data with bound methods
 */
export function createQueueWithMethods(queueData: RawQueueGetResponse, service: QueueServiceModel): QueueGetResponse {
  return Object.assign({}, queueData, createQueueMethods(queueData, service));
}
