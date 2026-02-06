/**
 * Agent Service Models
 *
 * Provides fluent API for agent objects returned from getAll() and getById().
 */

import type { RawAgentGetResponse, RawAgentGetByIdResponse } from './agents.types';
import type {
  ConversationServiceModel,
  ConversationGetResponse,
  CreateConversationOptions
} from '../conversations';

/**
 * Options for creating a conversation from an agent (without agentId/folderId)
 */
export type AgentCreateConversationOptions = Omit<CreateConversationOptions, 'agentId' | 'folderId'>;

/**
 * Scoped conversation service for a specific agent.
 * Auto-fills agentId and folderId from the agent.
 */
export interface AgentConversationServiceModel {
  /**
   * Creates a conversation for this agent
   *
   * @param options - Optional conversation options (label, etc.)
   * @returns Promise resolving to the created conversation with methods
   *
   * @example
   * ```typescript
   * const agent = (await conversationalAgent.getAll())[0];
   * const conversation = await agent.conversations.create({ label: 'My Chat' });
   * const session = conversation.startSession();
   * ```
   */
  create(options?: AgentCreateConversationOptions): Promise<ConversationGetResponse>;
}

/**
 * Methods added to agent objects
 */
export interface AgentMethods {
  /**
   * Scoped conversation operations for this agent.
   * Methods automatically use this agent's id and folderId.
   */
  readonly conversations: AgentConversationServiceModel;
}

/**
 * Agent response with fluent methods (from getAll)
 */
export type AgentGetResponse = RawAgentGetResponse & AgentMethods;

/**
 * Agent response with fluent methods (from getById)
 */
export type AgentGetByIdResponse = RawAgentGetByIdResponse & AgentMethods;

/**
 * Creates methods for an agent
 */
function createAgentMethods(
  agentData: RawAgentGetResponse,
  conversationService: ConversationServiceModel
): AgentMethods {
  const agentConversations: AgentConversationServiceModel = {
    async create(options: AgentCreateConversationOptions = {}): Promise<ConversationGetResponse> {
      return conversationService.create({
        ...options,
        agentId: agentData.id,
        folderId: agentData.folderId
      });
    }
  };

  return {
    conversations: agentConversations
  };
}

/**
 * Creates an agent with fluent methods
 *
 * @param agentData - The agent data from API
 * @param conversationService - The conversation service instance
 * @returns Agent object with added methods
 */
export function createAgentWithMethods(
  agentData: RawAgentGetResponse,
  conversationService: ConversationServiceModel
): AgentGetResponse {
  const methods = createAgentMethods(agentData, conversationService);
  return Object.assign({}, agentData, methods) as AgentGetResponse;
}

/**
 * Creates an agent (from getById) with fluent methods
 *
 * @param agentData - The agent data from API (includes appearance)
 * @param conversationService - The conversation service instance
 * @returns Agent object with added methods
 */
export function createAgentByIdWithMethods(
  agentData: RawAgentGetByIdResponse,
  conversationService: ConversationServiceModel
): AgentGetByIdResponse {
  const methods = createAgentMethods(agentData, conversationService);
  return Object.assign({}, agentData, methods) as AgentGetByIdResponse;
}
