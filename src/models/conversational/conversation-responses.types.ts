/**
 * Response/Output types for Conversational Agent Service
 */

import type { Conversation } from './conversation-api.types';

// ==================== Conversation Responses ====================

/**
 * Response for creating a conversation - returns full Conversation object
 * Matches AgentInterfaces: ConversationCreateOutput = ConversationSchema
 */
export interface ConversationCreateResponse extends Conversation {}

/**
 * Response for getting a conversation - returns full Conversation object
 */
export interface ConversationResponse extends Conversation {}

/**
 * Response for deleting a conversation - returns the deleted Conversation object
 * Matches AgentInterfaces: ConversationDeleteOutput = ConversationSchema
 */
export interface ConversationDeleteResponse extends Conversation {}

// ==================== Feedback Responses ====================

export interface FeedbackCreateResponse {}

// ==================== Attachment Responses ====================

export interface AttachmentUploadResponse {
  uri: string;
  name: string;
  mimeType: string;
}

// ==================== Agent Release Responses ====================

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
 * Agent release information from v1 Agent API
 */
export interface AgentRelease {
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
 * Extended agent release information with appearance (from getById)
 */
export interface AgentReleaseWithAppearance extends AgentRelease {
  /** Agent appearance configuration */
  appearance?: AgentAppearance;
}

// ==================== Internal API Responses ====================

export interface AttachmentCreateApiResponse {
  uri: string;
  name: string;
  fileUploadAccess: {
    url: string;
    verb: string;
    headers: { keys: string[]; values: string[] };
    requiresAuth?: boolean;
  };
}

// ==================== Feature Flags ====================

/**
 * Feature flags for conversational agent capabilities
 *
 * Common flags include:
 * - audioStreamingEnabled: Whether audio streaming is available
 * - fileAttachmentEnabled: Whether file attachments are allowed
 *
 * @example
 * ```typescript
 * const flags = await agent.getFeatureFlags();
 * if (flags.audioStreamingEnabled) {
 *   // Enable audio UI
 * }
 * ```
 */
export type FeatureFlags = Record<string, unknown>;

// ==================== User Settings Responses ====================

/**
 * User settings containing profile and context information
 *
 * These settings are passed to the agent for all conversations
 * to provide user context.
 *
 * @example
 * ```typescript
 * const settings = await agent.user.getSettings();
 * console.log(settings.name, settings.email);
 * ```
 */
export interface UserSettings {
  /** Unique identifier of the user (UUID) */
  userId: string;
  /** Name of the user (max 100 chars) */
  name: string | null;
  /** Email address (max 255 chars, must be valid email) */
  email: string | null;
  /** Role of the user (max 100 chars) */
  role: string | null;
  /** Department (max 100 chars) */
  department: string | null;
  /** Company (max 100 chars) */
  company: string | null;
  /** Country (max 100 chars) */
  country: string | null;
  /** Timezone (max 50 chars) */
  timezone: string | null;
  /** UTC timestamp of creation */
  createdAt: string;
  /** UTC timestamp of last update */
  updatedAt: string;
}

/**
 * Response for getting user settings
 */
export interface UserSettingsGetResponse extends UserSettings {}

/**
 * Response for updating user settings
 */
export interface UserSettingsUpdateResponse extends UserSettings {}
