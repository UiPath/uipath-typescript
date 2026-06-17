import { FolderScopedService } from '../../folder-scoped';
import { CollectionResponse, RequestOptions } from '../../../models/common/types';
import {
  ProcessGetResponse,
  ProcessGetAllOptions,
  ProcessStartRequest,
  ProcessStartResponse,
  ProcessGetByIdOptions,
  ProcessGetByNameOptions,
  ProcessStartOptions,
} from '../../../models/orchestrator/processes.types';
import { ProcessServiceModel } from '../../../models/orchestrator/processes.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, rewriteODataRequestFields, transformData, transformRequest } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { ProcessMap } from '../../../models/orchestrator/processes.constants';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { PROCESS_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import { resolveFolderHeaders } from '../../../utils/folder/folder-headers';

/**
 * Service for interacting with UiPath Orchestrator Processes API
 */
export class ProcessService extends FolderScopedService implements ProcessServiceModel {
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
      fieldMap: ProcessMap,
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
   * Starts a process with the specified configuration.
   *
   * Folder context can be supplied as `folderId`, `folderKey`, or `folderPath`
   * inside the options.
   *
   * @param request - Process start configuration
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`, `filter`, `orderby`)
   * @returns Promise resolving to array of started process instances
   * {@link ProcessStartResponse}
   *
   * @example
   * ```typescript
   * import { Processes } from '@uipath/uipath-typescript/processes';
   *
   * const processes = new Processes(sdk);
   *
   * // By folder ID
   * await processes.start({ processKey: '<processKey>' }, { folderId: <folderId> });
   *
   * // By folder key (GUID)
   * await processes.start({ processKey: '<processKey>' }, { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await processes.start({ processKey: '<processKey>' }, { folderPath: 'Shared/Finance' });
   *
   * // Start by process name (instead of processKey)
   * await processes.start({ processName: 'MyProcess' }, { folderId: <folderId> });
   *
   * // With additional options
   * await processes.start({ processKey: '<processKey>' }, { folderId: <folderId>, expand: 'Robot' });
   * ```
   */
  start(request: ProcessStartRequest, options?: ProcessStartOptions): Promise<ProcessStartResponse[]>;
  /**
   * Starts a process — positional `folderId` form.
   *
   * @deprecated Use the options-object form: `start(request, { folderId })`. See {@link ProcessStartOptions} for the supported options.
   *
   * @param request - Process start configuration
   * @param folderId - Required folder ID (numeric)
   * @param options - Optional request options
   * @returns Promise resolving to array of started process instances
   * {@link ProcessStartResponse}
   */
  start(request: ProcessStartRequest, folderId: number, options?: RequestOptions): Promise<ProcessStartResponse[]>;
  @track('Processes.Start')
  async start(
    request: ProcessStartRequest,
    optionsOrFolderId?: ProcessStartOptions | number,
    legacyOptions?: RequestOptions,
  ): Promise<ProcessStartResponse[]> {
    // Normalize the two overload forms into a single internal shape.
    let folderId: number | undefined;
    let folderKey: string | undefined;
    let folderPath: string | undefined;
    let queryOptions: RequestOptions;

    if (typeof optionsOrFolderId === 'number') {
      // Deprecated positional form: start(request, folderId, options?)
      folderId = optionsOrFolderId;
      queryOptions = legacyOptions ?? {};
    } else {
      // Preferred form: start(request, options?)
      const { folderId: fid, folderKey: fkey, folderPath: fpath, ...rest } = optionsOrFolderId ?? {};
      folderId = fid;
      folderKey = fkey;
      folderPath = fpath;
      queryOptions = rest;
    }

    const headers = resolveFolderHeaders({
      folderId,
      folderKey,
      folderPath,
      resourceType: 'processes.start',
      fallbackFolderKey: this.config.folderKey,
    });

    // Transform SDK field names to API field names (e.g., processKey → releaseKey)
    const apiRequest = transformRequest(request, ProcessMap);

    // Create the request object according to API spec
    const requestBody = {
      startInfo: apiRequest
    };

    // Rewrite SDK field names → API field names inside OData strings, then
    // prefix all query parameter keys with '$' for OData.
    const rewrittenQueryOptions = rewriteODataRequestFields(queryOptions, ProcessMap);
    const keysToPrefix = Object.keys(rewrittenQueryOptions);
    const apiOptions = addPrefixToKeys(rewrittenQueryOptions, ODATA_PREFIX, keysToPrefix);

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

    const rewrittenOptions = rewriteODataRequestFields(options, ProcessMap);
    const keysToPrefix = Object.keys(rewrittenOptions);
    const apiOptions = addPrefixToKeys(rewrittenOptions, ODATA_PREFIX, keysToPrefix);
    
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
   * Retrieves a single process by name.
   *
   * @param name - Process name to search for
   * @param options - Folder scoping (`folderId` / `folderKey` / `folderPath`) and optional query parameters (`expand`, `select`)
   * @returns Promise resolving to a single process
   * {@link ProcessGetResponse}
   * @example
   * ```typescript
   * import { Processes } from '@uipath/uipath-typescript/processes';
   *
   * const processes = new Processes(sdk);
   *
   * // By folder ID
   * await processes.getByName('MyProcess', { folderId: 123 });
   *
   * // By folder key (GUID)
   * await processes.getByName('MyProcess', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await processes.getByName('MyProcess', { folderPath: 'Shared/Finance' });
   *
   * // With expand
   * await processes.getByName('MyProcess', { folderPath: 'Shared/Finance', expand: 'entryPoints' });
   * ```
   */
  @track('Processes.GetByName')
  async getByName(name: string, options: ProcessGetByNameOptions = {}): Promise<ProcessGetResponse> {
    return this.getByNameLookup<ProcessGetResponse, ProcessGetResponse>(
      'Process',
      PROCESS_ENDPOINTS.GET_ALL,
      name,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), ProcessMap),
      ProcessMap,
    );
  }
}
