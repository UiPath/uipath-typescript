/**
 * Internal Platform types — raw API wire shapes before transformation.
 */

import type { PlatformSettingKey } from './platform.types';

/**
 * A setting row exactly as the API returns it.
 *
 * The API calls the organization a "partition"; the SDK renames the field to
 * `organizationId` on the way out. See `PlatformSettingMap`.
 */
export interface RawPlatformSetting {
  id: number;
  key: PlatformSettingKey;
  value: string;
  partitionGlobalId: string;
  userId: string;
}
