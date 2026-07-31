/**
 * IdentityService — reads and writes a user's identity settings.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';

import type {
  IdentitySetting,
  IdentitySettingKey,
  IdentitySettingUpsert,
  IdentitySettingsGetOptions,
} from '../../models/identity/identity.types';
import type { IdentityServiceModel } from '../../models/identity/identity.models';

import { IDENTITY_SETTING_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Service for reading and writing UiPath Identity settings.
 *
 * Every operation is user-scoped — `userId` is always sent, so reads and writes act on that
 * user's own value for a key. Both operations are bulk:
 * {@link IdentityService.getSettings} fetches many keys in one request, and
 * {@link IdentityService.updateSettings} upserts many keys in one request.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write` for
 * read-only / write-only access).
 */
export class IdentityService extends BaseService implements IdentityServiceModel {
  @track('Identity.GetSettings')
  async getSettings(
    keys: IdentitySettingKey[],
    userId: string,
    options?: IdentitySettingsGetOptions
  ): Promise<IdentitySetting[]> {
    if (keys.length === 0) {
      throw new ValidationError({ message: 'keys must contain at least one setting key' });
    }
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for getSettings' });
    }

    // Scope travels in the query string on reads, but in the body on writes
    const params: Record<string, string | IdentitySettingKey[]> = { key: keys, userId };
    if (options?.partitionGlobalId) params.partitionGlobalId = options.partitionGlobalId;

    const response = await this.get<IdentitySetting[]>(
      IDENTITY_SETTING_ENDPOINTS.SETTINGS,
      { params }
    );
    return response.data;
  }

  @track('Identity.UpdateSettings')
  async updateSettings(
    settings: IdentitySettingUpsert[],
    userId: string,
    partitionGlobalId: string
  ): Promise<IdentitySetting[]> {
    if (settings.length === 0) {
      throw new ValidationError({ message: 'settings must contain at least one setting to update' });
    }
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for updateSettings' });
    }
    if (!partitionGlobalId) {
      throw new ValidationError({ message: 'partitionGlobalId is required for updateSettings' });
    }

    const response = await this.put<IdentitySetting[]>(IDENTITY_SETTING_ENDPOINTS.SETTINGS, {
      settings,
      partitionGlobalId,
      userId,
    });
    return response.data;
  }
}
