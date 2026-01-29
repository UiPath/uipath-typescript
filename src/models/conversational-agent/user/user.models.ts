import type { UserSettingsGetResponse, UserSettingsUpdateResponse, UserSettingsUpdateOptions } from './user.types';

/**
 * Service for managing UiPath User Settings
 *
 * User settings are passed to the agent for all conversations
 * to provide user context (name, email, role, timezone, etc.).
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { ConversationalAgent } from '@uipath/uipath-typescript/conversational-agent';
 *
 * const conversationalAgentService = new ConversationalAgent(sdk);
 * const userSettings = await conversationalAgentService.user.getSettings();
 * ```
 */
export interface UserServiceModel {
  /**
   * Gets the current user's profile and context settings
   *
   * @returns Promise resolving to user settings object
   * {@link UserSettingsGetResponse}
   * @example
   * ```typescript
   * const userSettings = await conversationalAgentService.user.getSettings();
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
   * const updatedUserSettings = await conversationalAgentService.user.updateSettings({
   *   name: 'John Doe',
   *   timezone: 'America/New_York'
   * });
   * ```
   */
  updateSettings(options: UserSettingsUpdateOptions): Promise<UserSettingsUpdateResponse>;
}
