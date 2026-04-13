import type { ApiResponse } from '../../base';
import type { RequestSpec } from '../../../models/common/request-spec';
import {
  ProcessStartRequest,
  ProcessStartResponse,
} from '../../../models/orchestrator/processes.types';
import { ProcessMap } from '../../../models/orchestrator/processes.constants';
import { CollectionResponse, RequestOptions } from '../../../models/common/types';
import {
  addPrefixToKeys,
  pascalToCamelCaseKeys,
  transformData,
  transformRequest,
} from '../../../utils/transform';
import { ODATA_PREFIX } from '../../../utils/constants/common';
import { PROCESS_ENDPOINTS } from '../../../utils/constants/endpoints';

type Poster = <T>(path: string, body?: unknown, options?: RequestSpec) => Promise<ApiResponse<T>>;

/**
 * Shared implementation of the Orchestrator StartJobs request.
 *
 * Both `ProcessService.start` (orchestrator, folderId header) and
 * `MaestroProcessesService.start` (maestro, folderKey header) delegate here.
 * Callers are responsible for constructing the appropriate folder header.
 */
export async function startProcessRequest(
  post: Poster,
  request: ProcessStartRequest,
  headers: Record<string, string>,
  options: RequestOptions = {}
): Promise<ProcessStartResponse[]> {
  // Transform SDK field names to API field names (e.g., processKey → releaseKey)
  const apiRequest = transformRequest(request, ProcessMap);

  // Create the request object according to API spec
  const requestBody = {
    startInfo: apiRequest
  };

  // Prefix all query parameter keys with '$' for OData
  const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options));

  const response = await post<CollectionResponse<ProcessStartResponse>>(
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
