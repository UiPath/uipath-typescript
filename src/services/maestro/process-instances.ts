import { BaseService } from '../../services/base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  ProcessInstanceGetResponse, 
  RawProcessInstanceGetResponse,
  ProcessInstanceGetAllWithPaginationOptions,
  ProcessInstanceOperationOptions,
  ProcessInstanceExecutionHistoryResponse,
  ProcessInstancesServiceModel,
  createProcessInstanceWithMethods
} from '../../models/maestro';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_KEY, CONTENT_TYPES } from '../../utils/constants/headers';
import { transformData } from '../../utils/transform';
import { ProcessInstanceMap, ProcessInstanceExecutionHistoryMap } from '../../models/maestro/process-instance.constants';
import { BpmnXmlString } from '../../models/maestro/process-instance.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/pagination-helpers';
import { PaginationType } from '../../utils/pagination/pagination.internal-types';
import { PROCESS_INSTANCE_PAGINATION, PROCESS_INSTANCE_TOKEN_PARAMS } from '../../utils/constants/common';
import { track } from '../../core/telemetry';


export class ProcessInstancesService extends BaseService implements ProcessInstancesServiceModel {
  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }


  /**
   * Get all process instances with optional filtering and pagination
   * 
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options Query parameters for filtering instances and pagination
   * @returns Promise resolving to process instances or paginated result
   * 
   * @example
   * ```typescript
   * // Get all instances (non-paginated)
   * const instances = await sdk.maestro.processes.instances.getAll();
   * 
   * // Cancel faulted instances using methods directly on instances
   * for (const instance of instances.items) {
   *   if (instance.latestRunStatus === 'Faulted') {
   *     await instance.cancel({ comment: 'Cancelling faulted instance' });
   *   }
   * }
   * 
   * // With filtering
   * const instances = await sdk.maestro.processes.instances.getAll({
   *   processKey: 'MyProcess'
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.maestro.processes.instances.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.maestro.processes.instances.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('GetAll')
  async getAll<T extends ProcessInstanceGetAllWithPaginationOptions = ProcessInstanceGetAllWithPaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ProcessInstanceGetResponse>
      : NonPaginatedResponse<ProcessInstanceGetResponse>
  > {
    // Transformation function for process instances
    const transformProcessInstance = (item: any) => {
      const rawInstance = transformData(item, ProcessInstanceMap);
      return createProcessInstanceWithMethods(rawInstance, this);
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => MAESTRO_ENDPOINTS.INSTANCES.GET_ALL,
      transformFn: transformProcessInstance,
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: PROCESS_INSTANCE_PAGINATION.ITEMS_FIELD,
        continuationTokenField: PROCESS_INSTANCE_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: PROCESS_INSTANCE_TOKEN_PARAMS.PAGE_SIZE_PARAM,        
          tokenParam: PROCESS_INSTANCE_TOKEN_PARAMS.TOKEN_PARAM                
        }
      },
      excludeFromPrefix: Object.keys(options || {}) // All process instance params are not OData
    }, options) as any;
  }

  /**
   * Get a process instance by ID with operation methods (cancel, pause, resume)
   * @param id The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<ProcessInstanceGetResponse>
   */
  @track('GetById')
  async getById(id: string, folderKey: string): Promise<ProcessInstanceGetResponse> {
    const response = await this.get<RawProcessInstanceGetResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(id), {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    const rawInstance = transformData(response.data, ProcessInstanceMap);
    return createProcessInstanceWithMethods(rawInstance, this);
  }

  /**
   * Get execution history (spans) for a process instance
   * @param instanceId The ID of the instance to get history for
   * @returns Promise<ProcessInstanceExecutionHistoryResponse[]>
   */
  @track('GetExecutionHistory')
  async getExecutionHistory(instanceId: string): Promise<ProcessInstanceExecutionHistoryResponse[]> {
    const response = await this.get<ProcessInstanceExecutionHistoryResponse[]>(MAESTRO_ENDPOINTS.INSTANCES.GET_EXECUTION_HISTORY(instanceId));
    return response.data.map(historyItem => 
      transformData(historyItem, ProcessInstanceExecutionHistoryMap)
    );
  }

  /**
   * Get BPMN XML file for a process instance
   * @param instanceId The ID of the instance to get BPMN for
   * @param folderKey The folder key for authorization
   * @returns Promise<BpmnXmlString> The BPMN XML contents as a string
   */
  @track('GetBpmn')
  async getBpmn(instanceId: string, folderKey: string): Promise<BpmnXmlString> {
    const response = await this.get<string>(MAESTRO_ENDPOINTS.INSTANCES.GET_BPMN(instanceId), {
      headers: createHeaders({ 
        [FOLDER_KEY]: folderKey,
        'Accept': CONTENT_TYPES.XML 
      })
    });
    return response.data;
  }

  /**
   * Cancel a process instance
   * @param instanceId The ID of the instance to cancel
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  @track('Cancel')
  async cancel(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<void> {
    await this.post(MAESTRO_ENDPOINTS.INSTANCES.CANCEL(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }

  /**
   * Pause a process instance
   * @param instanceId The ID of the instance to pause
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  @track('Pause')
  async pause(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<void> {
    await this.post(MAESTRO_ENDPOINTS.INSTANCES.PAUSE(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }

  /**
   * Resume a process instance
   * @param instanceId The ID of the instance to resume
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  @track('Resume')
  async resume(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<void> {
    await this.post(MAESTRO_ENDPOINTS.INSTANCES.RESUME(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }
} 