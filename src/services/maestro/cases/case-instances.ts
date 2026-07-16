import { BaseService } from '../../base';
import type { IUiPath } from '../../../core/types';
import {
  CaseInstanceGetResponse,
  RawCaseInstanceGetResponse,
  CaseInstanceGetAllWithPaginationOptions,
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  CaseInstanceReopenOptions,
  CaseInstanceSendMessageOptions,
  CaseInstancesServiceModel,
  createCaseInstanceWithMethods,
  CaseGetStageResponse,
  StageTask,
  ElementExecutionMetadata,
  CaseInstanceExecutionHistoryResponse,
  SlaSummaryResponse,
  CaseInstanceSlaSummaryOptions,
  CaseInstanceStageSLAResponse,
  CaseInstanceStageSLAOptions
} from '../../../models/maestro';
import { TaskGetResponse } from '../../../models/action-center';
import {
  CaseJsonResponse,
  CaseInstanceSendMessageRequestBody
} from '../../../models/maestro/case-instances.internal-types';
import { OperationResponse } from '../../../models/common/types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import { transformData, toISOUtc } from '../../../utils/transform';
import {
  CaseInstanceMap,
  CaseAppConfigMap,
  StageSLAMap,
  CASE_STAGE_CONSTANTS,
  TimeFieldTransformMap,
  CASE_INSTANCE_TASK_FILTER,
  CASE_INSTANCE_TASK_EXPAND,
  CASE_INSTANCE_MESSAGE_REFERENCE
} from '../../../models/maestro/case-instances.constants';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { PROCESS_INSTANCE_PAGINATION, PROCESS_INSTANCE_TOKEN_PARAMS, HTTP_METHODS, SLA_SUMMARY_PAGINATION, SLA_SUMMARY_OFFSET_PARAMS } from '../../../utils/constants/common';
import { track } from '../../../core/telemetry';
import { ProcessType } from '../../../models/maestro/cases.internal-types';
import { FOLDER_KEY } from '../../../utils/constants/headers';
import { createHeaders } from '../../../utils/http/headers';
import { TaskService } from '../../action-center/tasks';
import { TaskGetAllOptions } from '../../../models/action-center';

export class CaseInstancesService extends BaseService implements CaseInstancesServiceModel {
  private taskService: TaskService;

  /**
   * Creates an instance of the Case Instances service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    this.taskService = new TaskService(instance);
  }

  @track('CaseInstances.GetAll')
  async getAll<T extends CaseInstanceGetAllWithPaginationOptions = CaseInstanceGetAllWithPaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<CaseInstanceGetResponse>
      : NonPaginatedResponse<CaseInstanceGetResponse>
  > {
    // Add processType filter to only get case management instances
    const enhancedOptions = {
      ...options,
      processType: ProcessType.CaseManagement
    };

    // Base transformation function for case instances (synchronous)
    const transformCaseInstance = (item: any) => {
      const rawInstance = transformData(item, CaseInstanceMap);
      return createCaseInstanceWithMethods(rawInstance, this);
    };

    // Get the paginated result with basic transformation
    const result = await PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => MAESTRO_ENDPOINTS.INSTANCES.GET_ALL,
      transformFn: transformCaseInstance,
      pagination: {
        paginationType: PaginationType.TOKEN,
        itemsField: PROCESS_INSTANCE_PAGINATION.ITEMS_FIELD,
        continuationTokenField: PROCESS_INSTANCE_PAGINATION.CONTINUATION_TOKEN_FIELD,
        paginationParams: {
          pageSizeParam: PROCESS_INSTANCE_TOKEN_PARAMS.PAGE_SIZE_PARAM,
          tokenParam: PROCESS_INSTANCE_TOKEN_PARAMS.TOKEN_PARAM
        }
      },
      excludeFromPrefix: Object.keys(enhancedOptions || {})
    }, enhancedOptions);

    // Enhance instances with case JSON data if requested
    if (result.items && result.items.length > 0) {
      const enhancedItems = await this.enhanceInstancesWithCaseJson(result.items);
      return {
        ...result,
        items: enhancedItems
      } as any;
    }
    
    return result as any;
  }

  @track('CaseInstances.GetById')
  async getById(instanceId: string, folderKey: string): Promise<CaseInstanceGetResponse> {
    const response = await this.get<RawCaseInstanceGetResponse>(
      MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(instanceId),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey })
      }
    );
    
    const transformedInstance = transformData(response.data, CaseInstanceMap);
    const instanceWithMethods = createCaseInstanceWithMethods(transformedInstance, this);
    
    // Enhance with case JSON data
    return this.enhanceInstanceWithCaseJson(instanceWithMethods);
  }

  /**
   * Enhance a single case instance with case JSON data
   * @param instance - The case instance to enhance
   * @returns Promise resolving to enhanced instance
   * @private
   */
  private async enhanceInstanceWithCaseJson(instance: CaseInstanceGetResponse): Promise<CaseInstanceGetResponse> {
    if (!instance.folderKey) {
      return instance;
    }

    try {
      const caseJson = await this.getCaseJson(instance.instanceId, instance.folderKey);
      if (caseJson && caseJson.root) {
        // Transform caseAppConfig
        const transformedCaseAppConfig = caseJson.root.caseAppConfig ? (() => {
          const transformed = transformData(caseJson.root.caseAppConfig, CaseAppConfigMap) as any;
          // Remove id field from each overview item
          if (transformed.overview) {
            transformed.overview = transformed.overview.map(({ id: _, ...rest }: any) => rest);
          }
          return transformed;
        })() : undefined;

        return {
          ...instance,
          ...(transformedCaseAppConfig && { caseAppConfig: transformedCaseAppConfig }),
          ...(caseJson.root.name && { caseType: caseJson.root.name }),
          ...(caseJson.root.description && { caseTitle: caseJson.root.description })
        };
      }
    } catch (error) {
      console.debug(`Failed to fetch case JSON for instance ${instance.instanceId}:`, error);
    }
    
    return instance;
  }

