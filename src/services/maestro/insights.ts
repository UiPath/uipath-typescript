import { BaseService } from '../base';
import { InsightsGetTopBaseResponse } from '../../models/maestro';

/**
 * Base service for Maestro services that need Insights RTM functionality.
 *
 * Extends BaseService with shared methods for Insights analytics endpoints.
 * Services that call Insights RTM APIs (MaestroProcesses, Cases) extend this class.
 */
export class MaestroInsightsService extends BaseService {

  /**
   * Fetches top processes from an Insights RTM endpoint.
   *
   * @param endpoint - The Insights RTM endpoint to call
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param isCaseManagement - Whether to filter for case management processes
   * @returns Promise resolving to an array of top processes
   * @internal
   */
  protected async fetchTop<T extends InsightsGetTopBaseResponse>(
    endpoint: string,
    startTime: Date,
    endTime: Date,
    isCaseManagement: boolean
  ): Promise<T[]> {
    const response = await this.post<T[]>(
      endpoint,
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
