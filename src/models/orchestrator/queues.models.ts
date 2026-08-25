import {
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueGetByIdScopedOptions,
  QueueGetByNameOptions,
  QueueGetByKeyOptions,
  QueueGetResponse,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  QueueItem,
  QueueItemValue,
  QueueRef,
  QueueStartTransactionOptions,
  QueueCompleteTransactionOptions,
  QueueTransactionOutcome
} from './queues.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { ValidationError } from '../../core/errors/validation';

/**
 * A queue with its bound methods attached — the shape returned by `getAll`,
 * the options-object `getById`, `getByName`, and `getByKey`. The data fields
 * alone are {@link QueueGetResponse}.
 */
export type QueueGetWithMethodsResponse = QueueGetResponse & QueueMethods;

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
   * Gets all queues with the operational methods attached, with optional
   * filtering and folder scoping
   *
   * @param options Query options including folder scoping (`folderId` / `folderKey` / `folderPath`) and pagination options; without folder scoping, queues across all folders are returned
   * @returns Promise resolving to either a {@link QueueGetWithMethodsResponse} array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueGetWithMethodsResponse>` when pagination options are used. Each queue has methods attached for operating on its items.
   * @example
   * ```typescript
   * // Standard array return
   * const allQueues = await queues.getAll();
   *
   * // Get queues within a specific folder — also accepts folderKey / folderPath
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
   * // Operate on a result directly via the attached methods
   * const item = await page1.items[0].insertItem({ invoiceId: 'INV-1001' });
   * ```
   */
  getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueGetWithMethodsResponse>
      : NonPaginatedResponse<QueueGetWithMethodsResponse>
  >;

  /**
   * Gets a single queue by ID with the operational methods attached
   *
   * @param id - Queue ID
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and query options
   * @returns Promise resolving to a {@link QueueGetWithMethodsResponse} — the queue definition with methods attached for operating on its items
   * @example
   * ```typescript
   * // Get queue by ID
   * const queue = await queues.getById(<queueId>, { folderId: <folderId> });
   *
   * // Folder scoping also accepts a folder key or path
   * const byPath = await queues.getById(<queueId>, { folderPath: 'Shared/Finance' });
   *
   * // Operate on the queue directly via the attached methods
   * const items = await queue.getAllItems();
   * const item = await queue.insertItem({
   *   invoiceId: 'INV-1001',
   *   amount: 1520
   * });
   * ```
   */
  getById(id: number, options?: QueueGetByIdScopedOptions): Promise<QueueGetWithMethodsResponse>;

  /**
   * Gets a single queue by ID — positional `folderId` form.
   *
   * @deprecated Use the options-object form: `getById(id, { folderId })` — it
   * also supports `folderKey` / `folderPath` and returns the queue with the
   * operational methods attached. This form keeps returning plain queue data.
   *
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @param options - Optional query options
   * @returns Promise resolving to a {@link QueueGetResponse} — the queue definition
   * @example
   * ```typescript
   * const queue = await queues.getById(<queueId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;

  /**
   * Gets a single queue by name
   *
   * @param name - Queue name (exact match)
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and query options
   * @returns Promise resolving to a {@link QueueGetWithMethodsResponse} — the queue definition with methods attached for operating on its items
   * @example
   * ```typescript
   * const queue = await queues.getByName('<queueName>', { folderId: <folderId> });
   *
   * // Folder scoping also accepts a folder key or path
   * const byKey = await queues.getByName('<queueName>', { folderKey: '<folderKey>' });
   * ```
   */
  getByName(name: string, options?: QueueGetByNameOptions): Promise<QueueGetWithMethodsResponse>;

  /**
   * Gets a single queue by key (the queue's GUID identifier)
   *
   * @param key - Queue key (GUID)
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and query options
   * @returns Promise resolving to a {@link QueueGetWithMethodsResponse} — the queue definition with methods attached for operating on its items
   * @example
   * ```typescript
   * const queue = await queues.getByKey('<queueKey>', { folderId: <folderId> });
   * ```
   */
  getByKey(key: string, options?: QueueGetByKeyOptions): Promise<QueueGetWithMethodsResponse>;

  /**
   * Gets the items of a queue with optional filtering and pagination
   *
   * Returns the queue's work items including their status, business payload
   * (`specificData`), output, timing fields, and failure details.
   *
   * @param queueId - Queue ID
   * @param options Query options including filtering, pagination, and folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving to either a {@link QueueItem} array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueItem>` when pagination options are used.
   * @example
   * ```typescript
   * const items = await queues.getAllItems(<queueId>, { folderId: <folderId> });
   *
   * // Failed items only, newest first — folder scoping also accepts a
   * // folder key or path
   * const failed = await queues.getAllItems(<queueId>, {
   *   folderPath: 'Shared/Finance',
   *   filter: "status eq 'Failed'",
   *   orderby: 'id desc',
   *   pageSize: 25
   * });
   * ```
   * @example
   * ```typescript
   * // Or operate on a queue returned by getAll / getById
   * const queue = await queues.getById(<queueId>, { folderId: <folderId> });
   * const items = await queue.getAllItems();
   * ```
   */
  getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(
    queueId: number,
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
   * @param specificData - The item's business payload (stored as the queue item's specific content)
   * @param options Item metadata (priority, reference, defer/due dates) and folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving to the created {@link QueueItem}
   * @example
   * ```typescript
   * import { QueuePriority } from '@uipath/uipath-typescript/queues';
   *
   * // Minimal insert
   * const item = await queues.insertItemByName('<queueName>', {
   *   invoiceId: 'INV-1001',
   *   amount: 1520
   * }, { folderId: <folderId> });
   *
   * // With metadata — folder scoping also accepts a folder key or path
   * const rushItem = await queues.insertItemByName('<queueName>', {
   *   invoiceId: 'INV-1002'
   * }, {
   *   folderKey: '<folderKey>',
   *   priority: QueuePriority.High,
   *   reference: 'INV-1002',
   *   dueDate: new Date('2026-08-15')
   * });
   * ```
   */
  insertItemByName(
    queueName: string,
    specificData: Record<string, QueueItemValue>,
    options?: QueueInsertItemOptions
  ): Promise<QueueItem>;

  /**
   * Starts a transaction: acquires the next available item from a queue and
   * marks it `InProgress`
   *
   * Requires a robot session. Orchestrator allocates the item to the robot
   * that sent the request, so user and application identities always receive
   * `null`, however many items are waiting. Queue items are normally consumed
   * by a robot running a process — apps produce with `insertItemByName` and
   * observe with `getAllItems`, leaving acquisition to the robot.
   *
   * `null` covers both "no eligible items" and "no allocation target" — the
   * two are not distinguishable.
   *
   * The queue is selected by exactly one of `name` or `id`. The transaction
   * API identifies queues by name, so an `id` selector is first resolved to
   * the queue's name (one extra lookup).
   *
   * @param queue - Queue selector: `{ name: '<queueName>' }` or `{ id: <queueId> }`
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise resolving to the acquired {@link QueueItem} (in `InProgress` status with `processingStartTime` set), or `null` when no item is available
   * @example
   * ```typescript
   * const transaction = await queues.startTransaction({ name: '<queueName>' }, { folderId: <folderId> });
   *
   * // or select by ID — the SDK first resolves the queue's name (one extra lookup)
   * const byId = await queues.startTransaction({ id: <queueId> }, { folderId: <folderId> });
   *
   * // folder scoping also accepts a folder key or path
   * const byPath = await queues.startTransaction({ name: '<queueName>' }, { folderPath: 'Shared/Finance' });
   *
   * if (transaction) {
   *   // Running under a robot session: the item is now locked to this caller
   *   console.log(transaction.status);        // 'InProgress'
   *   console.log(transaction.specificData);  // the item's business payload
   * } else {
   *   // No item was acquired. This happens when the queue has no eligible
   *   // items — and always for user/application identities (e.g. a coded app
   *   // signed in with OAuth), which have no robot session for Orchestrator
   *   // to allocate the item to.
   *   console.log('Nothing to process');
   * }
   * ```
   */
  startTransaction(queue: QueueRef, options?: QueueStartTransactionOptions): Promise<QueueItem | null>;

  /**
   * Completes a transaction: reports the processing outcome of a queue item
   *
   * Marks the item `Successful` or `Failed`, and can persist output data
   * alongside the result. On failure, `processingError` is optional — without
   * it the item is marked `Failed` with no error details; the error `type`
   * decides retry behavior (an `ApplicationException` failure is retried per
   * the queue's retry settings, a `BusinessException` is not).
   *
   * Applies to items with an active transaction. Changing the outcome of an
   * item that already reached a terminal status is rejected.
   *
   * @param itemId - Queue item ID of the transaction to complete
   * @param outcome - The caller's verdict on its own processing of the item; Orchestrator records it as-is
   * @param options - Completion details (output data, failure details, new defer/due dates) and folder scoping (`folderId` / `folderKey` / `folderPath`)
   * @returns Promise that resolves once the outcome is recorded
   * @example
   * ```typescript
   * import { QueueTransactionOutcome, QueueExceptionType } from '@uipath/uipath-typescript/queues';
   *
   * // Report success with output data
   * await queues.completeTransaction(<itemId>, QueueTransactionOutcome.Successful, {
   *   folderId: <folderId>,
   *   outputData: { paymentId: 'P-778' }
   * });
   *
   * // Report a business failure (not retried) — folder scoping also
   * // accepts a folder key or path
   * await queues.completeTransaction(<itemId>, QueueTransactionOutcome.Failed, {
   *   folderKey: '<folderKey>',
   *   processingError: {
   *     reason: 'Vendor not found',
   *     type: QueueExceptionType.BusinessException
   *   }
   * });
   * ```
   */
  completeTransaction(
    itemId: number,
    outcome: QueueTransactionOutcome,
    options?: QueueCompleteTransactionOptions
  ): Promise<void>;
}

