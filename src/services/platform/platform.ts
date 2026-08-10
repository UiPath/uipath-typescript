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

/** Renames the API's `partitionGlobalId` to the SDK-wide `organizationId`. */
const toPlatformSetting = (raw: RawPlatformSetting): PlatformSetting =>
  transformData(raw, PlatformSettingMap) as unknown as PlatformSetting;

/**
 * Service for reading and writing UiPath platform settings.
 *
 * Every operation is user-scoped — `userId` is always sent, so reads and writes act on that
 * user's own value for a key. Both operations are bulk:
 * {@link PlatformService.getSettings} fetches many keys in one request, and
 * {@link PlatformService.updateSettings} upserts many keys in one request.
 *
 * Requires the `PM.Setting` scope (or `PM.Setting.Read` / `PM.Setting.Write` for
 * read-only / write-only access).
 */
export class PlatformService extends BaseService implements PlatformServiceModel {
  @track('Platform.GetSettings')
  async getSettings(
    keys: PlatformSettingKey[],
    userId: string,
    options?: PlatformSettingGetOptions
  ): Promise<PlatformSetting[]> {
    if (keys.length === 0) {
      throw new ValidationError({ message: 'keys must contain at least one setting key' });
    }
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for getSettings' });
    }

    // Scope travels in the query string on reads, but in the body on writes
    const params: Record<string, string | PlatformSettingKey[]> = { key: keys, userId };
    if (options?.organizationId) params.partitionGlobalId = options.organizationId;

    const response = await this.get<RawPlatformSetting[]>(
      PLATFORM_SETTING_ENDPOINTS.SETTINGS,
      { params }
    );
    return response.data.map(toPlatformSetting);
  }

  @track('Platform.UpdateSettings')
  async updateSettings(
    settings: PlatformSettingUpsert[],
    userId: string,
    organizationId: string
  ): Promise<PlatformSetting[]> {
    if (settings.length === 0) {
      throw new ValidationError({ message: 'settings must contain at least one setting to update' });
    }
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for updateSettings' });
    }
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for updateSettings' });
    }

    const response = await this.put<RawPlatformSetting[]>(PLATFORM_SETTING_ENDPOINTS.SETTINGS, {
      settings,
      partitionGlobalId: organizationId,
      userId,
    });
    return response.data.map(toPlatformSetting);
  }
}
