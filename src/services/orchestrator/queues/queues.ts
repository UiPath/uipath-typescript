import { FolderScopedService } from '../../folder-scoped';
import {
  RawQueueGetResponse,
  QueueGetAllOptions,
  QueueGetByIdOptions,
  QueueGetAllItemsOptions,
  QueueInsertItemOptions,
  QueueItem,
  QueueItemValue,
  QueuePriority,
  QueueItemProcessingError
} from '../../../models/orchestrator/queues.types';
import {
  QueueServiceModel,
  QueueGetResponse,
  createQueueWithMethods
} from '../../../models/orchestrator/queues.models';
import {
  addPrefixToKeys,
  pascalToCamelCaseKeys,
  transformData,
  transformOptions
} from '../../../utils/transform';
import { ValidationError } from '../../../core/errors';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { QUEUE_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { QueueMap, QueueItemMap, QueueItemProcessingErrorMap } from '../../../models/orchestrator/queues.constants';
import { track } from '../../../core/telemetry';

/**
 * Transforms a raw API queue item into the SDK shape. `SpecificContent` and
 * `Output` hold user-defined keys, so they are excluded from case conversion
 * and reattached unchanged (same contract as Data Fabric record data); their
 * JSON-string duplicates (`SpecificData`/`OutputData`) are dropped.
 */
function transformQueueItem(queueItem: Record<string, unknown>): QueueItem {
  const { SpecificContent, Output, SpecificData: _sd, OutputData: _od, ...rest } = queueItem;

  const transformed = transformData(
    pascalToCamelCaseKeys(rest) as QueueItem,
    QueueItemMap
  ) as QueueItem;

  // The nested failure object has its own creationTime to rename.
  if (transformed.processingError) {
    transformed.processingError = transformData(
      transformed.processingError,
      QueueItemProcessingErrorMap
    ) as QueueItemProcessingError;
  }

  transformed.specificData = (SpecificContent as Record<string, unknown> | undefined) ?? null;
  transformed.outputData = (Output as Record<string, unknown> | undefined) ?? null;

  return transformed;
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
      ? PaginatedResponse<QueueGetResponse>
      : NonPaginatedResponse<QueueGetResponse>
  > {
    const transformQueueResponse = (queue: Record<string, unknown>) => {
      const rawQueue = transformData(pascalToCamelCaseKeys(queue) as RawQueueGetResponse, QueueMap);
      return createQueueWithMethods(rawQueue, this);
    };

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating, mirroring the transformRequest pattern used for
    // request bodies.
    const apiOptions = options ? transformOptions(options, QueueMap) : options;

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
    }, apiOptions) as any;
  }

  @track('Queues.GetById')
  async getById(id: number, folderId: number, options: QueueGetByIdOptions = {}): Promise<QueueGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const apiFieldOptions = transformOptions(options, QueueMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<RawQueueGetResponse>(
      QUEUE_ENDPOINTS.GET_BY_ID(id),
      {
        headers,
        params: apiOptions
      }
    );

    const rawQueue = transformData(pascalToCamelCaseKeys(response.data) as RawQueueGetResponse, QueueMap);
    return createQueueWithMethods(rawQueue, this);
  }

  @track('Queues.GetAllItems')
  async getAllItems<T extends QueueGetAllItemsOptions = QueueGetAllItemsOptions>(
    queueId: number,
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<QueueItem>
      : NonPaginatedResponse<QueueItem>
  > {
    if (!queueId) {
      throw new ValidationError({ message: 'queueId is required for getAllItems' });
    }
    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for getAllItems' });
    }

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
      transformFn: transformQueueItem,
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
    specificData: Record<string, QueueItemValue>,
    options: QueueInsertItemOptions = {}
  ): Promise<QueueItem> {
    if (!queueName) {
      throw new ValidationError({ message: 'queueName is required for insertItemByName' });
    }
    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for insertItemByName' });
    }

    const response = await this.post<Record<string, unknown>>(
      QUEUE_ENDPOINTS.ADD_ITEM,
      {
        itemData: {
          Name: queueName,
          Priority: options.priority ?? QueuePriority.Normal,
          Reference: options.reference,
          Progress: options.progress,
          DeferDate: options.deferDate?.toISOString(),
          DueDate: options.dueDate?.toISOString(),
          RiskSlaDate: options.riskSlaDate?.toISOString(),
          // User-defined keys — sent exactly as provided (no case conversion).
          SpecificContent: specificData
        }
      },
      {
        headers: createHeaders({ [FOLDER_ID]: folderId })
      }
    );

    return transformQueueItem(response.data);
  }
}
