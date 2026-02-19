import { FolderScopedService } from '../../folder-scoped';
import {
  QueueGetResponse,
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueItemResponse,
  QueueItemRequest,
  QueueItemQueryOptions,
  QueueItemInsertOptions,
  TransactionItemResponse,
  TransactionRequest,
  TransactionResult
} from '../../../models/orchestrator/queues.types';
import { QueueServiceModel } from '../../../models/orchestrator/queues.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { QueueMap, QueueItemMap } from '../../../models/orchestrator/queues.constants';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Queues API
 */
export class QueueService extends FolderScopedService implements QueueServiceModel {
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
   * import { Queues } from '@uipath/uipath-typescript/queues';
   *
   * const queues = new Queues(sdk);
   *
   * // Standard array return
   * const allQueues = await queues.getAll();
   *
   * // Get queues within a specific folder
   * const folderQueues = await queues.getAll({
   *   folderId: 123
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
  @track('Queues.GetAll')
  async getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<QueueGetResponse>
    : NonPaginatedResponse<QueueGetResponse>
  > {
    // Transformation function for queues
    const transformQueueResponse = (queue: any) =>
      transformData(pascalToCamelCaseKeys(queue) as QueueGetResponse, QueueMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: (folderId) => folderId ? QUEUE_ENDPOINTS.GET_BY_FOLDER : QUEUE_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: QUEUE_ENDPOINTS.GET_BY_FOLDER,
      transformFn: transformQueueResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, options) as any;
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
   * import { Queues } from '@uipath/uipath-typescript/queues';
   *
   * const queues = new Queues(sdk);
   *
   * // Get queue by ID
   * const queue = await queues.getById(123, 456);
   * ```
   */
  @track('Queues.GetById')
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

  /**
   * Gets queue items for a specific queue in a folder.
   *
   * @param queueId - Required queue ID
   * @param folderId - Required folder ID
   * @param options - Query options including filtering and pagination
   * @returns Promise resolving to an array of queue items or paginated result
   * @example
   * ```typescript
   * const queueItems = await queues.getQueueItems(456, 12345, {
   *   pageSize: 10,
   *   filter: "status eq 'New'"
   * });
   * ```
   */
  @track('Queues.GetQueueItems')
  async getQueueItems<T extends QueueItemQueryOptions = QueueItemQueryOptions>(
    queueId: number,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  > {
    const transformQueueItemResponse = (queueItem: any) =>
      transformData(pascalToCamelCaseKeys(queueItem) as QueueItemResponse, QueueItemMap);

    const filter = options?.filter
      ? `(${options.filter}) and queueDefinitionId eq ${queueId}`
      : `queueDefinitionId eq ${queueId}`;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => QUEUE_ENDPOINTS.GET_ITEMS,
      getByFolderEndpoint: QUEUE_ENDPOINTS.GET_ITEMS,
      transformFn: transformQueueItemResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, {
      ...(options || {}),
      folderId,
      filter
    } as any) as any;
  }

  /**
   * Inserts a new item into a queue
   *
   * @param queueName - The name of the queue
   * @param folderId - Required folder ID
   * @param content - The queue item content payload
   * @param options - Optional queue item options
   * @returns Promise resolving to the created Queue Item
   * @example
   * ```typescript
   * const queueItem = await queues.insertQueueItem(
   *   'InvoiceQueue',
   *   12345,
   *   { invoiceNumber: 'INV-1001', amount: 1500 },
   *   { priority: 'Normal', reference: 'INV-1001' }
   * );
   * ```
   */
  @track('Queues.InsertQueueItem')
  async insertQueueItem(
    queueName: string,
    folderId: number,
    content: Record<string, any>,
    options: QueueItemInsertOptions = {}
  ): Promise<QueueItemResponse> {
    const queueItemRequest: QueueItemRequest = {
      name: queueName,
      priority: options.priority ?? 'Normal',
      content,
      reference: options.reference,
      dueDate: options.dueDate,
      deferDate: options.deferDate,
      riskSlaDate: options.riskSlaDate,
      progress: options.progress
    };

    const payload = {
      itemData: {
        Name: queueItemRequest.name,
        Priority: queueItemRequest.priority,
        SpecificContent: queueItemRequest.content,
        Reference: queueItemRequest.reference,
        DueDate: queueItemRequest.dueDate,
        DeferDate: queueItemRequest.deferDate,
        RiskSlaDate: queueItemRequest.riskSlaDate,
        Progress: queueItemRequest.progress
      }
    };

    const response = await this.post<QueueItemResponse>(
      QUEUE_ENDPOINTS.ADD_ITEM,
      payload,
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data) as QueueItemResponse, QueueItemMap);
  }

  /**
   * Starts a transaction by getting the next item from the queue.
   *
   * @param queueName - Queue name
   * @param folderId - Required folder ID
   * @returns Promise resolving to the acquired transaction item
   * @example
   * ```typescript
   * const transaction = await queues.startTransaction('InvoiceQueue', 12345);
   * ```
   */
  @track('Queues.StartTransaction')
  async startTransaction(
    queueName: string,
    folderId: number
  ): Promise<TransactionItemResponse> {
    const transactionRequest: TransactionRequest = {
      name: queueName
    };

    const payload = {
      transactionData: {
        Name: transactionRequest.name,
        SpecificContent: transactionRequest.content,
        DeferDate: transactionRequest.deferDate,
        DueDate: transactionRequest.dueDate,
        Reference: transactionRequest.reference,
        ReferenceFilterOption: transactionRequest.referenceFilterOption,
        ParentOperationId: transactionRequest.parentOperationId
      }
    };

    const response = await this.post<TransactionItemResponse>(
      QUEUE_ENDPOINTS.START_TRANSACTION,
      payload,
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data), QueueItemMap) as TransactionItemResponse;
  }

  /**
   * Sets the result of a transaction.
   *
   * @param folderId - Required folder ID
   * @param queueItemId - Queue item ID
   * @param transactionResult - Transaction result payload
   * @example
   * ```typescript
   * await queues.setTransactionResult(12345, 654, {
   *   isSuccessful: true,
   *   output: { completed: true }
   * });
   * ```
   */
  @track('Queues.SetTransactionResult')
  async setTransactionResult(
    folderId: number,
    queueItemId: number,
    transactionResult: TransactionResult
  ): Promise<void> {
    const apiTransactionResult = {
      IsSuccessful: transactionResult.isSuccessful,
      ProcessingException: transactionResult.processingException
        ? {
          Reason: transactionResult.processingException.reason,
          Details: transactionResult.processingException.details,
          Type: transactionResult.processingException.type,
          AssociatedImageFilePath: transactionResult.processingException.associatedImageFilePath,
          CreationTime: transactionResult.processingException.creationTime
        }
        : undefined,
      DeferDate: transactionResult.deferDate,
      DueDate: transactionResult.dueDate,
      Output: transactionResult.output,
      Analytics: transactionResult.analytics,
      Progress: transactionResult.progress,
      OperationId: transactionResult.operationId
    };

    await this.post(
      QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(queueItemId),
      { transactionResult: apiTransactionResult },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );
  }
}
