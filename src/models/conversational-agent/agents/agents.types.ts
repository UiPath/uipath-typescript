/**
 * Types for Agent Service
 */

// ==================== Agent Types ====================

/**
 * Agent appearance configuration
 */
export interface AgentAppearance {
  /** Welcome title displayed to users */
  welcomeTitle?: string;
  /** Welcome description displayed to users */
  welcomeDescription?: string;
  /** Starting prompts for users to choose from */
  startingPrompts?: Array<{
    displayPrompt: string;
    actualPrompt: string;
    id: string;
  }>;
}

/**
 * Response for getting all agents - agent release information from v1 Agent API
 */
export interface AgentGetResponse {
  /** Unique ID of the agent release */
  id: number;
  /** Display name of the agent */
  name: string;
  /** Agent description */
  description: string;
  /** Process version */
  processVersion: string;
  /** Process key identifier */
  processKey: string;
  /** Folder ID (organization unit) */
  folderId: number;
  /** Feed ID */
  feedId: string;
  /** Creation timestamp */
  createdAt?: string;
}

/**
 * Response for getting a single agent by ID - includes appearance configuration
 */
export interface AgentGetByIdResponse extends AgentGetResponse {
  /** Agent appearance configuration */
  appearance?: AgentAppearance;
}
