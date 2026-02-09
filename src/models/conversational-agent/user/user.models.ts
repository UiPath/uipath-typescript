import type { UserSettingsGetResponse, UserSettingsUpdateResponse, UserSettingsUpdateOptions } from './user.types';

/**
 * Service for managing UiPath User Settings
 *
 * User settings are passed to the agent for all conversations
 * to provide user context (name, email, role, timezone, etc.).
 *
 * @internal
 */
export interface UserServiceModel {
  /**
   * Gets the current user's profile and context settings
   *
   * @returns Promise resolving to user settings object
   * {@link UserSettingsGetResponse}
   * @example
   * ```typescript
   * const userSettings = await userService.getSettings();
   * console.log(userSettings.name);
   * console.log(userSettings.email);
   * ```
   */
  getSettings(): Promise<UserSettingsGetResponse>;

  /**
   * Updates the current user's profile and context settings
   *
   * @param options - Fields to update
   * @returns Promise resolving to updated user settings
   * {@link UserSettingsUpdateResponse}
   * @example
   * ```typescript
   * const updatedUserSettings = await userService.updateSettings({
   *   name: 'John Doe',
   *   timezone: 'America/New_York'
   * });
   * ```
   */
  updateSettings(options: UserSettingsUpdateOptions): Promise<UserSettingsUpdateResponse>;
}
