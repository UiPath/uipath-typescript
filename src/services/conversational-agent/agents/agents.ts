/**
 * AgentService - Service for listing available conversational agents
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type { AgentGetResponse, AgentGetByIdResponse, AgentServiceModel } from '@/models/conversational-agent';

// Utils
import { AGENT_ENDPOINTS } from '@/utils/constants/endpoints';

/**
 * Service for listing available conversational agents
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 *
 * // Get all available agent releases
 * const availableAgents = await conversationalAgentService.agents.getAll();
 *
 * // Get agent releases in a specific folder
 * const folderAgents = await conversationalAgentService.agents.getAll(folderId);
 *
 * // Get a specific agent release with appearance configuration
 * const agentDetails = await conversationalAgentService.agents.getById(folderId, agentReleaseId);
 * ```
 */
export class AgentService extends BaseService implements AgentServiceModel {
  /**
   * Creates a new AgentService instance
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
  async getAll(folderId?: number): Promise<AgentGetResponse[]> {
    const response = await this.get<AgentGetResponse[]>(AGENT_ENDPOINTS.LIST, {
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
  async getById(folderId: number, agentId: number): Promise<AgentGetByIdResponse> {
    const response = await this.get<AgentGetByIdResponse>(AGENT_ENDPOINTS.GET(folderId, agentId));
    return response.data;
  }
}
