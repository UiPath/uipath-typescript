/**
 * IdentitySettingService — reads and writes organization-level identity settings.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';

import type { RequestSpec } from '../../models/common/request-spec';
import type {
  IdentitySetting,
  IdentitySettingGetAllOptions,
  IdentitySettingPartitionOptions,
  IdentitySettingUpdateOptions,
  IdentitySettingUpdateResponse,
} from '../../models/identity/settings.types';
import type { IdentitySettingServiceModel } from '../../models/identity/settings.models';

import { IDENTITY_SETTING_ENDPOINTS } from '../../utils/constants/endpoints';

/**
 * Builds the request spec for a partition-scoped call. Omitting the param lets the API
 * fall back to the partition the calling token is scoped to.
 */
const createPartitionSpec = (options?: IdentitySettingPartitionOptions): RequestSpec =>
  options?.partitionGlobalId ? { params: { partitionGlobalId: options.partitionGlobalId } } : {};

/**
 * Service for reading and writing UiPath Identity settings.
 *
 * Settings are key/value pairs scoped to an organization (partition). Both operations are
 * bulk: {@link IdentitySettingService.getAll} returns the whole set, and
 * {@link IdentitySettingService.updateSettings} upserts many keys in one request.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write` for
 * read-only / write-only access).
 */
export class IdentitySettingService extends BaseService implements IdentitySettingServiceModel {
  @track('IdentitySettings.GetAll')
  async getAll(options?: IdentitySettingGetAllOptions): Promise<IdentitySetting[]> {
    const response = await this.get<IdentitySetting[]>(
      IDENTITY_SETTING_ENDPOINTS.SETTINGS,
      createPartitionSpec(options)
    );
    return response.data;
  }

  @track('IdentitySettings.UpdateSettings')
  async updateSettings(
    settings: IdentitySetting[],
    options?: IdentitySettingUpdateOptions
  ): Promise<IdentitySettingUpdateResponse> {
    if (settings.length === 0) {
      throw new ValidationError({ message: 'settings must contain at least one setting to update' });
    }

    await this.put(
      IDENTITY_SETTING_ENDPOINTS.SETTINGS,
      settings,
      createPartitionSpec(options)
    );
    return { success: true, data: { settings } };
  }
}
