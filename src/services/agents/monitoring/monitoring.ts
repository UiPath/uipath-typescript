import { BaseService } from '../../base';
import { AgentNamesGetAllOptions, AgentNamesGetAllResponse } from '../../../models/agents/monitoring/monitoring.types';
import { AgentMonitoringServiceModel } from '../../../models/agents/monitoring/monitoring.models';
import { AGENT_MONITORING_ENDPOINTS } from '../../../utils/constants/endpoints';
import { camelToPascalCaseKeys } from '../../../utils/transform';
import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';

/**
 * Service for interacting with the UiPath Agent Monitoring (real-time) API.
 */
export class AgentMonitoringService extends BaseService implements AgentMonitoringServiceModel {
  @track('AgentMonitoring.GetNames')
  async getNames(tenantId: string, options?: AgentNamesGetAllOptions): Promise<AgentNamesGetAllResponse> {
    if (!tenantId) throw new ValidationError({ message: 'tenantId is required for getNames' });

    const input: Record<string, unknown> = { tenantId };
    if (options?.folderKeys !== undefined) input.folderKeys = options.folderKeys;

    const response = await this.post<AgentNamesGetAllResponse>(
      AGENT_MONITORING_ENDPOINTS.GET_NAMES,
      camelToPascalCaseKeys(input)
    );

    return response.data;
  }
}
