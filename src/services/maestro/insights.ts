import { ApiResponse } from '../base';
import { InstanceStatusTimelineResponse, TimelineOptions } from '../../models/maestro';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Builds the request body for Insights RTM "top" endpoints.
 *
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @returns Request body for the Insights RTM endpoint
 * @internal
 */
export function buildInsightsTopBody(startTime: Date, endTime: Date, isCaseManagement: boolean) {
  return {
    commonParams: {
      startTime: startTime.getTime(),
      endTime: endTime.getTime(),
      isCaseManagement
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
