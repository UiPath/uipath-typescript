/**
 * Agent Service Models
 *
 * Provides fluent API for agent objects returned from getAll() and getById().
 */

import type { ConnectionStatus } from '@/core/websocket';

import type { RawAgentGetResponse, RawAgentGetByIdResponse } from './agents.types';
import type {
  ConversationServiceModel,
  ConversationCreateResponse,
  ConversationCreateOptions
} from '../conversations';

/**
 * Options for creating a conversation from an agent
 */
export type AgentCreateConversationOptions = ConversationCreateOptions;

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
  create(options?: AgentCreateConversationOptions): Promise<ConversationCreateResponse>;
}

/**
 * Methods added to agent objects
 */
export interface AgentMethods {
  /** Scoped conversation operations for this agent */
  readonly conversations: AgentConversationServiceModel;

  /** Current WebSocket connection status */
  get connectionStatus(): ConnectionStatus;

  /** Whether the WebSocket connection is currently active */
  get isConnected(): boolean;

  /** Current connection error, or `null` if none */
  get connectionError(): Error | null;
}

/**
 * Agent combining {@link RawAgentGetResponse} metadata with {@link AgentMethods} for conversation and connection management
 */
export type AgentGetResponse = RawAgentGetResponse & AgentMethods;

/**
 * Agent combining {@link RawAgentGetByIdResponse} metadata with {@link AgentMethods} for conversation and connection management
 */
export type AgentGetByIdResponse = RawAgentGetByIdResponse & AgentMethods;

/**
 * Creates methods for an agent
 *
 * @param agentData - The agent data from API
 * @param conversationService - The conversation service instance for delegation
 * @returns Object containing agent methods
 */
function createAgentMethods(
  agentData: RawAgentGetResponse,
  conversationService: ConversationServiceModel
): AgentMethods {
  const agentConversations: AgentConversationServiceModel = {
    async create(options: AgentCreateConversationOptions = {}): Promise<ConversationCreateResponse> {
      return conversationService.create(agentData.id, agentData.folderId, options);
    }
  };

  return {
    conversations: agentConversations,
    get connectionStatus() { return conversationService.connectionStatus; },
    get isConnected() { return conversationService.isConnected; },
    get connectionError() { return conversationService.connectionError; }
  };
}

export function createAgentWithMethods<T extends RawAgentGetResponse>(
  agentData: T,
  conversationService: ConversationServiceModel
): T & AgentMethods {
  const methods = createAgentMethods(agentData, conversationService);
  return Object.defineProperties(
    Object.assign({}, agentData),
    Object.getOwnPropertyDescriptors(methods)
  ) as T & AgentMethods;
}
