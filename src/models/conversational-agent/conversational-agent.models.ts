import type { AgentServiceModel } from './agents';
import type { ConversationServiceModel } from './conversations';
import type { UserServiceModel } from './user';
import type { TraceServiceModel } from './traces';

/**
 * Service for managing UiPath Conversational Agents
 *
 * Conversational Agents are AI-powered chat interfaces that enable natural language interactions
 * with UiPath automation. This service provides access to:
 *
 * - **agents** - List and retrieve available conversational agents
 * - **conversations** - Manage conversations, exchanges, messages, and attachments
 * - **events** - Real-time WebSocket streaming for live chat (see [Real-time Chat Guide](/uipath-typescript/real-time-chat/))
 * - **user** - Manage user profile and context settings
 * - **traces** - Access LLM Operations traces for observability
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 *
 * // List available agents
 * const availableAgents = await conversationalAgentService.agents.getAll();
 *
 * // Create a conversation
 * const conversation = await conversationalAgentService.conversations.create({
 *   agentReleaseId: availableAgents[0].id,
 *   folderId: availableAgents[0].folderId
 * });
 *
 * // Start real-time chat session (see Real-time Chat Guide)
 * const session = conversationalAgentService.events.startSession({
 *   conversationId: conversation.id
 * });
 * ```
 */
export interface ConversationalAgentServiceModel {
  /**
   * Service for listing and retrieving conversational agents
   * {@link AgentServiceModel}
   */
  readonly agents: AgentServiceModel;

  /**
   * Service for managing conversations and related operations
   * {@link ConversationServiceModel}
   */
  readonly conversations: ConversationServiceModel;

  /**
   * Service for managing user profile and context settings
   * {@link UserServiceModel}
   */
  readonly user: UserServiceModel;

  /**
   * Service for accessing LLM Operations traces
   * {@link TraceServiceModel}
   */
  readonly traces: TraceServiceModel;
}
