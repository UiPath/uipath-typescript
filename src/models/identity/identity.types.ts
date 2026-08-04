/**
 * Identity service types — request/response shapes for identity settings.
 */

/**
 * Identity setting keys the SDK supports.
 *
 * Only these keys can be read or written — the identity settings store holds other keys,
 * but they are not part of this SDK's surface.
 *
 * Every operation in this module is **user-scoped**: `userId` is always sent, so reads and
 * writes act on one user's own value for a key. The underlying store can also hold an
 * organization-wide value per key (selected by omitting `userId`), but this SDK does not
 * expose that scope.
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
 * Settings are key/value pairs belonging to one user within an organization.
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
  /** Organization (account) GUID the setting belongs to. */
  organizationId: string;
  /** GUID of the user the setting belongs to. */
  userId: string;
}

/**
 * A setting to create or update. Only the key and its new value are sent — the owning
 * organization and user come from the request scope.
 */
export interface IdentitySettingUpsert {
  /** The setting to write. */
  key: IdentitySettingKey;
  /** New value, serialized as a string. */
  value: string;
}

/**
 * Options for `Identity.getSettings()`.
 */
export interface IdentitySettingGetOptions {
  /**
   * Organization (account) GUID to read from.
   *
   * Supply this in practice. When omitted the API falls back to the **host** partition
   * rather than the caller's own organization, and an external application is not
   * authorized for it — the request comes back `403 Forbidden`.
   */
  organizationId?: string;
}
