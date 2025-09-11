import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse, RequestOptions } from '../../models/common/common-types';
import { 
  ProcessGetResponse, 
  ProcessGetAllOptions, 
  ProcessStartRequest, 
  ProcessStartResponse,
  ProcessGetByIdOptions
} from '../../models/orchestrator/process.types';
import { ProcessServiceModel } from '../../models/orchestrator/process.models';
import { addPrefixToKeys, camelToPascalCaseKeys, pascalToCamelCaseKeys, reverseMap, transformData } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { ProcessMap } from '../../models/orchestrator/process.constants';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ID } from '../../utils/constants/headers';
import { PROCESS_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/pagination-helpers';
import { PaginationType } from '../../utils/pagination/pagination.internal-types';

/**
 * Service for interacting with UiPath Orchestrator Processes API
 */
export class ProcessService extends BaseService implements ProcessServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets all processes across folders with optional filtering and folder scoping
   * 
   * The method returns either:
   * - An array of processes (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options - Query options including optional folderId
   * @returns Promise resolving to an array of processes or paginated result
   * 
   * @example
   * ```typescript
   * // Standard array return
   * const processes = await sdk.processes.getAll();
   * 
   * // Get processes within a specific folder
   * const processes = await sdk.processes.getAll({ 
   *   folderId: 123
   * });
   * 
   * // Get processes with filtering
   * const processes = await sdk.processes.getAll({ 
   *   filter: "name eq 'MyProcess'"
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.processes.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.processes.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.processes.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  async getAll<T extends ProcessGetAllOptions = ProcessGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ProcessGetResponse>
      : NonPaginatedResponse<ProcessGetResponse>
  > {
    // Transformation function for processes
    const transformProcessResponse = (process: any) => 
      transformData(pascalToCamelCaseKeys(process) as ProcessGetResponse, ProcessMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => PROCESS_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: PROCESS_ENDPOINTS.GET_ALL, // Processes use same endpoint for both
      transformFn: transformProcessResponse,
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
    }, options) as any;
  }

  /**
   * Starts a process execution (job)
   * 
   * @param request - Process start request body
   * @param folderId - Required folder ID
   * @param options - Optional query parameters
   * @returns Promise resolving to the created jobs
   * 
   * @example
   * ```typescript
   * // Start a process by process key
   * const jobs = await sdk.processes.start({
   *   processKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   * }, 123); // folderId is required
   * 
   * // Start a process by name with specific robots
   * const jobs = await sdk.processes.start({
   *   processName: "MyProcess"
   * }, 123); // folderId is required
   * ```
   */
  async start(request: ProcessStartRequest, folderId: number, options: RequestOptions = {}): Promise<ProcessStartResponse[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Transform processKey/processName to releaseKey/releaseName for API compatibility
    const apiRequest: Record<string, any> = { ...request };
    
    // Create a reverse mapping using ProcessMap
    const reversedPropertiesMap = reverseMap(ProcessMap);
    
    // Apply transformations for any client properties found in the request
    Object.entries(reversedPropertiesMap).forEach(([clientKey, apiKey]) => {
      if (clientKey in apiRequest) {
        apiRequest[apiKey] = apiRequest[clientKey];
        delete apiRequest[clientKey];
      }
    });
    
    // Convert to PascalCase for API
    const pascalOptions = camelToPascalCaseKeys(apiRequest);   
    
    // Create the request object according to API spec
    const requestBody = {
      startInfo: pascalOptions
    };

    // Prefix all query parameter keys with '$' for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    
    const response = await this.post<CollectionResponse<ProcessStartResponse>>(
      PROCESS_ENDPOINTS.START_PROCESS,
      requestBody,
      { 
        params: apiOptions,
        headers
      }
    );
    
    const transformedProcess = response.data?.value.map(process => 
      transformData(pascalToCamelCaseKeys(process) as ProcessStartResponse, ProcessMap)
    );

    return transformedProcess;
  }

  /**
   * Gets a single process by ID
   * 
   * @param id - Process ID
   * @param folderId - Required folder ID
   * @param options - Optional query parameters 
   * @returns Promise resolving to a single process
   * 
   * @example
   * ```typescript
   * // Get process by ID
   * const process = await sdk.processes.getById(123, 456);
   * ```
   */
  async getById(id: number, folderId: number, options: ProcessGetByIdOptions = {}): Promise<ProcessGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    
    const response = await this.get<ProcessGetResponse>(
      PROCESS_ENDPOINTS.GET_BY_ID(id),
      { 
        headers,
        params: apiOptions
      }
    );

    const transformedProcess = transformData(pascalToCamelCaseKeys(response.data) as ProcessGetResponse, ProcessMap);
    
    return transformedProcess;
  }
}
