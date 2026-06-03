import { ApiResponse } from '../base';
import { IncidentTimelinePoint, InstanceStatusTimelineResponse, TimelineOptions } from '../../models/maestro';
import type { MaestroProcessStatsRequest, TopQueryOptions } from '../../models/maestro';
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
 * Fetches incident counts bucketed by time from the Insights API.
 * Shared implementation used by both MaestroProcessesService and CasesService.
 *
 * @param postFn - Bound post method from a BaseService subclass
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @param options - Optional settings for time bucketing granularity
 * @returns Promise resolving to an array of incident timeline data points
 * @internal
 */
export async function fetchIncidentsTimeline(
  postFn: <T>(path: string, data?: unknown) => Promise<ApiResponse<T>>,
  startTime: Date,
  endTime: Date,
  isCaseManagement: boolean,
  options?: TimelineOptions,
): Promise<IncidentTimelinePoint[]> {
  const response = await postFn<{ dataPoints?: IncidentTimelinePoint[] }>(
    MAESTRO_ENDPOINTS.INSIGHTS.INCIDENTS_BY_TIME_WINDOW,
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

  return response.data?.dataPoints ?? [];
}

/**
 * Builds the commonParams request body for Insights RTM endpoints
 * that filter by process key, package, time range, and version.
 *
 * @param request - Process scope + time range to aggregate over
 * @returns Request body with commonParams
 * @internal
 */
export function buildInsightsCommonBody(request: MaestroProcessStatsRequest) {
  return {
    commonParams: {
      processKey: request.processKey,
      packageId: request.packageId,
      startTime: request.startTime.getTime(),
      endTime: request.endTime.getTime(),
      version: request.packageVersion
    }
  };
}
