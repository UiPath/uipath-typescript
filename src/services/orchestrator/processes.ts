import { BaseService } from '../baseService';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';
import { CollectionResponse } from '../../models/common/commonTypes';
import { 
  ProcessGetResponse, 
  ProcessGetAllOptions, 
  ProcessServiceModel, 
  processStartRequest, 
  processStartOptions, 
  processStartResponse
} from '../../models/orchestrator/process';
import { addPrefixToKeys, camelToPascalCaseKeys, pascalToCamelCaseKeys } from '../../utils/transform';
import { createHeaders } from '../../utils/http/headers';

/**
 * Service for interacting with UiPath Orchestrator Processes API
 */
export class ProcessService extends BaseService implements ProcessServiceModel {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
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
    const headers = createHeaders(folderId);
    
    // Prefix all keys with '$' for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.get<CollectionResponse<ProcessGetResponse>>(
      '/odata/Releases',
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedProcesses = response.data?.value.map(process => 
      pascalToCamelCaseKeys(process) as ProcessGetResponse
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
   *   releaseKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
   *   strategy: StartStrategy.All
   * }, 123); // folderId is required
   * 
   * // Start a process by name with specific robots
   * const jobs = await sdk.process.startProcess({
   *   releaseName: "MyProcess",
   *   strategy: StartStrategy.Specific,
   *   robotIds: [456, 789]
   * }, 123); // folderId is required
   * 
   * // Start a process with input arguments
   * const jobs = await sdk.process.startProcess({
   *   releaseKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
   *   strategy: StartStrategy.All,
   *   inputArguments: JSON.stringify({ param1: "value1", param2: 42 })
   * }, 123); // folderId is required
   * 
   * // Start a process with query options
   * const jobs = await sdk.process.startProcess(
   *   {
   *     releaseKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
   *     strategy: StartStrategy.All
   *   },
   *   123, // folderId is required
   *   { expand: "Robot,Release" } // query options
   * );
   * ```
   */
  async startProcess(request: processStartRequest, folderId: number, options: processStartOptions = {}): Promise<processStartResponse[]> {
    const headers = createHeaders(folderId);
    
    // Convert to PascalCase for API
    const pascalOptions = camelToPascalCaseKeys(request);
    
    // Create the request object according to API spec
    const requestBody = {
      startInfo: pascalOptions
    };

    // Prefix all query parameter keys with '$' for OData
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    
    const response = await this.post<CollectionResponse<processStartResponse>>(
      '/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs',
      requestBody,
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase
    return response.data?.value.map(job => 
      pascalToCamelCaseKeys(job) as processStartResponse
    );
  }
}
