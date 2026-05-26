import { ApiResponse } from '../base';
import { InstanceStatusTimelineResponse, TimelineOptions } from '../../models/maestro';
import type { TopQueryOptions } from '../../models/maestro';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Builds the request body for Insights RTM "top" endpoints.
 *
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @param options - Optional filters (packageId, processKey, version)
 * @returns Request body for the Insights RTM endpoint
 * @internal
 */
export function buildInsightsTopBody(startTime: Date, endTime: Date, isCaseManagement: boolean, options?: TopQueryOptions) {
  return {
    commonParams: {
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      isCaseManagement,
      ...(options?.packageId ? { packageId: options.packageId } : {}),
      ...(options?.processKey ? { processKey: options.processKey } : {}),
      ...(options?.version ? { version: options.version } : {}),
    }
  };
}

/**
 * Fetches instance status timeline from the Insights API.
 * Shared implementation used by both MaestroProcessesService and CasesService.
 *
 * @param postFn - Bound post method from a BaseService subclass
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @param options - Optional settings for time bucketing granularity
 * @returns Promise resolving to an array of instance status timeline entries
 * @internal
 */
export async function fetchInstanceStatusTimeline(
  postFn: <T>(path: string, data?: unknown) => Promise<ApiResponse<T>>,
  startTime: Date,
  endTime: Date,
  isCaseManagement: boolean,
  options?: TimelineOptions,
): Promise<InstanceStatusTimelineResponse[]> {
  const response = await postFn<InstanceStatusTimelineResponse[]>(
    MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_STATUS_BY_DATE,
    {
      commonParams: {
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        isCaseManagement,
      },
      timeSliceUnit: options?.groupBy,
      timezoneOffset: new Date().getTimezoneOffset() * -1,
    },
  );

  return response.data ?? [];
}

/**
 * Builds the request body for the ElementCountByStatus endpoint.
 *
 * @param processKey - Process key to filter by
 * @param packageId - Package identifier
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param version - Package version to filter by
 * @returns Request body for the ElementCountByStatus endpoint
 * @internal
 */
export function buildElementCountByStatusBody(processKey: string, packageId: string, startTime: Date, endTime: Date, version: string) {
  return {
    commonParams: {
      processKey,
      packageId,
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      version
    }
  };
}
