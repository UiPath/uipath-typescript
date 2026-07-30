/**
 * IdentityService — reads and writes identity settings.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';

import type {
  IdentitySetting,
  IdentitySettingUpsert,
  IdentitySettingsGetOptions,
  IdentitySettingsScopeOptions,
  IdentitySettingsUpdateOptions,
  IdentitySettingsUpdateResponse,
} from '../../models/identity/identity.types';
import type { IdentityServiceModel } from '../../models/identity/identity.models';

import { IDENTITY_SETTING_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Builds the partition/user query params. Omitting either lets the API fall back to the
 * partition and user the calling token is scoped to.
 */
const createScopeParams = (options?: IdentitySettingsScopeOptions): Record<string, string> => {
  const params: Record<string, string> = {};
  if (options?.partitionGlobalId) params.partitionGlobalId = options.partitionGlobalId;
  if (options?.userId) params.userId = options.userId;
  return params;
};

/**
 * Service for reading and writing UiPath Identity settings.
 *
 * Settings are key/value pairs scoped to a user within an organization (partition). Both
 * operations are bulk: {@link IdentityService.getSettings} fetches many keys in one
 * request, and {@link IdentityService.updateSettings} upserts many keys in one request.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write` for
 * read-only / write-only access).
 */
export class IdentityService extends BaseService implements IdentityServiceModel {
  @track('Identity.GetSettings')
  async getSettings(keys: string[], options?: IdentitySettingsGetOptions): Promise<IdentitySetting[]> {
    if (keys.length === 0) {
      throw new ValidationError({ message: 'keys must contain at least one setting key' });
    }

    const response = await this.get<IdentitySetting[]>(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
      params: { key: keys, ...createScopeParams(options) },
    });
    return response.data;
  }

  @track('Identity.UpdateSettings')
  async updateSettings(
    settings: IdentitySettingUpsert[],
    options?: IdentitySettingsUpdateOptions
  ): Promise<IdentitySettingsUpdateResponse> {
    if (settings.length === 0) {
      throw new ValidationError({ message: 'settings must contain at least one setting to update' });
    }

    await this.put(IDENTITY_SETTING_ENDPOINTS.SETTINGS, settings, {
      params: createScopeParams(options),
    });
    return { success: true, data: { settings } };
  }
}
