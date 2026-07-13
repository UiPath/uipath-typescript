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
  GlobalVariableMetaData,
  ProcessIncidentGetResponse
} from '../../../models/maestro';
import { BpmnHelpers } from './helpers';
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
import { BpmnVariableMetadata, ElementExecutionsApiResponse, TraceSpan } from '../../../models/maestro/process-instances.internal-types';


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


  /**
   * Parses BPMN XML to extract variable metadata from uipath:inputOutput elements
   * @private
   * @param bpmnXml The BPMN XML string
   * @returns Map of variable ID to metadata
   */
  private parseBpmnVariables(bpmnXml: string): Map<string, BpmnVariableMetadata> {
    const variableMap = new Map<string, BpmnVariableMetadata>();
    const variableSourceMap = this.getVariableSource(bpmnXml);
    
    // Match both self-closing and content-bearing uipath:inputOutput elements
    // Handles: <uipath:inputOutput .../> and <uipath:inputOutput ...>content</uipath:inputOutput>
    const inputOutputRegex = /<uipath:inputOutput\s+([^/]+?)(?:\/(?:>)?|>[\s\S]*?<\/uipath:inputOutput>)/g;
    const inputOutputMatches = bpmnXml.matchAll(inputOutputRegex);
    
    for (const match of inputOutputMatches) {
      const attributes = match[1];
      
      // Extract attributes from the inputOutput element
      const idMatch = attributes.match(/id="([^"]+)"/);
      const nameMatch = attributes.match(/name="([^"]+)"/);
      const typeMatch = attributes.match(/type="([^"]+)"/);
      const elementIdMatch = attributes.match(/elementId="([^"]+)"/);
      
      if (idMatch && nameMatch && typeMatch && elementIdMatch) {
        const elementId = elementIdMatch[1];
        const sourceName = variableSourceMap.get(elementId) || elementId;
        
        const metadata: BpmnVariableMetadata = {
          id: idMatch[1],
          name: nameMatch[1],
          type: typeMatch[1],
          elementId: elementId,
          source: sourceName
        };
        
        variableMap.set(metadata.id, metadata);
      }
    }
    
    return variableMap;
  }

  /**
   * Extracts element names from BPMN XML and maps them to their element IDs
   * @private
   * @param bpmnXml The BPMN XML string
   * @returns Map of elementId to element name
   */
  private getVariableSource(bpmnXml: string): Map<string, string> {
    const elementNameMap = new Map<string, string>();
    
    // Regex to match any BPMN element with both id and name attributes
    const elementRegex = /<bpmn:\w+\s+([^>]*id="([^"]+)"[^>]*name="([^"]+)"[^>]*)/g;
    const elementMatches = bpmnXml.matchAll(elementRegex);
    
    for (const match of elementMatches) {
      const elementId = match[2];
      const elementName = match[3];
      
      if (elementId && elementName) {
        elementNameMap.set(elementId, elementName);
      }
    }
    
    return elementNameMap;
  }

  /**
   * Enriches global variables with metadata from BPMN
   * @private
   * @param globals The raw globals object from API response
   * @param variableMetadata The parsed BPMN variable metadata
   * @returns Array of global variables
   */
  private transformGlobalVariables(
    globals: Record<string, any> | undefined, 
    variableMetadata: Map<string, BpmnVariableMetadata>
  ): GlobalVariableMetaData[] {
    const enrichedGlobalVariables: GlobalVariableMetaData[] = [];
    
    if (globals && typeof globals === 'object') {
      for (const [variableId, value] of Object.entries(globals)) {
        const metadata = variableMetadata.get(variableId);
        
        if (metadata) {
          enrichedGlobalVariables.push({
            id: metadata.id,
            name: metadata.name,
            type: metadata.type,
            elementId: metadata.elementId,
            source: metadata.source,
            value: value
          });
        }
      }
    }
    
    return enrichedGlobalVariables;
  }

  @track('ProcessInstances.GetVariables')
  async getVariables(instanceId: string, folderKey: string, options?: ProcessInstanceGetVariablesOptions): Promise<ProcessInstanceGetVariablesResponse> {
    // Fetch the BPMN XML to get variable metadata
    let variableMetadata = new Map<string, BpmnVariableMetadata>();
    
    try {
      const bpmnXml = await this.getBpmn(instanceId, folderKey);
      variableMetadata = this.parseBpmnVariables(bpmnXml);
    } catch (error) {
      // Log warning
      console.warn(`Failed to fetch BPMN metadata for instance ${instanceId} :`, error);
    }
    
    // Fetch the variables
    const queryParams = options?.parentElementId ? { parentElementId: options.parentElementId } : undefined;
    
    const response = await this.get<any>(MAESTRO_ENDPOINTS.INSTANCES.GET_VARIABLES(instanceId), {
      headers: createHeaders({ [FOLDER_KEY]: folderKey }),
      params: queryParams
    });
    
    // Transform the globals object to include metadata from BPMN
    const enrichedGlobalVariables = this.transformGlobalVariables(response.data.globals, variableMetadata);
  
    const variablesResponse: ProcessInstanceGetVariablesResponse = {
      elements: response.data.elements,
      globalVariables: enrichedGlobalVariables,
      instanceId: response.data.instanceId,
      parentElementId: response.data.parentElementId
    };
    
    return variablesResponse;
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
