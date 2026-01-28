/**
 * AgentService - Service for listing available conversational agents
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type { AgentGetResponse, AgentGetByIdResponse, AgentServiceModel } from '@/models/conversational-agent';
import { AgentMap } from '@/models/conversational-agent';

// Utils
import { AGENT_ENDPOINTS } from '@/utils/constants/endpoints';
import { transformData } from '@/utils/transform';

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
 * const agentDetails = await conversationalAgentService.agents.getById(agentReleaseId, folderId);
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
   * Gets all available conversational agents
   *
   * Returns a list of agent releases that are available for creating conversations.
   * When a folder ID is provided, only agents in that folder are returned.
   *
   * @param folderId - Optional folder ID to filter agents by folder
   * @returns Promise resolving to an array of available agent releases
   *
   * @example
   * ```typescript
   * // Get all available agents
   * const agents = await conversationalAgentService.agents.getAll();
   *
   * // Get agents in a specific folder
   * const folderAgents = await conversationalAgentService.agents.getAll(123);
   * ```
   */
  @track('ConversationalAgents.GetAll')
  async getAll(folderId?: number): Promise<AgentGetResponse[]> {
    const response = await this.get<AgentGetResponse[]>(AGENT_ENDPOINTS.LIST, {
      params: folderId !== undefined ? { folderId } : undefined,
    });
    return response.data.map((agent) => transformData(agent, AgentMap) as AgentGetResponse);
  }

  /**
   * Gets a specific conversational agent by ID
   *
   * Returns detailed information about an agent release, including its
   * appearance configuration (name, description, avatar, suggested prompts).
   *
   * @param id - ID of the agent release to retrieve
   * @param folderId - ID of the folder containing the agent
   * @returns Promise resolving to the agent details including appearance configuration
   *
   * @example
   * ```typescript
   * const agent = await conversationalAgentService.agents.getById(456, 123);
   * console.log(agent.name, agent.appearance?.suggestedPrompts);
   * ```
   */
  @track('ConversationalAgents.GetById')
  async getById(id: number, folderId: number): Promise<AgentGetByIdResponse> {
    const response = await this.get<AgentGetByIdResponse>(AGENT_ENDPOINTS.GET(folderId, id));
    return transformData(response.data, AgentMap) as AgentGetByIdResponse;
  }
}
