import { FolderScopedService } from '../../folder-scoped';
import {
  QueueGetResponse,
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueItemResponse,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  TransactionItemResponse,
  TransactionCompletionOptions,
  TransactionCompletionResponse
} from '../../../models/orchestrator/queues.types';
import {
  QueueServiceModel,
  QueueWithMethods,
  createQueueWithMethods
} from '../../../models/orchestrator/queues.models';
import {
  addPrefixToKeys,
  camelToPascalCaseKeys,
  pascalToCamelCaseKeys,
  transformData
} from '../../../utils/transform';
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
  private transformQueue(queue: object): QueueWithMethods {
    const transformedQueue = transformData(
      pascalToCamelCaseKeys(queue) as QueueGetResponse,
      QueueMap
    );

    return createQueueWithMethods(transformedQueue, {
      getAllItems: (options) => this.getAllItems(transformedQueue.id, transformedQueue.folderId, options as any) as any,
      insertItem: (specificData, options) => this.insertQueueItem(transformedQueue.name, transformedQueue.folderId, specificData, options),
      startTransaction: () => this.startQueueTransaction(transformedQueue.name, transformedQueue.folderId),
      completeTransaction: (itemId, options) => this.completeQueueTransaction(itemId, transformedQueue.folderId, options)
    });
  }

  private transformQueueItem(queueItem: object): QueueItemResponse {
    return transformData(
      pascalToCamelCaseKeys(queueItem) as QueueItemResponse,
      QueueItemMap
    );
  }

  private async insertQueueItem(
    queueName: string,
    folderId: number,
    specificData: Record<string, unknown>,
    options: QueueInsertItemOptions = {}
  ): Promise<QueueItemResponse> {
    const itemData = camelToPascalCaseKeys({
      priority: 'Normal',
      ...options,
      name: queueName
    });

    const payload = {
      itemData: {
        ...itemData,
        SpecificContent: specificData
      }
    };

    const response = await this.post<QueueItemResponse>(
      QUEUE_ENDPOINTS.ADD_ITEM,
      payload,
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return this.transformQueueItem(response.data);
  }

  private async startQueueTransaction(
    queueName: string,
    folderId: number
  ): Promise<TransactionItemResponse> {
    const response = await this.post<TransactionItemResponse>(
      QUEUE_ENDPOINTS.START_TRANSACTION,
      {
        transactionData: camelToPascalCaseKeys({
          name: queueName
        })
      },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return this.transformQueueItem(response.data) as TransactionItemResponse;
  }

  private async completeQueueTransaction(
    itemId: number,
    folderId: number,
    options: TransactionCompletionOptions
  ): Promise<TransactionCompletionResponse> {
    const transactionResult = camelToPascalCaseKeys({
      isSuccessful: options.isSuccessful,
      processingException: options.processingException,
      deferDate: options.deferDate,
      dueDate: options.dueDate,
      progress: options.progress,
      operationId: options.operationId
    });

    if (options.outputData !== undefined) {
      transactionResult.Output = options.outputData;
    }

    if (options.analytics !== undefined) {
      transactionResult.Analytics = options.analytics;
    }

    await this.post(
      QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(itemId),
      {
        transactionResult
      },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return { success: true };
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
      ? PaginatedResponse<QueueWithMethods>
      : NonPaginatedResponse<QueueWithMethods>
  > {
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: (folderId) => folderId ? QUEUE_ENDPOINTS.GET_BY_FOLDER : QUEUE_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: QUEUE_ENDPOINTS.GET_BY_FOLDER,
      transformFn: (queue: object) => this.transformQueue(queue),
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
  async getById(id: number, folderId: number, options: QueueGetByIdOptions = {}): Promise<QueueWithMethods> {
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

    return this.transformQueue(response.data);
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
    const filter = options?.filter
      ? `(${options.filter}) and queueDefinitionId eq ${queueId}`
      : `queueDefinitionId eq ${queueId}`;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => QUEUE_ENDPOINTS.GET_ITEMS,
      getByFolderEndpoint: QUEUE_ENDPOINTS.GET_ITEMS,
      transformFn: (queueItem: object) => this.transformQueueItem(queueItem),
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
}
