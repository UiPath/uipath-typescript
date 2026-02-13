import type {
  AgentGetResponse,
  AgentGetByIdResponse
} from './agents';
import type { ConversationServiceModel } from './conversations';
import type { FeatureFlags } from './feature-flags.types';
import type { ConnectionStatus } from '@/core/websocket';

/**
 * Service for managing UiPath Conversational Agents
 *
 * Conversational Agents are AI-powered chat interfaces that enable natural language interactions
 * with UiPath automation.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgent = new ConversationalAgent(sdk);
 *
 * // List available agents
 * const agents = await conversationalAgent.getAll();
 *
 * // Create a conversation with an agent
 * const conversation = await conversationalAgent.conversations.create(
 *   agents[0].id,
 *   agents[0].folderId
 * );
 * ```
 */
export interface ConversationalAgentServiceModel {
  /**
   * Gets all available conversational agents
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of agents
   * {@link AgentGetResponse}
   *
   * @example Basic usage
   * ```typescript
   * const agents = await conversationalAgent.getAll();
   * const agent = agents[0];
   *
   * // Create conversation directly from agent (agentId and folderId are auto-filled)
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * ```
   *
   * @example Filter agents by folder
   * ```typescript
   * const agents = await conversationalAgent.getAll(folderId);
   * ```
   */
  getAll(folderId?: number): Promise<AgentGetResponse[]>;

  /**
   * Gets a specific agent by ID
   *
   * @param id - ID of the agent release
   * @param folderId - ID of the folder containing the agent
   * @returns Promise resolving to the agent
   * {@link AgentGetByIdResponse}
   *
   * @example Basic usage
   * ```typescript
   * const agent = await conversationalAgent.getById(agentId, folderId);
   *
   * // Create conversation directly from agent (agentId and folderId are auto-filled)
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * ```
   */
  getById(id: number, folderId: number): Promise<AgentGetByIdResponse>;

  /**
   * Registers a handler that is called whenever the WebSocket connection status changes.
   *
   * @param handler - Callback receiving a {@link ConnectionStatus} (`'Disconnected'` | `'Connecting'` | `'Connected'`) and an optional `Error`
   * @returns Cleanup function to remove the handler
   *
   * @example
   * ```typescript
   * const cleanup = conversationalAgent.onConnectionStatusChanged((status, error) => {
   *   console.log('Connection status:', status);
   *   if (error) {
   *     console.error('Connection error:', error.message);
   *   }
   * });
   *
   * // Later, remove the handler
   * cleanup();
   * ```
   */
  onConnectionStatusChanged(handler: (status: ConnectionStatus, error: Error | null) => void): () => void;

  /** Service for creating and managing conversations. See {@link ConversationServiceModel}. */
  readonly conversations: ConversationServiceModel;

  /**
   * Gets feature flags for the current tenant
   *
   * @internal
   */
  getFeatureFlags(): Promise<FeatureFlags>;

}
