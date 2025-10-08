import { BaseService } from '../base';
import { track } from '../../core/telemetry';
import { transformData } from '../../utils/transform';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { ProcessIncidentSummaryMap } from '../../models/maestro/process-incidents.constants';

import type { ProcessIncidentGetAllResponse } from '../../models/maestro/process-incidents.types';
import type { RawIncidentSummaryResponse } from '../../models/maestro/process-incidents.internal-types';
import type { ProcessIncidentsServiceModel } from '../../models/maestro/process-incidents.models';

/**
 * Service class for Maestro Process Incidents
 */
export class ProcessIncidentsService extends BaseService implements ProcessIncidentsServiceModel {
  /**
   * Get all incidents summary for all processes
   * 
   * @returns Promise resolving to array of incident summaries
   * {@link ProcessIncidentGetAllResponse}
   * @example
   * ```typescript
   * // Get all incidents summary
   * const incidents = await sdk.maestro.processes.incidents.getAll();
   * 
   * // Access incident summary information
   * for (const incident of incidents) {
   *   console.log(`Process: ${incident.processKey}`);
   *   console.log(`Error: ${incident.errorMessage}`);
   *   console.log(`Count: ${incident.count}`);
   *   console.log(`First occurrence: ${incident.firstOccuranceTime}`);
   * }
   * ```
   */
  @track('ProcessIncidents.getAll')
  async getAll(): Promise<ProcessIncidentGetAllResponse[]> {
    const rawResponse = await this.get<RawIncidentSummaryResponse[]>(
      MAESTRO_ENDPOINTS.INCIDENTS.GET_ALL
    );

    // Transform field names  
    const data = rawResponse.data || [];
    return data.map(incident => 
      transformData(incident, ProcessIncidentSummaryMap) as unknown as ProcessIncidentGetAllResponse
    );
  }

}