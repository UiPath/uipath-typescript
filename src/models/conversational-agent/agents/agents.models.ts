import type { AgentGetResponse, AgentGetByIdResponse } from './agents.types';

/**
 * Service for managing UiPath Conversational Agents
 *
 * Agents are conversational AI applications that can be deployed and interacted with.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 *
 * // Get all available agents
 * const availableAgents = await conversationalAgentService.agents.getAll();
 *
 * // Get the agent ID to use for creating conversations
 * const agentId = availableAgents[0].id;
 * const folderId = availableAgents[0].folderId;
 * ```
 */
export interface AgentServiceModel {
  /**
   * Get all available conversational agents
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of agents
   * {@link AgentGetResponse}
   * @example
   * ```typescript
   * // Get all available agents
   * const availableAgents = await conversationalAgentService.agents.getAll();
   *
   * // Get the agent ID and folder ID for creating conversations
   * const { id: agentId, folderId } = availableAgents[0];
   *
   * // Get agents in a specific folder
   * const folderAgents = await conversationalAgentService.agents.getAll(folderId);
   * ```
   */
  getAll(folderId?: number): Promise<AgentGetResponse[]>;

  /**
   * Gets a conversational agent by ID with appearance configuration
   *
   * @param id - Agent ID to retrieve
   * @param folderId - Folder ID containing the agent
   * @returns Promise resolving to the agent with appearance configuration
   * {@link AgentGetByIdResponse}
   * @example
   * ```typescript
   * const agentDetails = await conversationalAgentService.agents.getById(agentId, folderId);
   * console.log(agentDetails.name);
   * console.log(agentDetails.appearance); // UI appearance configuration
   * ```
   */
  getById(id: number, folderId: number): Promise<AgentGetByIdResponse>;
}
