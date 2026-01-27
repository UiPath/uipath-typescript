/**
 * Conversational Agent Service Module
 *
 * Provides conversational AI capabilities through:
 * - ConversationalAgent: Main entry point with WebSocket support
 * - ConversationService: Conversation management (HTTP)
 * - AgentService: List available agents (HTTP)
 * - UserService: User profile and context settings (HTTP)
 * - TraceService: LLM operations tracing and observability (HTTP)
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 *
 * // Conversations
 * const newConversation = await conversationalAgentService.conversations.create({ agentReleaseId, folderId });
 * const conversationExchanges = await conversationalAgentService.conversations.exchanges.getAll(conversationId);
 *
 * // Agents
 * const availableAgents = await conversationalAgentService.agents.getAll();
 *
 * // User Settings
 * const userSettings = await conversationalAgentService.user.getSettings();
 * await conversationalAgentService.user.updateSettings({ name: 'John', timezone: 'America/New_York' });
 *
 * // Traces (LLM Ops observability)
 * const traceSpans = await conversationalAgentService.traces.getSpans(traceId);
 *
 * // WebSocket events (connection is managed automatically)
 * conversationalAgentService.events.onSession((session) => {
 *   session.onExchangeStart((exchange) => console.log(exchange));
 * });
 * ```
 *
 * @module
 */

// Main entry point
export { ConversationalAgentService as ConversationalAgent, ConversationalAgentService, type ConversationalAgentOptions } from './conversational-agent';

// Services (for HTTP-only usage without WebSocket)
export { ConversationService as Conversations, ConversationService } from './conversations';
export { AgentService as Agents, AgentService } from './agents';
export { UserService as User, UserService } from './user';
export { TraceService as Traces, TraceService } from './traces';

// ==================== Models ====================
// Re-export all types: ID types, model types, request/response types, event types, etc.
export * from '@/models/conversational-agent';

// ==================== Event Helpers ====================
// Re-export all helpers: event helper classes, handler types, error types, etc.
export * from './helpers';
