import { FolderScopedService } from '../../folder-scoped';
import {
  QueueGetResponse,
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueItemResponse,
  QueueItemRequest,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  TransactionItemResponse,
  TransactionRequest,
  TransactionCompletionOptions,
  TransactionCompletionResponse
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
  private escapeODataValue(value: string): string {
    return value.replace(/'/g, "''");
  }

  private async resolveQueueIdByName(queueName: string, folderId: number): Promise<number> {
    const safeQueueName = this.escapeODataValue(queueName);
    const result = await this.getAll({
      folderId,
      filter: `name eq '${safeQueueName}'`
    });

    const queue = result.items.find((item) => item.name === queueName) ?? result.items[0];
    if (!queue) {
      throw new Error(`Queue '${queueName}' was not found in folder '${folderId}'.`);
    }

    return queue.id;
  }

  private async resolveQueueNameById(queueId: number, folderId: number): Promise<string> {
    const queue = await this.getById(queueId, folderId);
    if (!queue?.name) {
      throw new Error(`Queue name was not found for queue ID '${queueId}' in folder '${folderId}'.`);
    }

    return queue.name;
  }

  private async ensureQueueItemBelongsToQueueName(
    queueName: string,
    itemId: number,
    folderId: number
  ): Promise<void> {
    const queueId = await this.resolveQueueIdByName(queueName, folderId);
    const result = await this.getAllItems(queueId, folderId, {
      filter: `id eq ${itemId}`
    });

    if (result.items.length === 0) {
      throw new Error(`Queue item '${itemId}' was not found in queue '${queueName}' for folder '${folderId}'.`);
    }
  }

  /**
   * Gets all queues across folders with optional filtering and folder scoping
   *
   * The method returns either:
   * - An array of queues (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   *
   * @param options Query options including optional folderId
   * @returns Promise resolving to an array of queues or paginated result
   */
  @track('Queues.GetAll')
  async getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueGetResponse>
      : NonPaginatedResponse<QueueGetResponse>
  > {
    const transformQueueResponse = (queue: Record<string, unknown>) =>
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
   * @param id Queue ID
   * @param folderId Required folder ID
   * @param options Query options
   * @returns Promise resolving to a queue definition
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
   * Gets queue items for a specific queue in a folder by queue ID.
   *
   * @param queueId Required queue ID
   * @param folderId Required folder ID
   * @param options Query options including filtering and pagination
   * @returns Promise resolving to an array of queue items or a paginated result
   */
  @track('Queues.GetAllItems')
  async getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(
    queueId: number,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  > {
    const transformQueueItemResponse = (queueItem: Record<string, unknown>) =>
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
   * Gets queue items for a specific queue in a folder by queue name.
   *
   * @param queueName Required queue name
   * @param folderId Required folder ID
   * @param options Query options including filtering and pagination
   * @returns Promise resolving to an array of queue items or a paginated result
   */
  @track('Queues.GetAllItemsByName')
  async getAllItemsByName<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(
    queueName: string,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItemResponse>
      : NonPaginatedResponse<QueueItemResponse>
  > {
    const queueId = await this.resolveQueueIdByName(queueName, folderId);
    return this.getAllItems(queueId, folderId, options) as any;
  }

  /**
   * Inserts a new item into a queue by queue ID.
   *
   * @param queueId Required queue ID
   * @param folderId Required folder ID
   * @param content Queue item content payload
   * @param options Optional queue item options
   * @returns Promise resolving to the created queue item
   */
  @track('Queues.InsertItem')
  async insertItem(
    queueId: number,
    folderId: number,
    content: Record<string, unknown>,
    options: QueueInsertItemOptions = {}
  ): Promise<QueueItemResponse> {
    const queueName = await this.resolveQueueNameById(queueId, folderId);
    return this.insertItemByName(queueName, folderId, content, options);
  }

  /**
   * Inserts a new item into a queue by queue name.
   *
   * @param queueName Required queue name
   * @param folderId Required folder ID
   * @param content Queue item content payload
   * @param options Optional queue item options
   * @returns Promise resolving to the created queue item
   */
  @track('Queues.InsertItemByName')
  async insertItemByName(
    queueName: string,
    folderId: number,
    content: Record<string, unknown>,
    options: QueueInsertItemOptions = {}
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
   * Starts a transaction by queue ID.
   *
   * @param queueId Required queue ID
   * @param folderId Required folder ID
   * @returns Promise resolving to the acquired transaction item
   */
  @track('Queues.StartTransaction')
  async startTransaction(
    queueId: number,
    folderId: number
  ): Promise<TransactionItemResponse> {
    const queueName = await this.resolveQueueNameById(queueId, folderId);
    return this.startTransactionByName(queueName, folderId);
  }

  /**
   * Starts a transaction by queue name.
   *
   * @param queueName Required queue name
   * @param folderId Required folder ID
   * @returns Promise resolving to the acquired transaction item
   */
  @track('Queues.StartTransactionByName')
  async startTransactionByName(
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
   * Completes a transaction.
   *
   * @param itemId Queue item ID
   * @param folderId Required folder ID
   * @param options Transaction completion options
   * @returns Promise resolving to completion response metadata
   */
  @track('Queues.CompleteTransaction')
  async completeTransaction(
    itemId: number,
    folderId: number,
    options: TransactionCompletionOptions
  ): Promise<TransactionCompletionResponse> {
    const completionOptions = {
      IsSuccessful: options.isSuccessful,
      ProcessingException: options.processingException
        ? {
          Reason: options.processingException.reason,
          Details: options.processingException.details,
          Type: options.processingException.type,
          AssociatedImageFilePath: options.processingException.associatedImageFilePath,
          CreationTime: options.processingException.creationTime
        }
        : undefined,
      DeferDate: options.deferDate,
      DueDate: options.dueDate,
      Output: options.output,
      Analytics: options.analytics,
      Progress: options.progress,
      OperationId: options.operationId
    };

    await this.post(
      QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(itemId),
      { transactionResult: completionOptions },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return { success: true };
  }

  /**
   * Completes a transaction by queue name and item ID.
   *
   * @param queueName Queue name
   * @param itemId Queue item ID
   * @param folderId Required folder ID
   * @param options Transaction completion options
   * @returns Promise resolving to completion response metadata
   */
  @track('Queues.CompleteTransactionByName')
  async completeTransactionByName(
    queueName: string,
    itemId: number,
    folderId: number,
    options: TransactionCompletionOptions
  ): Promise<TransactionCompletionResponse> {
    await this.ensureQueueItemBelongsToQueueName(queueName, itemId, folderId);
    return this.completeTransaction(itemId, folderId, options);
  }
}
