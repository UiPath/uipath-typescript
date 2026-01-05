/**
 * User - Service for managing user profile and context settings
 */

// Core SDK imports
import type { UiPath } from '@/core/uipath';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  UpdateUserSettingsInput,
  UserSettings,
  UserSettingsGetResponse,
  UserSettingsUpdateResponse
} from '@/models/conversational';

// Utils
import { USER_ENDPOINTS } from '@/utils/constants/endpoints';

/**
 * Service for managing user profile and context settings
 *
 * User settings are passed to the agent for all conversations
 * to provide user context (name, email, role, timezone, etc.).
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
 * // Get current user settings
 * const settings = await agent.user.getSettings();
 * console.log(settings.name, settings.email, settings.timezone);
 *
 * // Update user settings
 * const updated = await agent.user.updateSettings({
 *   name: 'John Doe',
 *   timezone: 'America/New_York'
 * });
 *
 * // Clear a field by setting to null
 * await agent.user.updateSettings({
 *   department: null
 * });
 * ```
 */
export class User extends BaseService {
  constructor(instance: UiPath) {
    super(instance);
  }

  /**
   * Gets the current user's profile and context settings
   *
   * @returns User settings object containing profile information
   *
   * @example
   * ```typescript
   * const settings = await agent.user.getSettings();
   * console.log(settings.name);      // User's name
   * console.log(settings.email);     // User's email
   * console.log(settings.timezone);  // User's timezone
   * ```
   */
  @track('User.GetSettings')
  async getSettings(): Promise<UserSettings> {
    const response = await this.get<UserSettingsGetResponse>(USER_ENDPOINTS.SETTINGS);
    return response.data;
  }

  /**
   * Updates the current user's profile and context settings
   *
   * All fields are optional - only send the fields you want to change.
   * Set fields to `null` to explicitly clear them.
   * Omitting fields means no change.
   *
   * @param input - Fields to update
   * @returns Updated user settings object
   *
   * @example
   * ```typescript
   * // Update specific fields
   * const updated = await agent.user.updateSettings({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   timezone: 'America/New_York'
   * });
   *
   * // Partial update - only change timezone
   * await agent.user.updateSettings({
   *   timezone: 'Europe/London'
   * });
   *
   * // Clear fields by setting to null
   * await agent.user.updateSettings({
   *   role: null,
   *   department: null
   * });
   * ```
   */
  @track('User.UpdateSettings')
  async updateSettings(input: UpdateUserSettingsInput): Promise<UserSettings> {
    const response = await this.patch<UserSettingsUpdateResponse>(USER_ENDPOINTS.SETTINGS, input);
    return response.data;
  }
}
