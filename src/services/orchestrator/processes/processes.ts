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
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData, transformRequest } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { ProcessMap } from '../../../models/orchestrator/processes.constants';
import { FOLDER_ID, FOLDER_PATH_ENCODED, FOLDER_KEY } from '../../../utils/constants/headers';
import { encodeFolderPathHeader } from '../../../utils/encoding/folder-path';
import { ValidationError } from '../../../core/errors';
import { PROCESS_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

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
   * Starts a process execution (job).
   *
   * Folder context is supplied via the options object using `folderId`,
   * `folderPath`, or `folderKey`. When more than one is supplied, the server
   * prefers `folderPath` > `folderKey` > `folderId`.
   *
   * @param request - Process start configuration. Either `processKey` or `processName` must be provided.
   * @param options - Folder context plus optional OData query parameters
   * @returns Promise resolving to the started jobs
   * {@link ProcessStartResponse}
   * @example
   * ```typescript
   * import { Processes } from '@uipath/uipath-typescript/processes';
   *
   * const processes = new Processes(sdk);
   *
   * // Start by name within a folder path
   * await processes.start(
   *   { processName: 'MyProcess' },
   *   { folderPath: 'Shared/Finance' },
   * );
   *
   * // Start by key within a folder key
   * await processes.start(
   *   { processKey: '<process-key>' },
   *   { folderKey: '<folder-guid>' },
   * );
   *
   * // Start by name within a folder ID
   * await processes.start(
   *   { processName: 'MyProcess' },
   *   { folderId: <folder-id> },
   * );
   * ```
   */
  start(
    request: ProcessStartRequest,
    options?: ProcessStartOptions,
  ): Promise<ProcessStartResponse[]>;
  /**
   * Starts a process execution (job) using the positional folder-ID form.
   *
   * @param request - Process start configuration. Either `processKey` or `processName` must be provided.
   * @param folderId - Numeric folder ID
   * @param options - Optional OData query parameters
   * @returns Promise resolving to the started jobs
   * {@link ProcessStartResponse}
   * @deprecated Pass folder context via the options object instead — `start(request, { folderId })`.
   * @example
   * ```typescript
   * await processes.start({ processName: 'MyProcess' }, <folderId>);
   * ```
   */
  start(
    request: ProcessStartRequest,
    folderId: number,
    options?: RequestOptions,
  ): Promise<ProcessStartResponse[]>;
  @track('Processes.Start')
  async start(
    request: ProcessStartRequest,
    optionsOrFolderId?: ProcessStartOptions | number,
    legacyOptions: RequestOptions = {},
  ): Promise<ProcessStartResponse[]> {
    // Normalize the two call shapes into a single options object.
    const opts: ProcessStartOptions =
      typeof optionsOrFolderId === 'number'
        ? { folderId: optionsOrFolderId, ...legacyOptions }
        : (optionsOrFolderId ?? {});

    const { folderId, folderPath, folderKey, ...queryOptions } = opts;

    // Fall back to init-time folderKey (e.g. uipath:folder-key meta tag) only
    // when the caller supplied no folder context at all.
    const effectiveFolderKey =
      folderKey ?? (folderPath || folderId !== undefined ? undefined : this.config.folderKey);

    // Folder context is mandatory for starting a process: missing context
    // would either fail server-side or run the wrong process. Reject early
    // with a uniform error.
    if (folderId === undefined && !folderPath && !effectiveFolderKey) {
      throw new ValidationError({
        message: 'processes.start requires folder context: pass folderId, folderPath, or folderKey, or initialize the SDK with a folder context.',
      });
    }

    const headers = createHeaders({
      [FOLDER_ID]: folderId,
      [FOLDER_PATH_ENCODED]: folderPath ? encodeFolderPathHeader(folderPath) : undefined,
      [FOLDER_KEY]: effectiveFolderKey,
    });

    // Transform SDK field names to API field names (e.g., processKey → releaseKey)
    const apiRequest = transformRequest(request, ProcessMap);
    const requestBody = { startInfo: apiRequest };

    const keysToPrefix = Object.keys(queryOptions);
    const apiOptions = addPrefixToKeys(queryOptions, ODATA_PREFIX, keysToPrefix);

    const response = await this.post<CollectionResponse<ProcessStartResponse>>(
      PROCESS_ENDPOINTS.START_PROCESS,
      requestBody,
      {
        params: apiOptions,
        headers,
      },
    );

    return response.data?.value.map(process =>
      transformData(pascalToCamelCaseKeys(process) as ProcessStartResponse, ProcessMap),
    );
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
   * Retrieves a single process by name.
   *
   * @param name - Process name to search for
   * @param options - Optional folder scoping (`folderPath` or `folderKey`) and OData query parameters
   * @returns Promise resolving to a single process
   * {@link ProcessGetResponse}
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
    return this.getByNameLookup<ProcessGetResponse, ProcessGetResponse>(
      'Process',
      PROCESS_ENDPOINTS.GET_ALL,
      name,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), ProcessMap),
    );
  }
}
