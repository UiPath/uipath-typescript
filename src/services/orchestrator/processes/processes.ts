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
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData, transformRequest, transformOptions } from '../../../utils/transform';
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

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating, mirroring the transformRequest pattern used for
    // request bodies.
    const apiOptions = options ? transformOptions(options, ProcessMap) : options;

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
    }, apiOptions) as any;
  }

  start(request: ProcessStartRequest, options?: ProcessStartOptions): Promise<ProcessStartResponse[]>;
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

    // Rewrite renamed SDK field names → API names inside OData strings,
    // then prefix all query parameter keys with '$' for OData.
    const apiFieldOptions = transformOptions(queryOptions, ProcessMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

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

  @track('Processes.GetById')
  async getById(id: number, folderId: number, options: ProcessGetByIdOptions = {}): Promise<ProcessGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const apiFieldOptions = transformOptions(options, ProcessMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

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
