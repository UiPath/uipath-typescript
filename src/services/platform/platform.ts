/**
 * PlatformService — reads and writes a user's platform settings.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';

import type {
  PlatformSetting,
  PlatformSettingKey,
  PlatformSettingUpsert,
  PlatformSettingGetOptions,
} from '../../models/platform/platform.types';
import type { RawPlatformSetting } from '../../models/platform/platform.internal-types';
import type { PlatformServiceModel } from '../../models/platform/platform.models';
import { PlatformSettingMap } from '../../models/platform/platform.constants';

import { PLATFORM_SETTING_ENDPOINTS } from '../../utils/constants/endpoints';
import { transformData } from '../../utils/transform';

/**
 * Service for reading and writing UiPath platform settings.
 *
 * Every operation is user-scoped — `userId` is always sent, so reads and writes act on that
 * user's own value for a key. Both operations are bulk:
 * {@link PlatformService.getUserSettings} fetches many keys in one request, and
 * {@link PlatformService.updateUserSettings} upserts many keys in one request.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write` for
 * read-only / write-only access).
 */
export class PlatformService extends BaseService implements PlatformServiceModel {
  @track('Platform.GetUserSettings')
  async getUserSettings(
    keys: PlatformSettingKey[],
    userId: string,
    options?: PlatformSettingGetOptions
  ): Promise<PlatformSetting[]> {
    if (!keys?.length) {
      throw new ValidationError({ message: 'keys must contain at least one setting key' });
    }
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for getUserSettings' });
    }
    // Reject an empty organization rather than dropping it — omitting it targets the host
    // partition, so the caller would get an opaque 403 instead of being told what was wrong
    if (options?.organizationId !== undefined && !options.organizationId) {
      throw new ValidationError({ message: 'organizationId must not be empty when provided' });
    }

    // Scope travels in the query string on reads, but in the body on writes
    const params: Record<string, string | PlatformSettingKey[]> = { key: keys, userId };
    if (options?.organizationId) params.partitionGlobalId = options.organizationId;

    const response = await this.get<RawPlatformSetting[]>(
      PLATFORM_SETTING_ENDPOINTS.SETTINGS,
      { params }
    );
    return transformData(response.data, PlatformSettingMap) as unknown as PlatformSetting[];
  }

  @track('Platform.UpdateUserSettings')
  async updateUserSettings(
    settings: PlatformSettingUpsert[],
    userId: string,
    organizationId: string
  ): Promise<PlatformSetting[]> {
    if (!settings?.length) {
      throw new ValidationError({ message: 'settings must contain at least one setting to update' });
    }
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for updateUserSettings' });
    }
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for updateUserSettings' });
    }

    const response = await this.put<RawPlatformSetting[]>(PLATFORM_SETTING_ENDPOINTS.SETTINGS, {
      settings,
      partitionGlobalId: organizationId,
      userId,
    });
    return transformData(response.data, PlatformSettingMap) as unknown as PlatformSetting[];
  }
}
