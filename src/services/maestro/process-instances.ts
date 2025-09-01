import { BaseService } from '../../services/base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  ProcessInstanceGetAllResponse, 
  ProcessInstanceGetResponse as RawProcessInstanceGetResponse,
  ProcessInstanceGetAllOptions, 
  ProcessInstanceOperationRequest,
  ProcessInstanceExecutionHistoryResponse,
  ProcessInstancesServiceModel,
  ProcessInstanceGetResponse,
  createProcessInstanceWithMethods
} from '../../models/maestro';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_KEY, CONTENT_TYPES, RESPONSE_TYPES } from '../../utils/constants/headers';
import { transformData } from '../../utils/transform';
import { ProcessInstanceMap } from '../../models/maestro/process-instance.constants';



export class ProcessInstancesService extends BaseService implements ProcessInstancesServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }


  /**
   * Get all process instances with pagination support
   * Includes all folders in tenant user has Jobs.View permission for
   * @param options Query parameters for filtering instances and pagination
   * @returns Promise<ProcessInstance[]> Array of ProcessInstance objects with helper methods
   * 
   * @example
   * ```typescript
   * // Get all instances
   * const instances = await sdk.maestro.processes.instances.getAll();
   * 
   * // Cancel faulted instances
   * for (const instance of instances) {
   *   if (instance.state === 'Faulted') {
   *     await sdk.maestro.processes.instances.cancel(
   *       instance.instanceId, 
   *       instance.folderKey,
   *       { comment: 'Cancelling faulted instance' }
   *     );
   *   }
   * }
   * 
   * // With filtering
   * const instances = await sdk.maestro.processes.instances.getAll({
   *   processKey: 'MyProcess',
   *   limit: 50
   * });
   * ```
   */
  async getAll(options?: ProcessInstanceGetAllOptions): Promise<RawProcessInstanceGetResponse[]> {
    const response = await this.get<ProcessInstanceGetAllResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_ALL, {
      params: options as Record<string, string | number>
    });
    
    return response.data?.instances?.map(instanceData => 
      transformData(instanceData, ProcessInstanceMap) as RawProcessInstanceGetResponse
    ) || [];
  }

  /**
   * Get all process instances with operation methods (cancel, pause, resume)
   * @param options Query parameters for filtering instances and pagination
   * @returns Promise<ProcessInstanceGetResponse[]> Array of ProcessInstance objects with helper methods
   */
  async getAllWithMethods(options?: ProcessInstanceGetAllOptions): Promise<ProcessInstanceGetResponse[]> {
    const rawInstances = await this.getAll(options);
    return rawInstances.map(instance => createProcessInstanceWithMethods(instance, this));
  }

  /**
   * Get a process instance by ID (raw data without methods)
   * @param instanceId The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<RawProcessInstanceGetResponse>
   */
  async getById(id: string, folderKey: string): Promise<RawProcessInstanceGetResponse> {
    const response = await this.get<RawProcessInstanceGetResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(id), {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    return transformData(response.data, ProcessInstanceMap) as RawProcessInstanceGetResponse;
  }

  /**
   * Get a process instance by ID with operation methods (cancel, pause, resume)
   * @param instanceId The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<ProcessInstanceGetResponse>
   */
  async getByIdWithMethods(id: string, folderKey: string): Promise<ProcessInstanceGetResponse> {
    const rawInstance = await this.getById(id, folderKey);
    return createProcessInstanceWithMethods(rawInstance, this);
  }

  /**
   * Get execution history (spans) for a process instance
   * Includes all folders in tenant user has Jobs.View permission for
   * @param instanceId The ID of the instance to get history for
   * @returns Promise<ProcessInstanceExecutionHistoryResponse[]>
   */
  async getExecutionHistory(instanceId: string): Promise<ProcessInstanceExecutionHistoryResponse[]> {
    const response = await this.get<ProcessInstanceExecutionHistoryResponse[]>(MAESTRO_ENDPOINTS.INSTANCES.GET_EXECUTION_HISTORY(instanceId));
    return response.data.map(historyItem => 
      transformData(historyItem, ProcessInstanceMap)
    );
  }

  /**
   * Get BPMN XML file for a process instance
   * Authorized via Jobs.View folder permission
   * @param instanceId The ID of the instance to get BPMN for
   * @param folderKey The folder key for authorization
   * @returns Promise<string> The BPMN XML contents
   */
  async getBpmn(instanceId: string, folderKey: string): Promise<string> {
    const response = await this.get<string>(MAESTRO_ENDPOINTS.INSTANCES.GET_BPMN(instanceId), {
      headers: {
        ...createHeaders({ [FOLDER_KEY]: folderKey }),
        'Accept': CONTENT_TYPES.XML
      },
      responseType: RESPONSE_TYPES.TEXT
    });
    return response.data;
  }

  /**
   * Cancel a process instance
   * Authorized via Jobs.Edit folder permission
   * @param instanceId The ID of the instance to cancel
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  async cancel(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void> {
    await this.post(MAESTRO_ENDPOINTS.INSTANCES.CANCEL(instanceId), request || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }

  /**
   * Pause a process instance
   * Authorized via Jobs.Edit folder permission
   * @param instanceId The ID of the instance to pause
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  async pause(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void> {
    await this.post(MAESTRO_ENDPOINTS.INSTANCES.PAUSE(instanceId), request || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }

  /**
   * Resume a process instance
   * Authorized via Jobs.Edit folder permission
   * @param instanceId The ID of the instance to resume
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  async resume(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void> {
    await this.post(MAESTRO_ENDPOINTS.INSTANCES.RESUME(instanceId), request || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }
} 