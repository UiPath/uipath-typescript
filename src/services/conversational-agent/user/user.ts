/**
 * UserService - Service for managing user profile and context settings
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  UpdateUserSettingsInput,
  UserServiceModel,
  UserSettings,
  UserSettingsGetResponse,
  UserSettingsUpdateResponse
} from '@/models/conversational-agent';

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
 * const conversationalAgentService = new ConversationalAgent(sdk);
 *
 * // Get current user settings
 * const userSettings = await conversationalAgentService.user.getSettings();
 * console.log(userSettings.name, userSettings.email, userSettings.timezone);
 *
 * // Update user settings
 * const updatedUserSettings = await conversationalAgentService.user.updateSettings({
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
export class UserService extends BaseService implements UserServiceModel {
  /**
   * Creates an instance of the User service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPathSDK) {
    super(instance);
  }

  /**
   * Gets the current user's profile and context settings
   *
   * @returns Promise resolving to user settings object containing profile information
   *
   * @example
   * ```typescript
   * const userSettings = await conversationalAgentService.user.getSettings();
   * console.log(userSettings.name);      // User's name
   * console.log(userSettings.email);     // User's email
   * console.log(userSettings.timezone);  // User's timezone
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
   * @returns Promise resolving to updated user settings object
   *
   * @example
   * ```typescript
   * // Update specific fields
   * const updatedUserSettings = await conversationalAgentService.user.updateSettings({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   timezone: 'America/New_York'
   * });
   *
   * // Partial update - only change timezone
   * await conversationalAgentService.user.updateSettings({
   *   timezone: 'Europe/London'
   * });
   *
   * // Clear fields by setting to null
   * await conversationalAgentService.user.updateSettings({
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