  /**
   * Enhance multiple case instances with case JSON data
   * @param instances - Array of case instances to enhance
   * @returns Promise resolving to array of enhanced instances
   * @private
   */
  private async enhanceInstancesWithCaseJson(instances: CaseInstanceGetResponse[]): Promise<CaseInstanceGetResponse[]> {
    return Promise.all(
      instances.map(instance => this.enhanceInstanceWithCaseJson(instance))
    );
  }

  /**
   * Get case JSON for a specific instance
   * @param instanceId - The case instance ID
   * @param folderKey - Required folder key
   * @returns Promise resolving to case JSON data
   * @private
   */
  private async getCaseJson(instanceId: string, folderKey: string): Promise<CaseJsonResponse | null> {
    try {
      const response = await this.get<CaseJsonResponse>(
        MAESTRO_ENDPOINTS.CASES.GET_CASE_JSON(instanceId),
        {
          headers: createHeaders({ [FOLDER_KEY]: folderKey })
        }
      );
      return response.data;
    } catch {
      // Return null if the case JSON is not available
      return null;
    }
  }

  @track('CaseInstances.Close')
  async close(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
    const response = await this.post<CaseInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.CANCEL(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    
    return {
      success: true,
      data: response.data
    };
  }

  @track('CaseInstances.Pause')
  async pause(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
    const response = await this.post<CaseInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.PAUSE(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });

    return {
      success: true,
      data: response.data
    };
  }

  @track('CaseInstances.Reopen')
  async reopen(instanceId: string, folderKey: string, options: CaseInstanceReopenOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
    // Transform SDK options to API request format
    const requestBody = {
      StartElementId: options.stageId,
      ...(options.comment && { Comment: options.comment })
    };

    const response = await this.post<CaseInstanceOperationResponse>(MAESTRO_ENDPOINTS.CASES.REOPEN(instanceId), requestBody, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });

