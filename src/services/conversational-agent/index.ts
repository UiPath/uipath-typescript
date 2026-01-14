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

// ==================== Models ====================
// Re-export all types: ID types, model types, request/response types, event types, etc.
export * from '@/models/conversational';

// ==================== Event Helpers ====================
// Re-export all helpers: event helper classes, handler types, error types, etc.
export * from './helpers';

