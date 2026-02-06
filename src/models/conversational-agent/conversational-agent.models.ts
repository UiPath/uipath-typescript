import type { ConnectionStatus, ConnectionStatusChangedHandler } from '@/core/websocket';

import type {
  AgentGetResponse,
  AgentGetByIdResponse
} from './agents';
import type { ConversationServiceModel } from './conversations';
import type { FeatureFlags } from './feature-flags.types';

/**
 * Service for managing UiPath Conversational Agents
 *
 * Conversational Agents are AI-powered chat interfaces that enable natural language interactions
 * with UiPath automation.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
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
 * const conversation = await conversationalAgent.conversations.create({
 *   agentId: agents[0].id,
 *   folderId: agents[0].folderId
 * });
 *
 * // Start real-time chat session
 * const session = conversation.startSession();
 * ```
 */
export interface ConversationalAgentServiceModel {
  /**
   * Gets all available conversational agents
   *
   * Returns agents with helper methods attached via `createAgentWithMethods()`.
   * Each agent has a `conversations.create()` method that simplifies
   * creating conversations without manually passing `agentId` and `folderId`.
   *
   * @param folderId - Optional folder ID to filter agents
   * @returns Promise resolving to an array of agents with helper methods
   * {@link AgentGetResponse}
   *
   * @example Basic usage - get agents and create conversation
   * ```typescript
   * const agents = await conversationalAgent.getAll();
   * const agent = agents[0];
   *
   * // Create conversation directly from agent (agentId and folderId are auto-filled)
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * ```
   *
   * @example Complete workflow - agent to session with real-time chat
   * ```typescript
   * // Get all agents
   * const agents = await conversationalAgent.getAll();
   * const agent = agents.find(a => a.name === 'Customer Support Bot');
   *
   * // Create conversation (no need to pass agentId/folderId - auto-filled)
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
  getAll(folderId?: number): Promise<AgentGetResponse[]>;

  /**
   * Gets a specific agent by ID
   *
   * Returns the agent with helper methods attached via `createAgentByIdWithMethods()`.
   * The returned agent has a `conversations.create()` method that simplifies
   * creating conversations without manually passing `agentId` and `folderId`.
   *
   * @param id - ID of the agent release
   * @param folderId - ID of the folder containing the agent
   * @returns Promise resolving to the agent with helper methods
   * {@link AgentGetByIdResponse}
   *
   * @example Basic usage
   * ```typescript
   * const agent = await conversationalAgent.getById(agentId, folderId);
   *
   * // Create conversation directly from agent (agentId and folderId are auto-filled)
   * const conversation = await agent.conversations.create();
   * ```
   *
   * @example Complete workflow - agent to real-time chat
   * ```typescript
   * // Get specific agent
   * const agent = await conversationalAgent.getById(123, 456);
   *
   * // Create conversation with label (agentId/folderId auto-filled)
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
  getById(id: number, folderId: number): Promise<AgentGetByIdResponse>;

  /**
   * Service for managing conversations
   * @internal
   */
  readonly conversations: ConversationServiceModel;

  // ==================== Feature Flags ====================

  /**
   * Gets feature flags for the current tenant
   *
   * @returns Promise resolving to feature flags object
   * @example
   * ```typescript
   * const flags = await conversationalAgent.getFeatureFlags();
   * ```
   */
  getFeatureFlags(): Promise<FeatureFlags>;

  // ==================== Connection Management ====================

  /**
   * Disconnects from WebSocket and releases all session resources
   *
   * @example
   * ```typescript
   * conversationalAgent.disconnect();
   * ```
   */
  disconnect(): void;

  /**
   * Current connection status
   * {@link ConnectionStatus}
   */
  readonly connectionStatus: ConnectionStatus;

  /**
   * Whether WebSocket is connected
   */
  readonly isConnected: boolean;

  /**
   * Current connection error, if any
   */
  readonly connectionError: Error | null;

  /**
   * Registers a handler for connection status changes
   *
   * @param handler - Callback function to handle status changes
   * @returns Cleanup function to remove handler
   * @example
   * ```typescript
   * const cleanup = conversationalAgent.onConnectionStatusChanged((status) => {
   *   console.log('Connection status:', status);
   * });
   *
   * // Later, remove the handler
   * cleanup();
   * ```
   */
  onConnectionStatusChanged(handler: ConnectionStatusChangedHandler): () => void;
}
