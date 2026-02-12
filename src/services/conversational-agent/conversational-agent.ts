/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentServiceModel,
  FeatureFlags,
  RawAgentGetResponse,
  RawAgentGetByIdResponse,
  AgentGetResponse,
  AgentGetByIdResponse
} from '@/models/conversational-agent';
import {
  AgentMap,
  createAgentWithMethods
} from '@/models/conversational-agent';

// Utils
import { FEATURE_ENDPOINTS, AGENT_ENDPOINTS } from '@/utils/constants/endpoints';
import { transformData } from '@/utils/transform';

// Local imports
import { ConversationService } from './conversations';

/**
 * Service for interacting with UiPath Conversational Agent API
 */
export class ConversationalAgentService extends BaseService implements ConversationalAgentServiceModel {
  /** Service for creating and managing conversations. See {@link ConversationServiceModel}. */
  public readonly conversations: ConversationService;

  /**
   * Creates an instance of the ConversationalAgent service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);

    // Create conversation service with WebSocket support
    this.conversations = new ConversationService(instance);
  }

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
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this.conversations.onConnectionStatusChanged(handler);
  }


  /**
   * Gets all available conversational agents
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of agents
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
  @track('ConversationalAgent.GetAll')
  async getAll(folderId?: number): Promise<AgentGetResponse[]> {
    const response = await this.get<RawAgentGetResponse[]>(AGENT_ENDPOINTS.LIST, {
      params: folderId !== undefined ? { folderId } : undefined,
    });
    return response.data.map((agent) =>
      createAgentWithMethods(transformData(agent, AgentMap) as RawAgentGetResponse, this.conversations)
    );
  }

  /**
   * Gets a specific agent by ID
   *
   * @param id - ID of the agent release
   * @param folderId - ID of the folder containing the agent
   * @returns Promise resolving to the agent
   *
   * @example Basic usage
   * ```typescript
   * const agent = await conversationalAgent.getById(agentId, folderId);
   *
   * // Create conversation directly from agent (agentId and folderId are auto-filled)
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * ```
   */
  @track('ConversationalAgent.GetById')
  async getById(id: number, folderId: number): Promise<AgentGetByIdResponse> {
    const response = await this.get<RawAgentGetByIdResponse>(AGENT_ENDPOINTS.GET(folderId, id));
    return createAgentWithMethods(
      transformData(response.data, AgentMap) as RawAgentGetByIdResponse,
      this.conversations
    );
  }

  /**
   * Gets feature flags for the current tenant
   *
   * @internal
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    const response = await this.get<FeatureFlags>(FEATURE_ENDPOINTS.FEATURE_FLAGS);
    return response.data;
  }

}
