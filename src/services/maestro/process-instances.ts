import { BaseService } from '../../services/base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  ProcessInstanceGetAllResponse, 
  ProcessInstanceGetResponse, 
  ProcessInstanceGetAllOptions, 
  ProcessInstanceOperationRequest,
  ProcessInstanceExecutionHistoryResponse,
  ProcessInstance,
  ProcessInstanceServiceModel
} from '../../models/maestro';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_KEY } from '../../utils/constants/headers';



export class ProcessInstancesService extends BaseService implements ProcessInstanceServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }


  /**
   * Get all process instances with pagination support
   * Includes all folders in tenant user has Jobs.View permission for
   * @param params Query parameters for filtering instances and pagination
   * @returns Promise<ProcessInstance[]> Array of ProcessInstance objects with helper methods
   * 
   * @example
   * ```typescript
   * // Get all instances
   * const instances = await sdk.processInstance.getAll();
   * 
   * // Each instance has methods available
   * for (const instance of instances) {
   *   if (instance.state === 'Faulted') {
   *     await instance.cancel('Cancelling faulted instance');
   *   }
   * }
   * 
   * // With filtering
   * const instances = await sdk.processInstance.getAll({
   *   processKey: 'MyProcess',
   *   pageSize: 50
   * });
   * ```
   */
  async getAll(params?: ProcessInstanceGetAllOptions): Promise<ProcessInstance[]> {
    const response = await this.get<ProcessInstanceGetAllResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_ALL, {
      params: params as Record<string, string | number>
    });
    
    return response.data.instances.map(instanceData => 
      ProcessInstance.fromResponse(instanceData, this)
    );
  }

  /**
   * Get a process instance by ID
   * Authorized via Jobs.View folder permission
   * @param instanceId The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<GetInstanceResponse>
   */
  private async _getById(id: string, folderKey: string): Promise<ProcessInstanceGetResponse> {
    const response = await this.get<ProcessInstanceGetResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(id), {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    return response.data;
  }

  /**
   * Get a process instance by ID and return a ProcessInstance object with helper methods
   * @param instanceId The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<ProcessInstance>
   */
  async getById(id: string, folderKey: string): Promise<ProcessInstance> {
    const response = await this._getById(id, folderKey);
    return ProcessInstance.fromResponse(response, this);
  }

  /**
   * Get execution history (spans) for a process instance
   * Includes all folders in tenant user has Jobs.View permission for
   * @param instanceId The ID of the instance to get history for
   * @returns Promise<ProcessInstanceExecutionHistoryResponse[]>
   */
  async getExecutionHistory(instanceId: string): Promise<ProcessInstanceExecutionHistoryResponse[]> {
    const response = await this.get<ProcessInstanceExecutionHistoryResponse[]>(MAESTRO_ENDPOINTS.INSTANCES.GET_EXECUTION_HISTORY(instanceId));
    return response.data;
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
        'Accept': 'application/xml'
      },
      responseType: 'text'
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