/**
 * Queue methods interface - operations bound to a queue returned by getAll,
 * the options-object getById, getByName, and getByKey. The queue's own id,
 * name, and folder are filled in automatically.
 */
export interface QueueMethods {
  /**
   * Gets this queue's items with optional filtering and pagination.
   *
   * @param options Query options including filtering and pagination options
   * @returns Promise resolving to the queue's {@link QueueItem} entries
   */
  getAllItems<T extends Omit<QueueGetAllItemsOptions, 'folderId' | 'folderKey' | 'folderPath'> = Omit<QueueGetAllItemsOptions, 'folderId' | 'folderKey' | 'folderPath'>>(options?: T): Promise<
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
   * @param options Optional item metadata (priority, reference, defer/due dates) — folder scoping comes from the queue
   * @returns Promise resolving to the created {@link QueueItem}
   */
  insertItem(
    specificData: Record<string, QueueItemValue>,
    options?: Omit<QueueInsertItemOptions, 'folderId' | 'folderKey' | 'folderPath'>
  ): Promise<QueueItem>;

  /**
   * Acquires the next available item from this queue, marking it `InProgress`.
   *
   * Requires a robot session — Orchestrator returns the item to the robot
   * that requested it, so user and application identities receive `null`.
   * `null` means either no eligible items or no allocation target; the API
   * does not distinguish them.
   *
   * @returns Promise resolving to the acquired {@link QueueItem}, or `null`
   */
  startTransaction(): Promise<QueueItem | null>;

