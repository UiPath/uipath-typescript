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
  /**
   * Lists all distinct agent names visible to the caller on the given tenant.
   *
   * Returns the full set of agent names that have run on the tenant, optionally
   * scoped to a list of folder keys.
   *
   * @param tenantId - Tenant identifier (GUID). Must match the JWT's tenant
   * @param options - Optional folder-key scoping {@link AgentNamesGetAllOptions}
   * @returns Promise resolving to {@link AgentNamesGetAllResponse}
   * @example
   * ```typescript
   * import { AgentMonitoring } from '@uipath/uipath-typescript/agent-monitoring';
   *
   * const agentMonitoring = new AgentMonitoring(sdk);
   *
   * // List all agent names on the tenant
   * const result = await agentMonitoring.getNames('<tenantId>');
   * console.log(result.agents);
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders
   * const result = await agentMonitoring.getNames('<tenantId>', {
   *   folderKeys: ['<folderKey1>', '<folderKey2>'],
   * });
   * ```
   */
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
