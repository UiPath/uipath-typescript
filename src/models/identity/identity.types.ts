/**
 * Identity service types — request/response shapes for identity settings.
 */

/**
 * Identity setting keys the SDK supports.
 *
 * Only these keys can be read or written — the identity settings store holds other keys,
 * but they are not part of this SDK's surface.
 */
export enum IdentitySettingKey {
  /** The user's preferred UI language. */
  UserLanguage = 'UserLanguage.Language',
  /** The user's preferred date format. */
  UserLanguageDate = 'UserLanguage.Date',
  /** The user's UI theme (e.g. `light`, `dark`). */
  UserTheme = 'UserTheme.Theme',
  /** Whether the user has enabled accessibility mode (e.g. `true`, `false`). */
  UserAccessibility = 'UserAccessibility.Accessibility',
  /** How long alerts remain visible for the user. */
  UserAlert = 'UserAlert.AlertDuration',
  /** The user's app ordering in Case Management, per tenant. Stored as JSON. */
  UserCaseAppOrder = 'UserCase.AppOrderByTenant',
  /** Case instances the user has pinned, per tenant. Stored as JSON. */
  UserCasePinnedInstancesByTenant = 'UserCase.PinnedInstancesByTenant',
  /** The user's saved case-instance table filters, per tenant. Stored as JSON. */
  UserCaseInstancesTableFiltersByTenant = 'UserCase.InstancesTableFiltersByTenant',
}

/**
 * A stored identity setting.
 *
 * Settings are key/value pairs scoped to a user within an organization (partition).
 * Values are always strings — numbers and booleans arrive as `'8'` / `'false'`, and
 * structured settings as a JSON string the caller parses.
 */
export interface IdentitySetting {
  /** Identifier of the stored setting row. */
  id: number;
  /** The setting's key. */
  key: IdentitySettingKey;
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
  /** The setting to write. */
  key: IdentitySettingKey;
  /** New value, serialized as a string. */
  value: string;
}

/**
 * User scoping shared by identity settings operations.
 */
export interface IdentitySettingsUserScopeOptions {
  /** GUID of the user whose settings to operate on. When omitted, the calling user is used. */
  userId?: string;
}

/**
 * Options for `Identity.getSettings()`.
 */
export interface IdentitySettingsGetOptions extends IdentitySettingsUserScopeOptions {
  /**
   * Organization (partition) GUID to read from. When omitted, the API falls back to the
   * partition the calling token is scoped to.
   */
  partitionGlobalId?: string;
}

/**
 * Options for `Identity.updateSettings()`.
 */
export interface IdentitySettingsUpdateOptions extends IdentitySettingsUserScopeOptions {}
