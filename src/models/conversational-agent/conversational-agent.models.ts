import type {
  AgentGetResponse,
  AgentGetByIdResponse
} from './agents';
import type { ConversationServiceModel } from './conversations';
import type { FeatureFlags } from './feature-flags.types';
import type { ConnectionStatus } from '@/core/websocket';

/**
 * Service for managing UiPath Conversational Agents — AI-powered chat interfaces that enable
 * natural language interactions with UiPath automation. Discover agents, create conversations,
 * and stream real-time responses over WebSocket. [UiPath Conversational Agents Guide](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/conversational-agents)
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ## How It Works
 *
 * ### Lifecycle
 *
 * ```mermaid
 * graph TD
 *     A["Agent"] -->|conversations.create| B["Conversation"]
 *     B -->|startSession| C["Session"]
 *     B -->|exchanges.getAll| F(["History"])
 *     C -->|onSessionStarted| D["Ready"]
 *     D -->|startExchange| E["Exchange"]
 *     E -->|sendMessage| G["Message"]
 * ```
 *
 * ### Real-Time Event Flow
 *
 * Once a session is started, events flow through a nested stream hierarchy:
 *
 * ```mermaid
 * graph TD
 *     S["SessionStream"]
 *     S -->|onExchangeStart| E["ExchangeStream"]
 *     S -->|onSessionEnd| SE(["session closed"])
 *     E -->|onMessageStart| M["MessageStream"]
 *     E -->|onExchangeEnd| EE(["exchange complete"])
 *     M -->|onContentPartStart| CP["ContentPartStream"]
 *     M -->|onToolCallStart| TC["ToolCallStream"]
 *     M -->|onInterruptStart| IR(["awaiting approval"])
 *     CP -->|onChunk| CH(["streaming data"])
 *     TC -->|onToolCallEnd| TCE(["tool result"])
 * ```
 *
 * ## Usage
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgent = new ConversationalAgent(sdk);
 *
 * // 1. Discover agents
 * const agents = await conversationalAgent.getAll();
 * const agent = agents[0];
 *
 * // 2. Create a conversation
 * const conversation = await agent.conversations.create({ label: 'My Chat' });
 *
 * // 3. Start real-time session and listen for responses
 * const session = conversation.startSession();
 *
 * session.onExchangeStart((exchange) => {
 *   exchange.onMessageStart((message) => {
 *     if (message.isAssistant) {
 *       message.onContentPartStart((part) => {
 *         if (part.isMarkdown) {
 *           part.onChunk((chunk) => process.stdout.write(chunk.data ?? ''));
 *         }
 *       });
 *     }
 *   });
 * });
 *
 * // 4. Wait for session to be ready, then send a message
 * session.onSessionStarted(() => {
 *   const exchange = session.startExchange();
 *   exchange.sendMessageWithContentPart({ data: 'Hello!' });
 * });
 *
 * // 5. End session when done
 * conversation.endSession();
 *
 * // 6. Retrieve conversation history (offline)
 * const exchanges = await conversation.exchanges.getAll();
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
