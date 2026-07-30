/**
 * Identity Settings service types — request/response shapes for organization-level
 * identity settings.
 */

import type { OperationResponse } from '../common/types';

/**
 * A single identity setting.
 *
 * Settings are key/value pairs scoped to an organization (partition). Values are always
 * carried as strings regardless of the setting's logical type — a numeric setting reads
 * back as `'8'`, a boolean as `'true'`.
 */
export interface IdentitySetting {
  /** Setting key (e.g. `Auth.Password.DefaultLifetimeDays`). */
  key: string;
  /** Setting value. `null` when the setting exists but has no value stored. */
  value: string | null;
}

/**
 * Partition scoping shared by every Identity Settings operation.
 */
export interface IdentitySettingPartitionOptions {
  /**
   * Organization (partition) GUID to operate on. When omitted, the API falls back to the
   * partition the calling token is scoped to — which is the only partition an external
   * application is authorized for.
   */
  partitionGlobalId?: string;
}

/**
 * Options for `IdentitySettings.getAll()`.
 */
export interface IdentitySettingGetAllOptions extends IdentitySettingPartitionOptions {}

/**
 * Options for `IdentitySettings.updateSettings()`.
 */
export interface IdentitySettingUpdateOptions extends IdentitySettingPartitionOptions {}

/**
 * Response from `updateSettings()` — echoes the settings that were submitted.
 */
export type IdentitySettingUpdateResponse = OperationResponse<{
  settings: IdentitySetting[];
}>;
