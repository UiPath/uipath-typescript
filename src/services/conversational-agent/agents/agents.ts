/**
 * Agents - Service for listing available conversational agents
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type { AgentRelease, AgentReleaseWithAppearance, AgentsServiceModel } from '@/models/conversational';

// Utils
import { AGENT_ENDPOINTS } from '@/utils/constants/endpoints';

/**
 * Service for listing available conversational agents
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Agents } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agents = new Agents(sdk);
 *
 * // Get all agents
 * const agentList = await agents.getAll();
 *
 * // Get agents in a specific folder
 * const agentList = await agents.getAll(123);
 *
 * // Get a specific agent with appearance
 * const agent = await agents.getById(folderId, agentId);
 * ```
 */
export class Agents extends BaseService implements AgentsServiceModel {
  /**
   * Creates a new Agents service instance
   * @param instance - UiPath SDK instance
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
  }

  /**
   * Gets all conversational agents
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns List of agents
   */
  @track('Agents.GetAll')
  async getAll(folderId?: number): Promise<AgentRelease[]> {
    const response = await this.get<AgentRelease[]>(AGENT_ENDPOINTS.LIST, {
      params: folderId !== undefined ? { folderId } : undefined,
    });
    return response.data;
  }

  /**
   * Gets a conversational agent by ID
   *
   * @param folderId - Folder ID containing the agent
   * @param agentId - Agent ID
   * @returns Agent with appearance configuration
   */
  @track('Agents.GetById')
  async getById(folderId: number, agentId: number): Promise<AgentReleaseWithAppearance> {
    const response = await this.get<AgentReleaseWithAppearance>(AGENT_ENDPOINTS.GET(folderId, agentId));
    return response.data;
  }
}
