/**
 * IdentityService — reads and writes identity settings.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';

import type {
  IdentitySetting,
  IdentitySettingKey,
  IdentitySettingUpsert,
  IdentitySettingsGetOptions,
  IdentitySettingsUpdateOptions,
} from '../../models/identity/identity.types';
import type { IdentityServiceModel } from '../../models/identity/identity.models';

import { IDENTITY_SETTING_ENDPOINTS } from '../../utils/constants/endpoints';

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
  async getSettings(keys: IdentitySettingKey[], options?: IdentitySettingsGetOptions): Promise<IdentitySetting[]> {
    if (keys.length === 0) {
      throw new ValidationError({ message: 'keys must contain at least one setting key' });
    }

    // Scope goes in the query string on reads, but in the body on writes
    const params: Record<string, string | IdentitySettingKey[]> = { key: keys };
    if (options?.partitionGlobalId) params.partitionGlobalId = options.partitionGlobalId;
    if (options?.userId) params.userId = options.userId;

    const response = await this.get<IdentitySetting[]>(
      IDENTITY_SETTING_ENDPOINTS.SETTINGS,
      { params }
    );
    return response.data;
  }

  @track('Identity.UpdateSettings')
  async updateSettings(
    settings: IdentitySettingUpsert[],
    partitionGlobalId: string,
    options?: IdentitySettingsUpdateOptions
  ): Promise<IdentitySetting[]> {
    if (settings.length === 0) {
      throw new ValidationError({ message: 'settings must contain at least one setting to update' });
    }
    if (!partitionGlobalId) {
      throw new ValidationError({ message: 'partitionGlobalId is required for updateSettings' });
    }

    const body: Record<string, unknown> = { settings, partitionGlobalId };
    if (options?.userId) body.userId = options.userId;

    const response = await this.put<IdentitySetting[]>(IDENTITY_SETTING_ENDPOINTS.SETTINGS, body);
    return response.data;
  }
}
