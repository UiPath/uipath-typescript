import { BaseService } from '../base';
import { AgentNamesGetAllOptions, AgentNamesGetAllResponse } from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import { AGENTS_ENDPOINTS } from '../../utils/constants/endpoints';
import { camelToPascalCaseKeys } from '../../utils/transform';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with the UiPath Agents API.
 */
export class AgentService extends BaseService implements AgentServiceModel {
  /**
   * Lists all distinct agent names.
   *
   * The tenant is inferred from the authenticated JWT. Optionally scope the
   * lookup to a list of folder keys.
   *
   * @param options - Optional folder-key scoping {@link AgentNamesGetAllOptions}
   * @returns Promise resolving to {@link AgentNamesGetAllResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // List all agent names on the tenant
   * const result = await agents.getNames();
   * console.log(result.agents);
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders
   * const result = await agents.getNames({
   *   folderKeys: ['<folderKey1>', '<folderKey2>'],
   * });
   * ```
   */
  @track('Agents.GetNames')
  async getNames(options?: AgentNamesGetAllOptions): Promise<AgentNamesGetAllResponse> {
    const input: Record<string, unknown> = {};
    if (options?.folderKeys !== undefined) input.folderKeys = options.folderKeys;

    const response = await this.post<AgentNamesGetAllResponse>(
      AGENTS_ENDPOINTS.GET_NAMES,
      camelToPascalCaseKeys(input)
    );

    return response.data;
  }
}
