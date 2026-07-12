import type {
  AgentGetResponse,
  AgentGetByIdResponse
} from './agents';
import type { CitationSourceMedia, ConversationServiceModel } from './conversations';
import type { FeatureFlags } from './feature-flags.types';
import type { UserSettingsServiceModel } from './user';
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
 *     E -->|sendExchangeEnd| STOP(["stop response"])
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
 * // 5. Stop a response mid-stream
 * // Use sendExchangeEnd() on any active exchange to stop the agent
 * session.onSessionStarted(() => {
 *   const exchange = session.startExchange();
 *   exchange.sendMessageWithContentPart({ data: 'Tell me a long story' });
 *
 *   // Stop after 5 seconds
 *   setTimeout(() => exchange.sendExchangeEnd(), 5000);
 * });
 *
 * // 6. End session when done
 * conversation.endSession();
 *
 * // 7. Retrieve conversation history (offline)
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
   * Downloads the document behind a media citation as an authenticated `Blob`.
   *
   * Media citation sources expose a `downloadUrl` pointing at an auth-gated
   * UiPath endpoint; opening it directly sends no token and fails with `401`.
   * This performs the request with the SDK's access token and returns the bytes,
   * with the `Blob` type resolved from the source `mimeType` (falling back to the
   * response Content-Type, then the title's file extension). Use `source.title`
   * as the file name.
   *
   * HTML content is intentionally returned as `application/octet-stream` (a
   * download) rather than `text/html`, so previewing the blob inline can't
   * execute citation markup in your app's origin.
   *
   * @param source - A media citation source (`CitationSourceMedia`) with a `downloadUrl`
   * @returns Promise resolving to the document as a `Blob`
   * @throws ValidationError if the source has no `downloadUrl`
   * @throws A typed HTTP error for error responses — e.g. `AuthenticationError`
   *         (401), `AuthorizationError` (403), `NotFoundError` (404) — or
   *         `NetworkError` on a connection failure, matching other SDK calls
   *
   * @example
   * ```typescript
   * import { isCitationSourceMedia } from '@uipath/uipath-typescript/conversational-agent';
   *
   * if (isCitationSourceMedia(source)) {
   *   const blob = await conversationalAgent.downloadCitationSource(source);
   *   const url = URL.createObjectURL(blob);
   *   window.open(url, '_blank');
   * }
   * ```
   */
  downloadCitationSource(source: CitationSourceMedia): Promise<Blob>;

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

  /** Service for reading and updating the current user's profile/context settings. See {@link UserSettingsServiceModel}. */
  readonly user: UserSettingsServiceModel;

  /**
   * Gets feature flags for the current tenant
   *
   * @internal
   */
  getFeatureFlags(): Promise<FeatureFlags>;

}
