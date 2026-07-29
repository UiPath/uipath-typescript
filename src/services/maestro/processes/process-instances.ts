import { BaseService } from '../../base';
import {
  ProcessInstanceGetResponse,
  RawProcessInstanceGetResponse,
  ProcessInstanceGetAllWithPaginationOptions,
  ProcessInstanceOperationOptions,
  ProcessInstanceOperationResponse,
  ProcessInstanceExecutionHistoryResponse,
  ProcessInstancesServiceModel,
  createProcessInstanceWithMethods,
  ProcessInstanceGetVariablesResponse,
  ProcessInstanceGetVariablesOptions,
  ProcessIncidentGetResponse
} from '../../../models/maestro';
import { BpmnHelpers } from './helpers';
import { fetchInstanceVariables } from '../instance-variables';
import { OperationResponse } from '../../../models/common/types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_KEY, CONTENT_TYPES } from '../../../utils/constants/headers';
import { transformData } from '../../../utils/transform';
import { ProcessInstanceMap } from '../../../models/maestro/process-instances.constants';
import { BpmnXmlString } from '../../../models/maestro/process-instances.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { PROCESS_INSTANCE_PAGINATION, PROCESS_INSTANCE_TOKEN_PARAMS } from '../../../utils/constants/common';
import { track } from '../../../core/telemetry';
import { ElementExecutionsApiResponse, TraceSpan } from '../../../models/maestro/process-instances.internal-types';


export class ProcessInstancesService extends BaseService implements ProcessInstancesServiceModel {
  @track('ProcessInstances.GetAll')
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

  @track('ProcessInstances.GetById')
  async getById(id: string, folderKey: string): Promise<ProcessInstanceGetResponse> {
    const response = await this.get<RawProcessInstanceGetResponse>(MAESTRO_ENDPOINTS.INSTANCES.GET_BY_ID(id), {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    const rawInstance = transformData(response.data, ProcessInstanceMap);
    return createProcessInstanceWithMethods(rawInstance, this);
  }

  @track('ProcessInstances.GetExecutionHistory')
  async getExecutionHistory(instanceId: string, folderKey: string): Promise<ProcessInstanceExecutionHistoryResponse[]> {
    const headers = createHeaders({ [FOLDER_KEY]: folderKey });

    const elementExecResponse = await this.get<ElementExecutionsApiResponse>(
      MAESTRO_ENDPOINTS.INSTANCES.GET_ELEMENT_EXECUTIONS(instanceId),
      { headers }
    );

    const traceId = elementExecResponse.data.traceId;

    const spansResponse = await this.get<TraceSpan[]>(
      MAESTRO_ENDPOINTS.TRACES.GET_SPANS(traceId),
      { headers }
    );

    // Build span lookup keyed by elementRunId extracted from Attributes JSON
    const spanMap = new Map<string, TraceSpan>();
    for (const span of spansResponse.data) {
      try {
        const attrs = span.Attributes ? JSON.parse(span.Attributes) : null;
        if (attrs?.elementRunId) {
          spanMap.set(attrs.elementRunId, span);
        }
      } catch {
        // skip spans with unparseable Attributes — they won't match any elementRunId
      }
    }

    const results: ProcessInstanceExecutionHistoryResponse[] = [];
    for (const elementExec of elementExecResponse.data.elementExecutions) {
      for (const run of elementExec.elementRuns) {
        const span = spanMap.get(run.elementRunId);
        if (span) {
          results.push(this.mapSpanToHistory(span));
        }
      }
    }

    return results;
  }

  private mapSpanToHistory(span: TraceSpan): ProcessInstanceExecutionHistoryResponse {
    return {
      id: span.Id,
      traceId: span.TraceId,
      parentId: span.ParentId,
      name: span.Name,
      startedTime: span.StartTime,
      endTime: span.EndTime,
      attributes: span.Attributes,
      updatedTime: span.UpdatedAt,
      expiredTime: span.ExpiryTimeUtc,
    };
  }

  @track('ProcessInstances.GetBpmn')
  async getBpmn(instanceId: string, folderKey: string): Promise<BpmnXmlString> {
    const response = await this.get<string>(MAESTRO_ENDPOINTS.INSTANCES.GET_BPMN(instanceId), {
      headers: createHeaders({ 
        [FOLDER_KEY]: folderKey,
        'Accept': CONTENT_TYPES.XML 
      })
    });
    return response.data;
  }

  @track('ProcessInstances.Cancel')
  async cancel(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>> {
    const response = await this.post<ProcessInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.CANCEL(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    
    return {
      success: true,
      data: response.data
    };
  }

  @track('ProcessInstances.Pause')
  async pause(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>> {
    const response = await this.post<ProcessInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.PAUSE(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });
    
    return {
      success: true,
      data: response.data
    };
  }

  @track('ProcessInstances.Resume')
  async resume(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>> {
    const response = await this.post<ProcessInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.RESUME(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });

    return {
      success: true,
      data: response.data
    };
  }

  @track('ProcessInstances.Retry')
  async retry(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>> {
    const response = await this.post<ProcessInstanceOperationResponse>(MAESTRO_ENDPOINTS.INSTANCES.RETRY(instanceId), options || {}, {
      headers: createHeaders({ [FOLDER_KEY]: folderKey })
    });

    return {
      success: true,
      data: response.data
    };
  }


  @track('ProcessInstances.GetVariables')
  async getVariables(instanceId: string, folderKey: string, options?: ProcessInstanceGetVariablesOptions): Promise<ProcessInstanceGetVariablesResponse> {
    return fetchInstanceVariables(this.createPaginationServiceAccess(), instanceId, folderKey, options);
  }

  @track('ProcessInstances.GetIncidents')
  async getIncidents(instanceId: string, folderKey: string): Promise<ProcessIncidentGetResponse[]> {
    const rawResponse = await this.get<any[]>(
      MAESTRO_ENDPOINTS.INCIDENTS.GET_BY_INSTANCE(instanceId),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey })
      }
    );

    // Filter out excluded fields and transform response, then enrich with BPMN data
    return BpmnHelpers.enrichIncidentsWithBpmnData(rawResponse.data || [], folderKey, this);
  }

}
