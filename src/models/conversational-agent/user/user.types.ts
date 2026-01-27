/**
 * Types for User Service
 */

// ==================== User Settings Types ====================

/**
 * User settings containing profile and context information
 *
 * These settings are passed to the agent for all conversations
 * to provide user context.
 *
 * @example
 * ```typescript
 * const userSettings = await conversationalAgentService.user.getSettings();
 * console.log(userSettings.name, userSettings.email);
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

/**
 * Input for updating user settings
 *
 * All fields are optional - only send the fields you want to change.
 * Set fields to `null` to explicitly clear them.
 * Omitting fields means no change.
 *
 * @example
 * ```typescript
 * // Update specific fields
 * await conversationalAgentService.user.updateSettings({
 *   name: 'John Doe',
 *   timezone: 'America/New_York'
 * });
 *
 * // Clear a field by setting to null
 * await conversationalAgentService.user.updateSettings({
 *   department: null
 * });
 * ```
 */
export interface UpdateUserSettingsInput {
  /** Name of the user (max 100 chars) */
  name?: string | null;
  /** Email address (max 255 chars, must be valid email) */
  email?: string | null;
  /** Role of the user (max 100 chars) */
  role?: string | null;
  /** Department (max 100 chars) */
  department?: string | null;
  /** Company (max 100 chars) */
  company?: string | null;
  /** Country (max 100 chars) */
  country?: string | null;
  /** Timezone (max 50 chars) */
  timezone?: string | null;
}
