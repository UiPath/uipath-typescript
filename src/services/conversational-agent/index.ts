/**
 * Conversational Agent Service Module
 *
 * Provides conversational AI capabilities through:
 * - ConversationalAgent: Main entry point with WebSocket support
 * - Conversations: Conversation management (HTTP)
 * - Agents: List available agents (HTTP)
 * - User: User profile and context settings (HTTP)
 * - Traces: LLM operations tracing and observability (HTTP)
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const agent = new ConversationalAgent(sdk);
 *
 * // Conversations
 * const conversation = await agent.conversations.create({ agentReleaseId, folderId });
 * const exchanges = await agent.conversations.exchanges.getAll(conversationId);
 *
 * // Agents
 * const agentList = await agent.agents.getAll();
 *
 * // User Settings
 * const settings = await agent.user.getSettings();
 * await agent.user.updateSettings({ name: 'John', timezone: 'America/New_York' });
 *
 * // Traces (LLM Ops observability)
 * const spans = await agent.traces.getSpans(traceId);
 *
 * // WebSocket events (connection is managed automatically)
 * agent.events.onSession((session) => {
 *   session.onExchangeStart((exchange) => console.log(exchange));
 * });
 * ```
 *
 * @module
 */

// Main entry point
export { ConversationalAgent, type ConversationalAgentOptions } from './conversational-agent';

// Services (for HTTP-only usage without WebSocket)
export { Conversations } from './conversations';
export { Agents } from './agents';
export { User } from './user';
export { Traces } from './traces';

// Types (re-exported from models for convenience)
export type {
  // ID types
  ConversationId,
  ExchangeId,
  MessageId,
  ContentPartId,
  // Model types
  Conversation,
  Exchange,
  Message,
  ContentPart,
  ToolCall,
  Citation,
  // Request types
  CreateConversationInput,
  UpdateConversationInput,
  ListConversationsInput,
  ListExchangesInput,
  GetExchangeInput,
  CreateFeedbackInput,
  UpdateUserSettingsInput,
  // Response types
  ConversationCreateResponse,
  ConversationResponse,
  ConversationDeleteResponse,
  FeedbackCreateResponse,
  AttachmentUploadResponse,
  UserSettings,
  UserSettingsGetResponse,
  UserSettingsUpdateResponse,
  // Agent types
  AgentRelease,
  AgentReleaseWithAppearance,
  AgentAppearance,
  FeatureFlags,
  // LLM Ops types (Tracing/Observability)
  LlmOpsSpan,
  RawLlmOpsSpan,
  SpanAttachment
} from '@/models/conversational';

export { LlmOpsSpanStatus } from '@/models/conversational';

