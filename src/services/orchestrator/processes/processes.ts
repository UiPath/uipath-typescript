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
   * const folderProcesses = await processes.getAll({ folderId: 123 });
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
   * **Folder context** can be supplied three ways via the options object:
   * `folderId` (numeric), `folderPath` (e.g. `'Shared/Finance'`), or `folderKey`
   * (GUID). At least one is required. When more than one is supplied, the
   * server prefers `folderPath` > `folderKey` > `folderId`.
   *
   * The legacy positional-`folderId` form (`start(request, 123, options?)`)
   * remains supported for backward compatibility but is deprecated; prefer the
   * options object.
   *
   * @param request - Process start request body
   * @param optionsOrFolderId - Options object **or** legacy positional folder ID
   * @param legacyOptions - Legacy options object (only used with positional folderId)
   * @returns Promise resolving to the created jobs
   *
   * @example
   * ```typescript
   * // New (preferred) — options object
   * const jobs = await processes.start(
   *   { processName: 'MyProcess' },
   *   { folderPath: 'Shared/Finance' },
   * );
   *
   * // With folder key
   * await processes.start({ processKey: '...' }, { folderKey: 'guid' });
   *
   * // Legacy positional form (still works)
   * await processes.start({ processName: 'MyProcess' }, 123);
   * ```
   */
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
      folderKey ?? (folderPath || folderId ? undefined : this.config.folderKey);

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
        headers
      }
    );

    return response.data?.value.map(process =>
      transformData(pascalToCamelCaseKeys(process) as ProcessStartResponse, ProcessMap)
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

    return transformData(pascalToCamelCaseKeys(response.data) as ProcessGetResponse, ProcessMap);
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
   * const process = await processes.getByName('MyProcess', { folderPath: 'Shared/Finance' });
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
