/**
 * Identity service types — request/response shapes for identity settings.
 */

import type { OperationResponse } from '../common/types';

/**
 * A stored identity setting.
 *
 * Settings are key/value pairs scoped to a user within an organization (partition).
 * Values are always strings — numbers and booleans arrive as `'8'` / `'false'`, and
 * structured settings (e.g. `Favorites`) as a JSON string the caller parses.
 */
export interface IdentitySetting {
  /** Identifier of the stored setting row. */
  id: number;
  /** Setting key (e.g. `UserTheme.Theme`). */
  key: string;
  /** Setting value, always serialized as a string. */
  value: string;
  /** Organization (partition) GUID the setting belongs to. */
  partitionGlobalId: string;
  /** GUID of the user the setting belongs to. */
  userId: string;
}

/**
 * A setting to create or update. Only the key and its new value are sent — the owning
 * partition and user come from the request scope.
 */
export interface IdentitySettingUpsert {
  /** Setting key (e.g. `UserTheme.Theme`). */
  key: string;
  /** New value, serialized as a string. */
  value: string;
}

/**
 * Request scoping shared by every identity settings operation.
 */
export interface IdentitySettingsScopeOptions {
  /**
   * Organization (partition) GUID to operate on. When omitted, the API falls back to the
   * partition the calling token is scoped to.
   */
  partitionGlobalId?: string;
  /** GUID of the user whose settings to operate on. When omitted, the calling user is used. */
  userId?: string;
}

/**
 * Options for `Identity.getSettings()`.
 */
export interface IdentitySettingsGetOptions extends IdentitySettingsScopeOptions {}

/**
 * Options for `Identity.updateSettings()`.
 */
export interface IdentitySettingsUpdateOptions extends IdentitySettingsScopeOptions {}

/**
 * Response from `updateSettings()` — echoes the settings that were submitted.
 */
export type IdentitySettingsUpdateResponse = OperationResponse<{
  settings: IdentitySettingUpsert[];
}>;
