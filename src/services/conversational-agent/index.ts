/**
 * Conversational Agent Service Module
 *
 * Provides conversational AI capabilities through a single entry point:
 * - ConversationalAgent: Main service for agent listing, conversations, attachments, and real-time sessions
 *
 * All conversation operations are accessed via `conversationalAgent.conversations`.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const conversationalAgent = new ConversationalAgent(sdk);
 *
 * // List available agents
 * const agents = await conversationalAgent.getAll();
 * const agent = agents[0];
 *
 * // Create a conversation (agentId/folderId auto-filled)
 * const conversation = await agent.conversations.create({ label: 'My Chat' });
 * ```
 *
 * @module
 */

// Main entry point
export { ConversationalAgentService as ConversationalAgent, ConversationalAgentService } from './conversational-agent';

// Standalone services (HTTP-only operations)
export { Exchanges, ExchangeService, Messages, MessageService } from './conversations';

/** @internal */
export { User, UserService } from './user';

// ==================== Models ====================
// Re-export all types: ID types, model types, request/response types, event types, etc.
export * from '@/models/conversational-agent';

export { LogLevel } from '@/core/websocket';

// ==================== Event Helpers ====================
// Re-export all helpers: event helper classes, handler types, error types, etc.
export * from './helpers';
