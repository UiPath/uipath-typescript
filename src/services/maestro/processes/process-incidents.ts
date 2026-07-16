import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { transformData } from '../../../utils/transform';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ProcessIncidentSummaryMap } from '../../../models/maestro/process-incidents.constants';

import type { ProcessIncidentGetAllResponse } from '../../../models/maestro/process-incidents.types';
import type { RawIncidentGetAllResponse } from '../../../models/maestro/process-incidents.internal-types';
import type { ProcessIncidentsServiceModel } from '../../../models/maestro/process-incidents.models';

/**
 * Service class for Maestro Process Incidents
 */
export class ProcessIncidentsService extends BaseService implements ProcessIncidentsServiceModel {
  @track('ProcessIncidents.getAll')
  async getAll(): Promise<ProcessIncidentGetAllResponse[]> {
    const rawResponse = await this.get<RawIncidentGetAllResponse[]>(
      MAESTRO_ENDPOINTS.INCIDENTS.GET_ALL
    );

    // Transform field names  
    const data = rawResponse.data || [];
    return data.map(incident => 
      transformData(incident, ProcessIncidentSummaryMap) as unknown as ProcessIncidentGetAllResponse
    );
  }

}