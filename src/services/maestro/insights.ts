import { BaseService } from '../base';
import { RawGetTopResponse } from '../../models/maestro';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Base service for Maestro services that need Insights RTM functionality.
 *
 * Extends BaseService with shared methods for Insights analytics endpoints.
 * Services that call Insights RTM APIs (MaestroProcesses, Cases) extend this class.
 */
export class MaestroInsightsService extends BaseService {

  /**
   * Fetches top processes by run count from the Insights API.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param isCaseManagement - Whether to filter for case management processes
   * @returns Promise resolving to an array of top processes by run count
   * @internal
   */
  protected async fetchTopProcesses(
    startTime: Date,
    endTime: Date,
    isCaseManagement: boolean
  ): Promise<RawGetTopResponse[]> {
    const response = await this.post<RawGetTopResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES,
      {
        commonParams: {
          startTime: startTime.getTime(),
          endTime: endTime.getTime(),
          isCaseManagement
        }
      }
    );

    return response.data ?? [];
  }
}
