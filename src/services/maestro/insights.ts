import { ApiResponse } from '../base';
import { ProcessGetTopResponse } from '../../models/maestro';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Fetches top processes by run count from the Insights API.
 * Shared implementation used by both MaestroProcessesService and CasesService.
 *
 * @param postFn - Bound post method from a BaseService subclass
 * @param startTime - Start of the time range to query
 * @param endTime - End of the time range to query
 * @param isCaseManagement - Whether to filter for case management processes
 * @returns Promise resolving to an array of top processes by run count
 * @internal
 */
export async function fetchTopProcesses(
  postFn: <T>(path: string, data?: unknown) => Promise<ApiResponse<T>>,
  startTime: Date,
  endTime: Date,
  isCaseManagement: boolean
): Promise<ProcessGetTopResponse[]> {
  const response = await postFn<ProcessGetTopResponse[]>(
    MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES,
    {
      commonParams: {
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
        isCaseManagement
      },
      timezoneOffset: 0
    }
  );

  return response.data ?? [];
}