    return {
      success: true,
      data: response.data
    };
  }

  @track('CaseInstances.Resume')
  async resume(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
    const response = await this.post<CaseInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.RESUME(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });

    return {
      success: true,
      data: response.data
    };
  }

  @track('CaseInstances.SendMessage')
  async sendMessage(instanceId: string, folderKey: string, name: string, options?: CaseInstanceSendMessageOptions): Promise<void> {
    const requestBody: CaseInstanceSendMessageRequestBody = {
      name,
      reference: options?.reference ?? CASE_INSTANCE_MESSAGE_REFERENCE(instanceId),
      ...(options?.itemData && { itemData: options.itemData })
    };

    await this.post<void>(MAESTRO_ENDPOINTS.INSTANCES.SEND_MESSAGE, requestBody, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
  }

  @track('CaseInstances.GetExecutionHistory')
  async getExecutionHistory(
    instanceId: string, 
    folderKey: string
  ): Promise<CaseInstanceExecutionHistoryResponse> {
    const response = await this.get<any>(
      MAESTRO_ENDPOINTS.CASES.GET_ELEMENT_EXECUTIONS(instanceId),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey })
      }
    );
    
    // Transform the main response
    const transformedResponse = transformData(response.data, TimeFieldTransformMap);
    
    // Transform each element execution and its nested element runs
    if (transformedResponse.elementExecutions && Array.isArray(transformedResponse.elementExecutions)) {
      transformedResponse.elementExecutions = transformedResponse.elementExecutions.map((execution: any) => {
        // Transform the element execution itself
        const transformedExecution = transformData(execution, TimeFieldTransformMap);
        
        // Transform nested element runs if they exist
        if (transformedExecution.elementRuns && Array.isArray(transformedExecution.elementRuns)) {
          transformedExecution.elementRuns = transformedExecution.elementRuns.map((run: any) => 
            transformData(run, TimeFieldTransformMap)
          );
        }
        
        return transformedExecution;
      });
    }
    
    return transformedResponse as CaseInstanceExecutionHistoryResponse;
  }

  @track('CaseInstances.GetStages')
  async getStages(caseInstanceId: string, folderKey: string): Promise<CaseGetStageResponse[]> {
    // Fetch both execution history and case JSON in parallel, but handle execution failures gracefully
    const [executionHistoryResponse, caseJsonResponse] = await Promise.allSettled([
      this.getExecutionHistory(caseInstanceId, folderKey),
      this.getCaseJson(caseInstanceId, folderKey)
    ]);

    // Extract execution history if successful, otherwise use null
    const executionHistory = executionHistoryResponse.status === 'fulfilled' 
      ? executionHistoryResponse.value 
      : null;

    // Extract case JSON - the null check below will handle failures
    const caseJson = caseJsonResponse.status === 'fulfilled' 
      ? caseJsonResponse.value 
      : null;
    
    if (!caseJson || !caseJson.nodes) {
      return [];
    }

    // Create lookup maps for efficient data access
    const executionMap = this.createExecutionMap(executionHistory);
    const bindingsMap = this.createBindingsMap(caseJson);

    // Process nodes to extract stages (exclude triggers)
    const stages: CaseGetStageResponse[] = caseJson.nodes
      .filter((node: any) => node.type !== CASE_STAGE_CONSTANTS.TRIGGER_NODE_TYPE)
      .map((node: any) => this.createStageFromNode(node, executionMap, bindingsMap));

    return stages;
  }

  /**
   * Create a map of element ID to execution data 
   * @param executionHistory - The execution history response
   * @returns Map of elementId to execution metadata
   * @private
   */
  private createExecutionMap(executionHistory: any): Map<string, ElementExecutionMetadata> {
    const executionMap = new Map<string, ElementExecutionMetadata>();
    if (executionHistory?.elementExecutions) {
      for (const execution of executionHistory.elementExecutions) {
        executionMap.set(execution.elementId, execution);
      }
    }
    return executionMap;
  }

  /**
   * Create a map of binding IDs to their values 
   * @param caseJsonResponse - The case JSON response
   * @returns Map of binding ID to binding object
   * @private
   */
  private createBindingsMap(caseJsonResponse: any): Map<string, any> {
    const bindingsMap = new Map<string, any>();
    if (caseJsonResponse?.root?.data?.uipath?.bindings) {
      for (const binding of caseJsonResponse.root.data.uipath.bindings) {
        if (binding.id) {
          bindingsMap.set(binding.id, binding);
        }
      }
    }
    return bindingsMap;
  }

  /**
   * Resolve binding values from binding expressions
   * @param value - The value that may contain binding references
   * @param bindingsMap - Map of binding IDs to binding objects
   * @returns Resolved value
   * @private
   */
  private resolveBinding(value: any, bindingsMap: Map<string, any>): string {
    if (typeof value === 'string' && value.startsWith('=bindings.')) {
      const bindingId = value.substring('=bindings.'.length);
      const binding = bindingsMap.get(bindingId);
      return binding?.default || binding?.name || value;
    }
    return value;
  }

  /**
   * Process tasks for a stage node
   * @param node - The stage node containing tasks
   * @param executionMap - Map of element IDs to execution data
   * @param bindingsMap - Map of binding IDs to binding objects
   * @returns Processed tasks array
   * @private
   */
  private processTasks(
    node: any, 
    executionMap: Map<string, ElementExecutionMetadata>, 
    bindingsMap: Map<string, any>
  ): StageTask[][] {
    if (!node.data?.tasks || !Array.isArray(node.data.tasks)) {
      return [];
    }

    return node.data.tasks.map((taskGroup: any[]) => {
      if (Array.isArray(taskGroup)) {
        return taskGroup.map((task: any) => {
          const taskId = task.id;
          
          // Find the execution data using the task's id
          const taskExecution = taskId ? executionMap.get(taskId) : undefined;
          
          // Resolve task name from bindings
          let taskName = task.displayName;
          if (!taskName && task.data?.name) {
            taskName = this.resolveBinding(task.data.name, bindingsMap);
          }
          
          const stageTask: StageTask = {
            id: taskId || task.elementId || CASE_STAGE_CONSTANTS.UNDEFINED_VALUE,
            name: taskName || CASE_STAGE_CONSTANTS.UNDEFINED_VALUE,
            completedTime: taskExecution?.completedTime || CASE_STAGE_CONSTANTS.UNDEFINED_VALUE,
            startedTime: taskExecution?.startedTime || CASE_STAGE_CONSTANTS.UNDEFINED_VALUE,
            status: taskExecution?.status || CASE_STAGE_CONSTANTS.NOT_STARTED_STATUS,
            type: task.type || CASE_STAGE_CONSTANTS.UNDEFINED_VALUE
          };
          
          return stageTask;
        });
      }
      return [];
    });
  }

  /**
   * Create a stage from a case node
   * @param node - The case node to process
   * @param executionMap - Map of element IDs to execution data
   * @param bindingsMap - Map of binding IDs to binding objects
   * @returns CaseGetStageResponse object
   * @private
   */
  private createStageFromNode(
    node: any,
    executionMap: Map<string, ElementExecutionMetadata>,
    bindingsMap: Map<string, any>
  ): CaseGetStageResponse {
    const execution = executionMap.get(node.id);
    
    const stage: CaseGetStageResponse = {
      id: node.id,
      name: node.data?.label || CASE_STAGE_CONSTANTS.UNDEFINED_VALUE,
      sla: node.data?.sla ? transformData(node.data.sla, StageSLAMap) : undefined,
      status: execution?.status || CASE_STAGE_CONSTANTS.NOT_STARTED_STATUS,
      tasks: this.processTasks(node, executionMap, bindingsMap)
    };

    return stage;
  }

  @track('CaseInstances.GetActionTasks')
  async getActionTasks<T extends TaskGetAllOptions = TaskGetAllOptions>(
    caseInstanceId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  > {
    // Build filter to match tasks by case instance ID using tags
    const tagFilter = CASE_INSTANCE_TASK_FILTER(caseInstanceId);

    // Combine with any existing filter
    const filter = options?.filter
      ? `(${tagFilter}) and (${options.filter})`
      : tagFilter;

    // Add expand to include AssignedToUser and Activities
    const expand = CASE_INSTANCE_TASK_EXPAND;

    // Prepare the enhanced options with proper typing
    const enhancedOptions: T = {
      ...options,
      filter,
      expand
    } as T;

    return await this.taskService.getAll(enhancedOptions) as any;
  }

  @track('CaseInstances.GetSlaSummary')
  async getSlaSummary<T extends CaseInstanceSlaSummaryOptions = CaseInstanceSlaSummaryOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<SlaSummaryResponse>
      : NonPaginatedResponse<SlaSummaryResponse>
  > {
    const apiOptions = options ? {
      ...options,
      startTimeUtc: options.startTimeUtc?.toISOString(),
      endTimeUtc: options.endTimeUtc?.toISOString()
    } : undefined;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => MAESTRO_ENDPOINTS.INSIGHTS.SLA_SUMMARY,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: ['caseInstanceId', 'startTimeUtc', 'endTimeUtc'],
      transformFn: (item: SlaSummaryResponse): SlaSummaryResponse => ({
        ...item,
        slaDueTime: toISOUtc(item.slaDueTime),
        lastModifiedTime: toISOUtc(item.lastModifiedTime)
      }),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: SLA_SUMMARY_PAGINATION.ITEMS_FIELD,
        totalCountField: SLA_SUMMARY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: SLA_SUMMARY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: SLA_SUMMARY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: SLA_SUMMARY_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false
        }
      }
    }, apiOptions) as any;
  }

  @track('CaseInstances.GetStagesSlaSummary')
  async getStagesSlaSummary(options?: CaseInstanceStageSLAOptions): Promise<CaseInstanceStageSLAResponse[]> {
    const response = await this.post<CaseInstanceStageSLAResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.STAGES_SUMMARY,
      {
        caseInstanceId: options?.caseInstanceId,
      }
    );

    return response.data ?? [];
  }
}
