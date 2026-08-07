/**
 * Internal Identity types — raw API wire shapes before transformation.
 */

import type { IdentitySettingKey } from './identity.types';

/**
 * A setting row exactly as the API returns it.
 *
 * The API calls the organization a "partition"; the SDK renames the field to
 * `organizationId` on the way out. See `IdentitySettingMap`.
 */
export interface RawIdentitySetting {
  id: number;
  key: IdentitySettingKey;
  value: string;
  partitionGlobalId: string;
  userId: string;
}
