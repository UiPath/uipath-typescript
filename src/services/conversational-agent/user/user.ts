/**
 * UserService - Service for managing user profile and context settings
 */

// Core SDK imports
import type { IUiPathSDK } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  UserSettingsUpdateOptions,
  UserServiceModel,
  UserSettingsGetResponse,
  UserSettingsUpdateResponse
} from '@/models/conversational-agent';
import { UserSettingsMap } from '@/models/conversational-agent';

// Utils
import { USER_ENDPOINTS } from '@/utils/constants/endpoints';
import { transformData } from '@/utils/transform';

/**
 * Service for managing user profile and context settings
 *
 * User settings are passed to the agent for all conversations
 * to provide user context (name, email, role, timezone, etc.).
 *
 * @internal
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
   * const userSettings = await userService.getSettings();
   * console.log(userSettings.name);      // User's name
   * console.log(userSettings.email);     // User's email
   * console.log(userSettings.timezone);  // User's timezone
   * ```
   */
  @track('ConversationalAgent.User.GetSettings')
  async getSettings(): Promise<UserSettingsGetResponse> {
    const response = await this.get<UserSettingsGetResponse>(USER_ENDPOINTS.SETTINGS);
    return transformData(response.data, UserSettingsMap) as UserSettingsGetResponse;
  }

  /**
   * Updates the current user's profile and context settings
   *
   * All fields are optional - only send the fields you want to change.
   * Set fields to `null` to explicitly clear them.
   * Omitting fields means no change.
   *
   * @param options - Fields to update
   * @returns Promise resolving to updated user settings object
   *
   * @example
   * ```typescript
   * // Update specific fields
   * const updatedUserSettings = await userService.updateSettings({
   *   name: 'John Doe',
   *   email: 'john@example.com',
   *   timezone: 'America/New_York'
   * });
   *
   * // Partial update - only change timezone
   * await userService.updateSettings({
   *   timezone: 'Europe/London'
   * });
   *
   * // Clear fields by setting to null
   * await userService.updateSettings({
   *   role: null,
   *   department: null
   * });
   * ```
   */
  @track('ConversationalAgent.User.UpdateSettings')
  async updateSettings(options: UserSettingsUpdateOptions): Promise<UserSettingsUpdateResponse> {
    const response = await this.patch<UserSettingsUpdateResponse>(USER_ENDPOINTS.SETTINGS, options);
    return transformData(response.data, UserSettingsMap) as UserSettingsUpdateResponse;
  }
}
