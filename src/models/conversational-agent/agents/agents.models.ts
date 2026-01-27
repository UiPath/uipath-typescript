import type { AgentGetResponse, AgentGetByIdResponse } from './agents.types';

/**
 * Service for managing UiPath Conversational Agents
 *
 * Agents are conversational AI applications that can be deployed and interacted with.
 * This service provides read-only access to agent metadata and configurations.
 * [UiPath Conversational Agents Guide](https://docs.uipath.com/automation-cloud/docs/conversational-agents)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 * const availableAgents = await conversationalAgentService.agents.getAll();
 * ```
 */
export interface AgentServiceModel {
  /**
   * Gets all conversational agents
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of agents
   * {@link AgentGetResponse}
   * @example
   * ```typescript
   * // Get all available agent releases
   * const availableAgents = await conversationalAgentService.agents.getAll();
   *
   * // Get agent releases in a specific folder
   * const folderAgents = await conversationalAgentService.agents.getAll(folderId);
   * ```
   */
  getAll(folderId?: number): Promise<AgentGetResponse[]>;

  /**
   * Gets a conversational agent by ID with appearance configuration
   *
   * @param folderId - Folder ID containing the agent
   * @param agentId - Agent ID to retrieve
   * @returns Promise resolving to the agent with appearance configuration
   * {@link AgentGetByIdResponse}
   * @example
   * ```typescript
   * const agentReleaseDetails = await conversationalAgentService.agents.getById(folderId, agentReleaseId);
   * console.log(agentReleaseDetails.name);
   * console.log(agentReleaseDetails.appearance); // UI appearance configuration
   * ```
   */
  getById(folderId: number, agentId: number): Promise<AgentGetByIdResponse>;
}
