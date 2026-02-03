/**
 * ConversationalAgentService - Main entry point for Conversational Agent functionality
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { ConnectionStatus } from '@/core/websocket';
import type { ConnectionStatusChangedHandler } from '@/core/websocket';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentServiceModel,
  ConversationalAgentOptions,
  FeatureFlags,
  AgentGetResponse,
  AgentGetByIdResponse,
  AgentGetResponseWithMethods,
  AgentGetByIdResponseWithMethods
} from '@/models/conversational-agent';
import {
  AgentMap,
  createAgentWithMethods,
  createAgentByIdWithMethods
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
  /** Service for conversation operations including real-time WebSocket support */
  public readonly conversations: ConversationService;

  /**
   * Creates an instance of the ConversationalAgent service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration
   */
  constructor(instance: IUiPathSDK, options?: ConversationalAgentOptions) {
    super(instance);

    // Create conversation service with WebSocket support
    this.conversations = new ConversationService(instance, options);
  }

  // ==================== Agent Operations ====================

  /**
   * Gets all available conversational agents
   *
   * Returns agents with helper methods attached via `createAgentWithMethods()`.
   * Each agent has a `conversations.create()` method that simplifies
   * creating conversations without manually passing `agentReleaseId` and `folderId`.
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of available agents with helper methods
   *
   * @example Basic usage - get agents and create conversation
   * ```typescript
   * const agents = await conversationalAgent.getAll();
   * const agent = agents[0];
   *
   * // Create conversation directly from agent (agentReleaseId and folderId are auto-filled)
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * ```
   *
   * @example Complete workflow - agent to session with real-time chat
   * ```typescript
   * // Get all agents
   * const agents = await conversationalAgent.getAll();
   * const agent = agents.find(a => a.name === 'Customer Support Bot');
   *
   * // Create conversation (no need to pass agentReleaseId/folderId - auto-filled)
   * const conversation = await agent.conversations.create({
   *   label: 'Support Session'
   * });
   *
   * // Start real-time session
   * const session = conversation.startSession();
   *
   * // Listen for AI responses using helper methods
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     // Use message.isAssistant to filter AI responses
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         // Use part.isText to check content type
   *         if (part.isText) {
   *           part.onChunk((chunk) => {
   *             process.stdout.write(chunk.data ?? '');
   *           });
   *         }
   *       });
   *     }
   *   });
   * });
   *
   * // Send user prompt
   * session.sendPrompt({ text: 'Hello, I need help with my order' });
   * ```
   *
   * @example Filter agents by folder
   * ```typescript
   * // Get agents from a specific folder
   * const agents = await conversationalAgent.getAll(123);
   * ```
   *
   * @example Accessing agent properties (from AgentGetResponse)
   * ```typescript
   * const agents = await conversationalAgent.getAll();
   * for (const agent of agents) {
   *   console.log(`Agent: ${agent.name}`);
   *   console.log(`  ID: ${agent.id}`);
   *   console.log(`  Folder ID: ${agent.folderId}`);
   *   console.log(`  Description: ${agent.description ?? 'N/A'}`);
   * }
   * ```
   */
  @track('ConversationalAgent.GetAll')
  async getAll(folderId?: number): Promise<AgentGetResponseWithMethods[]> {
    const response = await this.get<AgentGetResponse[]>(AGENT_ENDPOINTS.LIST, {
      params: folderId !== undefined ? { folderId } : undefined,
    });
    return response.data.map((agent) =>
      createAgentWithMethods(transformData(agent, AgentMap) as AgentGetResponse, this.conversations)
    );
  }

  /**
   * Gets a specific agent by ID
   *
   * Returns the agent with helper methods attached via `createAgentByIdWithMethods()`.
   * The returned agent has a `conversations.create()` method that simplifies
   * creating conversations without manually passing `agentReleaseId` and `folderId`.
   *
   * @param id - ID of the agent release
   * @param folderId - ID of the folder containing the agent
   * @returns Promise resolving to the agent details with helper methods
   *
   * @example Basic usage
   * ```typescript
   * const agent = await conversationalAgent.getById(agentId, folderId);
   *
   * // Create conversation directly from agent (agentReleaseId and folderId are auto-filled)
   * const conversation = await agent.conversations.create();
   * ```
   *
   * @example Complete workflow - agent to real-time chat
   * ```typescript
   * // Get specific agent
   * const agent = await conversationalAgent.getById(123, 456);
   *
   * // Create conversation with label (agentReleaseId/folderId auto-filled)
   * const conversation = await agent.conversations.create({
   *   label: 'Customer Inquiry'
   * });
   *
   * // Start real-time session
   * const session = conversation.startSession();
   *
   * // Handle streaming responses using helper methods
   * session.onExchangeStart((exchange) => {
   *   exchange.onMessageStart((message) => {
   *     // Filter for assistant messages only
   *     if (message.isAssistant) {
   *       message.onContentPartStart((part) => {
   *         // Handle text content
   *         if (part.isText) {
   *           part.onChunk((chunk) => console.log(chunk.data));
   *         }
   *       });
   *     }
   *   });
   * });
   *
   * // Send message
   * session.sendPrompt({ text: 'What are your business hours?' });
   * ```
   */
  @track('ConversationalAgent.GetById')
  async getById(id: number, folderId: number): Promise<AgentGetByIdResponseWithMethods> {
    const response = await this.get<AgentGetByIdResponse>(AGENT_ENDPOINTS.GET(folderId, id));
    return createAgentByIdWithMethods(
      transformData(response.data, AgentMap) as AgentGetByIdResponse,
      this.conversations
    );
  }

  /**
   * Gets feature flags for the current tenant
   *
   * @returns Promise resolving to feature flags object
   *
   * @example
   * ```typescript
   * const flags = await conversationalAgent.getFeatureFlags();
   * ```
   */
  async getFeatureFlags(): Promise<FeatureFlags> {
    const response = await this.get<FeatureFlags>(FEATURE_ENDPOINTS.FEATURE_FLAGS);
    return response.data;
  }

  // ==================== Connection Management ====================

  /**
   * Disconnects from WebSocket and releases all session resources
   *
   * @example
   * ```typescript
   * conversationalAgent.disconnect();
   * ```
   */
  disconnect(): void {
    this.conversations.disconnectAll();
  }

  /**
   * Current connection status
   */
  get connectionStatus(): ConnectionStatus {
    return this.conversations.connectionStatus;
  }

  /**
   * Whether WebSocket is connected
   */
  get isConnected(): boolean {
    return this.conversations.isConnected;
  }

  /**
   * Current connection error, if any
   */
  get connectionError(): Error | null {
    return this.conversations.connectionError;
  }

  /**
   * Registers a handler for connection status changes
   *
   * @param handler - Callback function to handle status changes
   * @returns Cleanup function to remove handler
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void {
    return this.conversations.onConnectionStatusChanged(handler);
  }
}
