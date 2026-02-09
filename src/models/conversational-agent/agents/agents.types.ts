/**
 * Types for Agent Service
 */

// ==================== Agent Types ====================

/**
 * Starting prompt configuration for an agent
 */
export interface AgentStartingPrompt {
  /** The prompt text displayed to the user */
  displayPrompt: string;
  /** The actual prompt sent when selected */
  actualPrompt: string;
  /** Unique identifier for the prompt */
  id: string;
}

/**
 * Agent appearance configuration
 */
export interface AgentAppearance {
  /** Welcome title displayed to users */
  welcomeTitle?: string;
  /** Welcome description displayed to users */
  welcomeDescription?: string;
  /** Starting prompts for users to choose from */
  startingPrompts?: AgentStartingPrompt[];
}

/**
 * Raw API response for getting all agents
 */
export interface RawAgentGetResponse {
  /** Unique ID of the agent */
  id: number;
  /** Display name of the agent */
  name: string;
  /** Agent description */
  description: string;
  /** Process version */
  processVersion: string;
  /** Process key identifier */
  processKey: string;
  /** Folder ID */
  folderId: number;
  /** Feed ID */
  feedId: string;
  /** Creation timestamp */
  createdTime?: string;
}

/**
 * Raw API response for getting a single agent by ID - includes appearance configuration
 */
export interface RawAgentGetByIdResponse extends RawAgentGetResponse {
  /** Agent appearance configuration */
  appearance?: AgentAppearance;
}
