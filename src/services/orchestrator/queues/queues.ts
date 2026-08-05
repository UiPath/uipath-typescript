import { FolderScopedService } from '../../folder-scoped';
import {
  QueueGetResponse,
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  QueueItemResponse,
  QueuePriority,
  TransactionItemResponse,
  TransactionCompletionOptions
} from '../../../models/orchestrator/queues.types';
import {
  QueueServiceModel,
  QueueWithMethods,
  createQueueWithMethods
} from '../../../models/orchestrator/queues.models';
import { OperationResponse } from '../../../models/common/types';
import {
  addPrefixToKeys,
  camelToPascalCaseKeys,
  pascalToCamelCaseKeys,
  transformData,
  transformOptions
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

/** Converts an optional Date to the ISO-8601 string the API expects. */
function toIsoString(date?: Date): string | undefined {
  return date ? date.toISOString() : undefined;
}

/**
 * Service for interacting with UiPath Orchestrator Queues API
 */
export class QueueService extends FolderScopedService implements QueueServiceModel {
  @track('Queues.GetAll')
  async getAll<T extends QueueGetAllOptions = QueueGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueWithMethods>
      : NonPaginatedResponse<QueueWithMethods>
  > {
    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating, mirroring the transformRequest pattern used for
    // request bodies.
    const apiOptions = options ? transformOptions(options, QueueMap) : options;

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
    }, apiOptions) as any;
  }

  @track('Queues.GetById')
  async getById(id: number, folderId: number, options: QueueGetByIdOptions = {}): Promise<QueueWithMethods> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const apiFieldOptions = transformOptions(options, QueueMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<QueueGetResponse>(
      QUEUE_ENDPOINTS.GET_BY_ID(id),
      {
        headers,
        params: apiOptions
      }
    );

    return this.transformQueue(response.data);
  }

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
    // Scope the listing to the queue; a caller-provided filter is merged in.
    const filter = options?.filter
      ? `(${options.filter}) and queueId eq ${queueId}`
      : `queueId eq ${queueId}`;

    // Rewrite renamed SDK field names → API names inside OData strings
    // (e.g. queueId → queueDefinitionId, createdTime → creationTime).
    const apiOptions = transformOptions({ ...options, filter }, QueueItemMap);

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
    }, { ...apiOptions, folderId }) as any;
  }

  @track('Queues.InsertItemByName')
  async insertItemByName(
    queueName: string,
    folderId: number,
    specificData: Record<string, unknown>,
    options: QueueInsertItemOptions = {}
  ): Promise<QueueItemResponse> {
    const itemData = camelToPascalCaseKeys({
      priority: options.priority ?? QueuePriority.Normal,
      reference: options.reference,
      progress: options.progress,
      deferDate: toIsoString(options.deferDate),
      dueDate: toIsoString(options.dueDate),
      riskSlaDate: toIsoString(options.riskSlaDate),
      name: queueName
    });

    const response = await this.post<object>(
      QUEUE_ENDPOINTS.ADD_ITEM,
      {
        itemData: {
          ...itemData,
          // User-defined keys — sent exactly as provided (no case conversion).
          SpecificContent: specificData
        }
      },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return this.transformQueueItem(response.data);
  }

  @track('Queues.StartTransactionByName')
  async startTransactionByName(queueName: string, folderId: number): Promise<TransactionItemResponse | null> {
    // RobotIdentifier is deliberately not exposed: the API defines it as the key
    // of the robot that sent the request, so only a robot can supply one, and a
    // robot session already identifies itself through its token.
    const response = await this.post<object | undefined>(
      QUEUE_ENDPOINTS.START_TRANSACTION,
      {
        transactionData: camelToPascalCaseKeys({ name: queueName })
      },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    // Orchestrator returns 204 (empty body) when no item is available.
    if (!response.data || typeof response.data !== 'object') {
      return null;
    }

    return this.transformQueueItem(response.data);
  }

  @track('Queues.CompleteTransaction')
  async completeTransaction(
    itemId: number,
    folderId: number,
    options: TransactionCompletionOptions
  ): Promise<OperationResponse<TransactionCompletionOptions>> {
    const transactionResult: Record<string, unknown> = camelToPascalCaseKeys({
      isSuccessful: options.isSuccessful,
      processingException: options.processingException,
      deferDate: toIsoString(options.deferDate),
      dueDate: toIsoString(options.dueDate),
      progress: options.progress,
      operationId: options.operationId
    });

    // Output/Analytics hold user-defined keys — attach unchanged.
    if (options.outputData !== undefined) {
      transactionResult.Output = options.outputData;
    }
    if (options.analytics !== undefined) {
      transactionResult.Analytics = options.analytics;
    }

    // SetTransactionResult returns no content
    await this.post<void>(
      QUEUE_ENDPOINTS.SET_TRANSACTION_RESULT(itemId),
      { transactionResult },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    // Return success with the request context data
    return {
      success: true,
      data: options
    };
  }

  private transformQueue(queue: object): QueueWithMethods {
    const transformedQueue = transformData(
      pascalToCamelCaseKeys(queue) as QueueGetResponse,
      QueueMap
    ) as QueueGetResponse;

    return createQueueWithMethods(transformedQueue, this);
  }

  private transformQueueItem(queueItem: object): QueueItemResponse {
    // SpecificContent and Output hold user-defined keys — their casing is part
    // of the consumer's data contract, so they are excluded from the case
    // conversion below and reattached unchanged (same contract as Data Fabric
    // record data). The JSON-string wire forms (SpecificData/OutputData) pass
    // through the pipeline and surface as specificDataJson/outputDataJson.
    const { SpecificContent, Output, ...rest } = queueItem as Record<string, unknown>;

    const transformed = transformData(
      pascalToCamelCaseKeys(rest) as QueueItemResponse,
      QueueItemMap
    ) as QueueItemResponse;

    transformed.specificData = (SpecificContent as Record<string, unknown> | undefined) ?? null;
    transformed.outputData = (Output as Record<string, unknown> | undefined) ?? null;

    return transformed;
  }
}
