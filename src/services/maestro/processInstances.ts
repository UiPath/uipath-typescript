import { BaseService } from '../../services/baseService';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';
import { 
  GetAllInstancesResponse, 
  GetInstanceResponse, 
  GetInstancesQueryParams, 
  PaginationParams,
  InstanceCancelRequest,
  InstancePauseRequest,
  InstanceResumeRequest,
  InstancesStatusResponse,
  Span,
  ProcessInstance,
  ProcessInstanceDto
} from '../../models/maestro/processInstance';
import { FOLDER_KEY } from '../../utils/constants/headers';


interface CommentRequest {
  comment: string | null;
}

export class ProcessInstancesService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  private getFolderKeyHeader(folderKey: string) {
    return {
      [FOLDER_KEY]: folderKey
    };
  }

  /**
   * Get all process instances with pagination support
   * Includes all folders in tenant user has Jobs.View permission for
   * @param params Query parameters for filtering instances and pagination
   * @returns Promise<GetAllInstancesResponse>
   */
  async getAll(params?: GetInstancesQueryParams): Promise<GetAllInstancesResponse> {
    const response = await this.get<GetAllInstancesResponse>('pims_/api/v1/instances', {
      params: params as Record<string, string | number>
    });
    return response.data;
  }

  /**
   * Get a process instance by ID
   * Authorized via Jobs.View folder permission
   * @param instanceId The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<GetInstanceResponse>
   */
  async getById(instanceId: string, folderKey: string): Promise<GetInstanceResponse> {
    const response = await this.get<GetInstanceResponse>(`pims_/api/v1/instances/${instanceId}`, {
      headers: {
        [FOLDER_KEY]: folderKey
      }
    });
    return response.data;
  }

  /**
   * Get a process instance by ID and return a ProcessInstance object with helper methods
   * @param instanceId The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise<ProcessInstance>
   */
  async getInstanceById(instanceId: string, folderKey: string): Promise<ProcessInstance> {
    const response = await this.getById(instanceId, folderKey);
    return ProcessInstance.fromResponse(response, this, folderKey);
  }

  /**
   * Get execution history (spans) for a process instance
   * Includes all folders in tenant user has Jobs.View permission for
   * @param instanceId The ID of the instance to get history for
   * @returns Promise<Span[]>
   */
  async getExecutionHistory(instanceId: string): Promise<Span[]> {
    const response = await this.get<Span[]>(`pims_/api/v1/spans/${instanceId}`);
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
    const response = await this.get<string>(`pims_/api/v1/instances/${instanceId}/bpmn`, {
      headers: {
        [FOLDER_KEY]: folderKey,
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
  async cancel(instanceId: string, folderKey: string, request: CommentRequest = { comment: null }): Promise<void> {
    await this.post(`pims_/api/v1/instances/${instanceId}/cancel`, request, {
      headers: this.getFolderKeyHeader(folderKey)
    });
  }

  /**
   * Pause a process instance
   * Authorized via Jobs.Edit folder permission
   * @param instanceId The ID of the instance to pause
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  async pause(instanceId: string, folderKey: string, request: CommentRequest = { comment: null }): Promise<void> {
    await this.post(`pims_/api/v1/instances/${instanceId}/pause`, request, {
      headers: this.getFolderKeyHeader(folderKey)
    });
  }

  /**
   * Resume a process instance
   * Authorized via Jobs.Edit folder permission
   * @param instanceId The ID of the instance to resume
   * @param folderKey The folder key for authorization
   * @returns Promise<void>
   */
  async resume(instanceId: string, folderKey: string, request: CommentRequest = { comment: null }): Promise<void> {
    await this.post(`pims_/api/v1/instances/${instanceId}/resume`, request, {
      headers: this.getFolderKeyHeader(folderKey)
    });
  }

//   /**
//    * Helper method to get all pages of process instances
//    * @param params Query parameters for filtering instances (excluding pagination params)
//    * @param pageSize Optional page size (default: 100)
//    * @returns Promise<GetInstanceResponse[]>
//    */
//   async getAllPages(params?: Omit<GetInstancesQueryParams, keyof PaginationParams>, pageSize: number = 100): Promise<GetInstanceResponse[]> {
//     const instances: GetInstanceResponse[] = [];
//     let nextPage: string | null = null;

//     do {
//       const response = await this.getAll({
//         ...params,
//         pageSize,
//         nextPage: nextPage || undefined
//       });

//       if (response.instances) {
//         instances.push(...response.instances);
//       }

//       nextPage = response.nextPage;
//     } while (nextPage);

//     return instances;
//   }

//   /**
//    * Helper method to iterate over process instances page by page
//    * @param params Query parameters for filtering instances (excluding pagination params)
//    * @param pageCallback Callback function to process each page of results
//    * @param pageSize Optional page size (default: 100)
//    */
//   async forEachPage(
//     params: Omit<GetInstancesQueryParams, keyof PaginationParams>,
//     pageCallback: (page: GetInstanceResponse[]) => Promise<void> | void,
//     pageSize: number = 100
//   ): Promise<void> {
//     let nextPage: string | null = null;

//     do {
//       const response = await this.getAll({
//         ...params,
//         pageSize,
//         nextPage: nextPage || undefined
//       });

//       if (response.instances) {
//         await pageCallback(response.instances);
//       }

//       nextPage = response.nextPage;
//     } while (nextPage);
//   }
} 