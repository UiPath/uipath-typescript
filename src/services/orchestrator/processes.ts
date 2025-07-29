import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { CollectionResponse, RequestOptions } from '../../models/common/common-types';
import { 
  ProcessGetResponse, 
  ProcessGetAllOptions, 
  ProcessServiceModel, 
  ProcessStartRequest, 
  ProcessStartResponse
} from '../../models/orchestrator/process';
import { addPrefixToKeys, camelToPascalCaseKeys, pascalToCamelCaseKeys, transformData } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';
import { ProcessTimeMap } from '../../models/orchestrator/process.constants';
import { TokenManager } from '../../core/auth/token-manager';
import { FOLDER_ID } from '../../utils/constants/headers';
import { PROCESS_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Service for interacting with UiPath Orchestrator Processes API
 */
export class ProcessService extends BaseService implements ProcessServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Gets processes with optional query parameters
   * 
   * @param options - Query options
   * @param folderId - Optional folder ID
   * @returns Promise resolving to an array of processes
   * 
   * @example
   * ```typescript
   * // Get all processes
   * const processes = await sdk.process.getAll();
   * 
   * // Get processes with filtering
   * const processes = await sdk.process.getAll({ 
   *   filter: "name eq 'MyProcess'"
   * });
   * ```
   */
  async getAll(options: ProcessGetAllOptions = {}, folderId?: number): Promise<ProcessGetResponse[]> {
    let headerParams = {};
    if (folderId !== undefined) {
      headerParams = { [FOLDER_ID]: folderId };
    }
    const headers = createHeaders(headerParams);
    
    // Prefix all keys with '$' for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<ProcessGetResponse>>(
      PROCESS_ENDPOINTS.GET_ALL,
      { 
        params: apiOptions,
        headers
      }
    );

    const transformedProcesses = response.data?.value.map(process => 
      transformData(pascalToCamelCaseKeys(process) as ProcessGetResponse, ProcessTimeMap)
    );
    
    return transformedProcesses;
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
   * // Start a process by release key
   * const jobs = await sdk.process.startProcess({
   *   releaseKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   * }, 123); // folderId is required
   * 
   * // Start a process by name with specific robots
   * const jobs = await sdk.process.startProcess({
   *   releaseName: "MyProcess"
   * }, 123); // folderId is required
   * ```
   */
  async startProcess(request: ProcessStartRequest, folderId: number, options: RequestOptions = {}): Promise<ProcessStartResponse[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Convert to PascalCase for API
    const pascalOptions = camelToPascalCaseKeys(request);
    
    // Create the request object according to API spec
    const requestBody = {
      startInfo: pascalOptions
    };

    // Prefix all query parameter keys with '$' for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.post<CollectionResponse<ProcessStartResponse>>(
      PROCESS_ENDPOINTS.START_PROCESS,
      requestBody,
      { 
        params: apiOptions,
        headers
      }
    );
    
    const transformedProcess = response.data?.value.map(process => 
      transformData(pascalToCamelCaseKeys(process) as ProcessStartResponse, ProcessTimeMap)
    );

    return transformedProcess;
  }
}
