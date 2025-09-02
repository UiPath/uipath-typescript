import { BaseService } from '../../services/base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  ProcessInstanceGetResponse, 
  RawProcessInstanceGetResponse,
  ProcessInstanceGetAllOptions, 
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
import { createParams } from '../../utils/http/params';


export class ProcessInstancesService extends BaseService implements ProcessInstancesServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }


  /**
   * Get all process instances with pagination support
   * @param options Query parameters for filtering instances and pagination
   * @returns Promise<ProcessInstanceGetResponse[]> Array of ProcessInstance objects with helper methods
   * 
   * @example
   * ```typescript
   * // Get all instances
   * const instances = await sdk.maestro.processes.instances.getAll();
   * 
   * // Cancel faulted instances using methods directly on instances
   * for (const instance of instances) {
   *   if (instance.latestRunStatus === 'Faulted') {
   *     await instance.cancel({ comment: 'Cancelling faulted instance' });
   *   }
   * }
   * 
   * // With filtering
   * const instances = await sdk.maestro.processes.instances.getAll({
   *   processKey: 'MyProcess'
   * });
   * ```
   */
  async getAll(options?: ProcessInstanceGetAllOptions): Promise<ProcessInstanceGetResponse[]> {
    const response = await this.get<ProcessInstanceGetResponse[]>(MAESTRO_ENDPOINTS.INSTANCES.GET_ALL, {
      params: createParams(options as Record<string, string | undefined>)
    });
    
    const rawInstances = response.data?.map((instanceData: ProcessInstanceGetResponse) => 
      transformData(instanceData, ProcessInstanceMap)
    ) || [];
    
    return rawInstances.map((instance: ProcessInstanceGetResponse) => createProcessInstanceWithMethods(instance, this));
  }

  /**
   * Get a process instance by ID with operation methods (cancel, pause, resume)
   * @param id The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<ProcessInstanceGetResponse>
   */
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
  async resume(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<void> {
    await this.post(MAESTRO_ENDPOINTS.INSTANCES.RESUME(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }
} 