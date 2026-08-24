/**
 * UserSettingsService - Service for managing user profile and context settings
 */

// Core SDK imports
import type { IUiPath } from '@/core/types';
import { track } from '@/core/telemetry';
import { BaseService } from '@/services/base';

// Models
import type {
  ConversationalAgentOptions,
  UserSettingsUpdateOptions,
  UserSettingsServiceModel,
  UserSettingsGetResponse,
  UserSettingsUpdateResponse
} from '@/models/conversational-agent';
import { UserSettingsMap } from '@/models/conversational-agent';

// Utils
import { USER_ENDPOINTS } from '@/utils/constants/endpoints';
import { EXTERNAL_USER_ID } from '@/utils/constants/headers';
import { transformData } from '@/utils/transform';

/**
 * Service for reading and updating the current user's profile and context settings.
 *
 * User settings are user-supplied profile fields (name, email, role, department, company,
 * country, timezone) that the SDK passes to a UiPath Conversational Agent on every conversation
 * so the agent can personalize its responses.
 */
export class UserSettingsService extends BaseService implements UserSettingsServiceModel {
  /**
   * Creates an instance of the UserSettingsService.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   * @param options - Optional configuration (e.g. externalUserId for external app auth)
   */
  constructor(instance: IUiPath, options?: ConversationalAgentOptions) {
    super(instance, options?.externalUserId ? { [EXTERNAL_USER_ID]: options.externalUserId } : undefined);
  }

  @track('ConversationalAgent.UserSettings.GetSettings')
  async getSettings(): Promise<UserSettingsGetResponse> {
    const response = await this.get<UserSettingsGetResponse>(USER_ENDPOINTS.SETTINGS);
    return transformData(response.data, UserSettingsMap) as UserSettingsGetResponse;
  }

  @track('ConversationalAgent.UserSettings.UpdateSettings')
  async updateSettings(options: UserSettingsUpdateOptions): Promise<UserSettingsUpdateResponse> {
    const response = await this.patch<UserSettingsUpdateResponse>(USER_ENDPOINTS.SETTINGS, options);
    return transformData(response.data, UserSettingsMap) as UserSettingsUpdateResponse;
  }
}
