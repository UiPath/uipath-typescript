import {
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueGetResponse,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  QueueItemResponse,
  TransactionItemResponse,
  TransactionCompletionOptions
} from './queues.types';
import { OperationResponse } from '../common/types';
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
   * @returns Promise resolving to either an array of queues NonPaginatedResponse<QueueWithMethods> or a PaginatedResponse<QueueWithMethods> when pagination options are used. Each queue has methods attached for operating on its items.
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
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @returns Promise resolving to a queue definition with methods attached for operating on its items
   * {@link QueueWithMethods}
   * @example
   * ```typescript
   * // Get queue by ID
   * const queue = await queues.getById(<queueId>, <folderId>);
   *
   * // Operate on the queue directly via the attached methods
   * const items = await queue.getAllItems();
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueWithMethods>;

  /**
   * Gets the items of a queue with optional filtering and pagination
   *
   * Returns the queue's work items including their status, business payload
   * (`specificData`), output, timing fields, and failure details.
   *
   * @param queueId - Queue ID
   * @param folderId - Required folder ID
   * @param options Query options including filtering and pagination options
   * @returns Promise resolving to either an array of queue items NonPaginatedResponse<QueueItemResponse> or a PaginatedResponse<QueueItemResponse> when pagination options are used.
   * {@link QueueItemResponse}
   * @example
   * ```typescript
   * // First, get queues with queues.getAll()
   * const items = await queues.getAllItems(<queueId>, <folderId>);
   *
   * // Failed items only, newest first
   * const failed = await queues.getAllItems(<queueId>, <folderId>, {
   *   filter: "status eq 'Failed'",
   *   orderby: 'createdTime desc',
   *   pageSize: 25
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
   * Inserts a new item into a queue by queue name (producer operation)
   *
   * Returns the created queue item including its id, status, and the stored
   * payload. The payload keys are user-defined and are stored and returned
   * exactly as provided.
   *
   * The payload must be flat: values have to be simple scalars (string, number,
   * boolean, date). Nested objects and arrays are rejected by Orchestrator.
   *
   * @param queueName - Name of the queue to insert into
   * @param folderId - Required folder ID
   * @param specificData - The item's business payload (stored as the queue item's specific content)
   * @param options Optional item metadata (priority, reference, defer/due dates)
   * @returns Promise resolving to the created queue item
   * {@link QueueItemResponse}
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
    specificData: Record<string, unknown>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItemResponse>;

  /**
   * Starts a transaction: acquires the next available item from a queue by
   * queue name (consumer operation)
   *
   * Orchestrator hands out the next eligible item (by priority and defer
   * date), marks it `InProgress`, and returns it to the robot that requested
   * it. Returns `null` when no item is available for processing.
   *
   * Requires a robot session. Orchestrator allocates the item to the robot
   * making the request, so user and application identities receive `null`
   * however many items are waiting.
   *
   * Queue items are normally consumed by a robot running a process. Apps
   * produce with `insertItemByName` and observe with `getAllItems`, leaving
   * acquisition to the robot.
   *
   * `null` covers both "no eligible items" and "no allocation target" — the two
   * are not distinguishable.
   *
   * @param queueName - Name of the queue to take the next item from
   * @param folderId - Required folder ID
   * @returns Promise resolving to the acquired transaction item, or `null` when no item is available
   * {@link TransactionItemResponse}
   * @example
   * ```typescript
   * const transaction = await queues.startTransactionByName('<queueName>', <folderId>);
   * if (transaction) {
   *   console.log(transaction.specificData);
   * }
   * ```
   */
  startTransactionByName(queueName: string, folderId: number): Promise<TransactionItemResponse | null>;

  /**
   * Completes a transaction: reports the processing outcome of a queue item
   * (consumer operation)
   *
   * Marks the item `Successful` or `Failed` (with failure details), and can
   * persist output data alongside the result.
   *
   * Applies to items with an active transaction. Changing the outcome of an
   * item that already reached a terminal status is rejected by Orchestrator.
   *
   * @param itemId - Queue item ID of the transaction to complete
   * @param folderId - Required folder ID
   * @param options Completion outcome (success flag, output data, failure details)
   * @returns Promise resolving to an operation response containing the completion options
   * {@link TransactionCompletionOptions}
   * @example
   * ```typescript
   * // Report success with output data
   * await queues.completeTransaction(<itemId>, <folderId>, {
   *   isSuccessful: true,
   *   outputData: { paymentId: 'P-778' }
   * });
   *
   * // Report a business failure (not retried)
   * await queues.completeTransaction(<itemId>, <folderId>, {
   *   isSuccessful: false,
   *   processingException: {
   *     reason: 'Vendor not found',
   *     type: 'BusinessException'
   *   }
   * });
   * ```
   */
  completeTransaction(
    itemId: number,
    folderId: number,
    options: TransactionCompletionOptions
  ): Promise<OperationResponse<TransactionCompletionOptions>>;
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
   * @returns Promise resolving to the queue's items
   * {@link QueueItemResponse}
   */
  getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  >;

  /**
   * Inserts a new item into this queue (producer operation).
   *
   * The payload must be flat — nested objects and arrays are rejected by
   * Orchestrator.
   *
   * @param specificData - The item's business payload (keys are stored exactly as provided)
   * @param options Optional item metadata (priority, reference, defer/due dates)
   * @returns Promise resolving to the created queue item
   * {@link QueueItemResponse}
   */
  insertItem(
    specificData: Record<string, unknown>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItemResponse>;

  /**
   * Acquires the next available item from this queue (consumer operation).
   * Returns `null` when no item is available for processing.
   *
   * Requires a robot session — Orchestrator returns the item to the robot that
   * requested it, so user and application identities receive `null`. `null`
   * means either no eligible items or no allocation target; the API does not
   * distinguish them.
   *
   * @returns Promise resolving to the acquired transaction item, or `null`
   * {@link TransactionItemResponse}
   */
  startTransaction(): Promise<TransactionItemResponse | null>;

  /**
   * Reports the processing outcome of one of this queue's items
   * (consumer operation).
   *
   * @param itemId - Queue item ID of the transaction to complete
   * @param options Completion outcome (success flag, output data, failure details)
   * @returns Promise resolving to an operation response containing the completion options
   * {@link TransactionCompletionOptions}
   */
  completeTransaction(
    itemId: number,
    options: TransactionCompletionOptions
  ): Promise<OperationResponse<TransactionCompletionOptions>>;
}

/**
 * Queue metadata combined with queue-bound helper methods.
 */
export type QueueWithMethods = QueueGetResponse & QueueMethods;

/**
 * Creates queue methods bound to a specific queue's data
 * @param queueData - The queue data
 * @param service - The queue service instance
 * @returns Object containing queue methods
 */
function createQueueMethods(queueData: QueueGetResponse, service: QueueServiceModel): QueueMethods {
  return {
    getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(options?: T) {
      if (queueData.id === undefined) throw new Error('Queue ID is undefined');
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');
      return service.getAllItems(queueData.id, queueData.folderId, options);
    },

    insertItem(specificData: Record<string, unknown>, options?: QueueInsertItemOptions): Promise<QueueItemResponse> {
      if (!queueData.name) throw new Error('Queue name is undefined');
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');
      return service.insertItemByName(queueData.name, queueData.folderId, specificData, options);
    },

    startTransaction(): Promise<TransactionItemResponse | null> {
      if (!queueData.name) throw new Error('Queue name is undefined');
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');
      return service.startTransactionByName(queueData.name, queueData.folderId);
    },

    completeTransaction(itemId: number, options: TransactionCompletionOptions): Promise<OperationResponse<TransactionCompletionOptions>> {
      if (queueData.folderId === undefined) throw new Error('Folder ID is undefined');
      return service.completeTransaction(itemId, queueData.folderId, options);
    }
  };
}

/**
 * Creates a queue object with methods attached
 * @param queueData - The queue data
 * @param service - The queue service instance
 * @returns Queue data with bound methods
 */
export function createQueueWithMethods(queueData: QueueGetResponse, service: QueueServiceModel): QueueWithMethods {
  return Object.assign({}, queueData, createQueueMethods(queueData, service));
}