  /**
   * Reports the processing outcome of one of this queue's items.
   *
   * @param itemId - Queue item ID of the transaction to complete
   * @param outcome - The caller's verdict on its own processing of the item; Orchestrator records it as-is
   * @param options Completion details (output data, failure details, new defer/due dates) — folder scoping comes from the queue
   * @returns Promise that resolves once the outcome is recorded
   */
  completeTransaction(
    itemId: number,
    outcome: QueueTransactionOutcome,
    options?: Omit<QueueCompleteTransactionOptions, 'folderId' | 'folderKey' | 'folderPath'>
  ): Promise<void>;
}

/**
 * Creates queue methods bound to a specific queue's data
 * @param queueData - The queue data
 * @param service - The queue service instance
 * @returns Object containing queue methods
 */
function createQueueMethods(queueData: QueueGetResponse, service: QueueServiceModel): QueueMethods {
  return {
    async getAllItems<T extends Omit<QueueGetAllItemsOptions, 'folderId' | 'folderKey' | 'folderPath'> = Omit<QueueGetAllItemsOptions, 'folderId' | 'folderKey' | 'folderPath'>>(options?: T): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<QueueItem>
        : NonPaginatedResponse<QueueItem>
    > {
      if (!queueData.id) throw new ValidationError({ message: 'Queue ID is undefined' });
      if (!queueData.folderId) throw new ValidationError({ message: 'Folder ID is undefined' });
      return service.getAllItems(
        queueData.id,
        { ...options, folderId: queueData.folderId } as QueueGetAllItemsOptions
      ) as Promise<
        T extends HasPaginationOptions<T>
          ? PaginatedResponse<QueueItem>
          : NonPaginatedResponse<QueueItem>
      >;
    },

    async insertItem(specificData: Record<string, QueueItemValue>, options?: Omit<QueueInsertItemOptions, 'folderId' | 'folderKey' | 'folderPath'>): Promise<QueueItem> {
      if (!queueData.name) throw new ValidationError({ message: 'Queue name is undefined' });
      if (!queueData.folderId) throw new ValidationError({ message: 'Folder ID is undefined' });
      return service.insertItemByName(queueData.name, specificData, { ...options, folderId: queueData.folderId });
    },

    async startTransaction(): Promise<QueueItem | null> {
      if (!queueData.name) throw new ValidationError({ message: 'Queue name is undefined' });
      if (!queueData.folderId) throw new ValidationError({ message: 'Folder ID is undefined' });
      return service.startTransaction({ name: queueData.name }, { folderId: queueData.folderId });
    },

    async completeTransaction(itemId: number, outcome: QueueTransactionOutcome, options?: Omit<QueueCompleteTransactionOptions, 'folderId' | 'folderKey' | 'folderPath'>): Promise<void> {
      if (!queueData.folderId) throw new ValidationError({ message: 'Folder ID is undefined' });
      return service.completeTransaction(itemId, outcome, { ...options, folderId: queueData.folderId });
    }
  };
}

/**
 * Creates a queue object with methods attached
 * @param queueData - The queue data
 * @param service - The queue service instance
 * @returns Queue data with bound methods
 */
export function createQueueWithMethods(queueData: QueueGetResponse, service: QueueServiceModel): QueueGetWithMethodsResponse {
  return Object.assign({}, queueData, createQueueMethods(queueData, service));
}
