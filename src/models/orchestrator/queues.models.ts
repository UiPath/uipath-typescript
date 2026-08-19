import {
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueGetAllWithMethodsOptions,
  QueueGetByIdWithMethodsOptions,
  QueueGetByNameOptions,
  QueueGetByKeyOptions,
  QueueGetResponse,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  QueueItem,
  QueueItemValue
} from './queues.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { ValidationError } from '../../core/errors/validation';

/**
 * A queue with its bound methods attached — the shape returned by
 * `getAllWithMethods`, `getByIdWithMethods`, `getByName`, and `getByKey`.
 * The data fields alone are {@link QueueGetResponse}.
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
 * const allQueues = await queues.getAllWithMethods();
 * ```
 */
export interface QueueServiceModel {
  /**
   * Gets all queues across folders with optional filtering and folder scoping
   *
   * @deprecated Use {@link getAllWithMethods} — it additionally attaches the
   * operational methods to each queue and supports folder scoping via
   * `folderKey` / `folderPath`. This method keeps returning plain queue data.
   *
   * @param options Query options including optional folderId and pagination options
   * @returns Promise resolving to either a {@link QueueGetResponse} array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueGetResponse>` when pagination options are used.
   * @example
   * ```typescript
   * // Standard array return
   * const allQueues = await queues.getAll();
   *
   * // Get queues within a specific folder
   * const folderQueues = await queues.getAll({
   *   folderId: <folderId>
   * });
   * ```
   */
  getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueGetResponse>
      : NonPaginatedResponse<QueueGetResponse>
  >;

  /**
   * Gets all queues with the operational methods attached, with optional
   * filtering and folder scoping
   *
   * @param options Query options including folder scoping (`folderId` / `folderKey` / `folderPath`) and pagination options; without folder scoping, queues across all folders are returned
   * @returns Promise resolving to either a {@link QueueGetWithMethodsResponse} array (`NonPaginatedResponse`) or a `PaginatedResponse<QueueGetWithMethodsResponse>` when pagination options are used. Each queue has methods attached for operating on its items.
   * @example
   * ```typescript
   * // Standard array return
   * const allQueues = await queues.getAllWithMethods();
   *
   * // Get queues within a specific folder — also accepts folderKey / folderPath
   * const folderQueues = await queues.getAllWithMethods({
   *   folderId: <folderId>
   * });
   *
   * // Get queues with filtering
   * const filteredQueues = await queues.getAllWithMethods({
   *   filter: "name eq 'MyQueue'"
   * });
   *
   * // First page with pagination
   * const page1 = await queues.getAllWithMethods({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await queues.getAllWithMethods({ cursor: page1.nextCursor });
   * }
   *
   * // Operate on a result directly via the attached methods
   * const item = await page1.items[0].insertItem({ invoiceId: 'INV-1001' });
   * ```
   */
  getAllWithMethods<T extends QueueGetAllWithMethodsOptions = QueueGetAllWithMethodsOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueGetWithMethodsResponse>
      : NonPaginatedResponse<QueueGetWithMethodsResponse>
  >;

  /**
   * Gets a single queue by ID
   *
   * @deprecated Use {@link getByIdWithMethods} — it additionally attaches the
   * operational methods to the queue and supports folder scoping via
   * `folderKey` / `folderPath`. This method keeps returning plain queue data.
   *
   * @param id - Queue ID
   * @param folderId - Required folder ID
   * @returns Promise resolving to a {@link QueueGetResponse} — the queue definition
   * @example
   * ```typescript
   * const queue = await queues.getById(<queueId>, <folderId>);
   * ```
   */
  getById(id: number, folderId: number, options?: QueueGetByIdOptions): Promise<QueueGetResponse>;

  /**
   * Gets a single queue by ID with the operational methods attached
   *
   * @param id - Queue ID
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and query options
   * @returns Promise resolving to a {@link QueueGetWithMethodsResponse} — the queue definition with methods attached for operating on its items
   * @example
   * ```typescript
   * // Get queue by ID
   * const queue = await queues.getByIdWithMethods(<queueId>, { folderId: <folderId> });
   *
   * // Folder scoping also accepts a folder key or path
   * const byPath = await queues.getByIdWithMethods(<queueId>, { folderPath: 'Shared/Finance' });
   *
   * // Operate on the queue directly via the attached methods
   * const items = await queue.getAllItems();
   * const item = await queue.insertItem({
   *   invoiceId: 'INV-1001',
   *   amount: 1520
   * });
   * ```
   */
  getByIdWithMethods(id: number, options?: QueueGetByIdWithMethodsOptions): Promise<QueueGetWithMethodsResponse>;

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
   *   orderby: 'createdTime desc',
   *   pageSize: 25
   * });
   * ```
   * @example
   * ```typescript
   * // Or operate on a queue returned by getById/getAll
   * const queue = await queues.getByIdWithMethods(<queueId>, { folderId: <folderId> });
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
}

/**
 * Queue methods interface - operations bound to a queue returned by
 * getAllWithMethods/getByIdWithMethods/getByName/getByKey. The queue's own
 * id, name, and folder are filled in automatically.
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
