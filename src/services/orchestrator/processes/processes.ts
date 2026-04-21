import { BaseService } from '../../base';
import { CollectionResponse, RequestOptions } from '../../../models/common/types';
import {
  ProcessGetResponse,
  ProcessGetAllOptions,
  ProcessStartRequest,
  ProcessStartResponse,
  ProcessGetByIdOptions,
  ProcessGetByNameOptions
} from '../../../models/orchestrator/processes.types';
import { ProcessServiceModel } from '../../../models/orchestrator/processes.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData, transformRequest } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { ProcessMap } from '../../../models/orchestrator/processes.constants';
import { FOLDER_ID, FOLDER_PATH_ENCODED, FOLDER_KEY } from '../../../utils/constants/headers';
import { NotFoundError } from '../../../core/errors';
import { validateGetByNameArgs } from '../../../utils/validation/name-validator';
import { PROCESS_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Processes API
 */
export class ProcessService extends BaseService implements ProcessServiceModel {
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
   * import { Processes } from '@uipath/uipath-typescript/processes';
   *
   * const processes = new Processes(sdk);
   *
   * // Standard array return
   * const allProcesses = await processes.getAll();
   *
   * // Get processes within a specific folder
   * const folderProcesses = await processes.getAll({
   *   folderId: 123
   * });
   *
   * // Get processes with filtering
   * const filteredProcesses = await processes.getAll({
   *   filter: "name eq 'MyProcess'"
   * });
   *
   * // First page with pagination
   * const page1 = await processes.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await processes.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await processes.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  @track('Processes.GetAll')
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
   * import { Processes } from '@uipath/uipath-typescript/processes';
   *
   * const processes = new Processes(sdk);
   *
   * // Start a process by process key
   * const jobs = await processes.start({
   *   processKey: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
   * }, 123); // folderId is required
   *
   * // Start a process by name with specific robots
   * const jobs = await processes.start({
   *   processName: "MyProcess"
   * }, 123); // folderId is required
   * ```
   */
  @track('Processes.Start')
  async start(request: ProcessStartRequest, folderId: number, options: RequestOptions = {}): Promise<ProcessStartResponse[]> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    // Transform SDK field names to API field names (e.g., processKey → releaseKey)
    const apiRequest = transformRequest(request, ProcessMap);

    // Create the request object according to API spec
    const requestBody = {
      startInfo: apiRequest
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
   * import { Processes } from '@uipath/uipath-typescript/processes';
   *
   * const processes = new Processes(sdk);
   *
   * // Get process by ID
   * const process = await processes.getById(123, 456);
   * ```
   */
  @track('Processes.GetById')
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

  /**
   * Retrieves a single process by name, optionally scoped to a folder
   *
   * @param name - Process name to search for
   * @param options - Optional folder scoping and query parameters
   * @returns Promise resolving to a single process
   *
   * @example
   * ```typescript
   * import { Processes } from '@uipath/uipath-typescript/processes';
   *
   * const processes = new Processes(sdk);
   *
   * // Get process by name with folder path
   * const process = await processes.getByName('MyProcess', { folderPath: 'Shared/Finance' });
   *
   * // Get process by name with folder key
   * const process = await processes.getByName('MyProcess', { folderKey: 'folder-guid' });
   * ```
   */
  @track('Processes.GetByName')
  async getByName(name: string, options: ProcessGetByNameOptions = {}): Promise<ProcessGetResponse> {
    const { folderPath: rawFolderPath, folderKey: rawFolderKey, ...queryOptions } = options;
    const validated = validateGetByNameArgs('Process', name, rawFolderPath, rawFolderKey);

    // Fall back to the SDK's init-time folderKey (e.g. populated from the
    // `uipath:folder-key` meta tag in coded-app deployments) when the
    // caller didn't supply any folder context.
    const effectiveFolderKey =
      validated.folderKey ?? (validated.folderPath ? undefined : this.config.folderKey);

    const headers = createHeaders({
      [FOLDER_PATH_ENCODED]: validated.folderPath ? encodeURIComponent(validated.folderPath) : undefined,
      [FOLDER_KEY]: effectiveFolderKey,
    });

    const keysToPrefix = Object.keys(queryOptions);
    const apiOptions = {
      ...addPrefixToKeys(queryOptions, ODATA_PREFIX, keysToPrefix),
      '$filter': `Name eq '${validated.name.replace(/'/g, "''")}'`,
      '$top': '1',
    };

    const response = await this.get<CollectionResponse<ProcessGetResponse>>(
      PROCESS_ENDPOINTS.GET_ALL,
      {
        headers,
        params: apiOptions,
      },
    );

    const items = response.data?.value;
    if (!items?.length) {
      const folderHint =
        validated.folderPath ? ` in folder '${validated.folderPath}'`
        : effectiveFolderKey ? ` in folder (key: ${effectiveFolderKey})`
        : '';
      throw new NotFoundError({
        message: `Process '${validated.name}' not found${folderHint}.`,
      });
    }

    return transformData(pascalToCamelCaseKeys(items[0]) as ProcessGetResponse, ProcessMap);
  }
}
