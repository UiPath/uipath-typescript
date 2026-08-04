/**
 * Identity service model — the ServiceModel interface that drives generated
 * API documentation.
 */

import type {
  IdentitySetting,
  IdentitySettingKey,
  IdentitySettingUpsert,
  IdentitySettingGetOptions,
} from './identity.types';

/**
 * Public surface of the Identity service. JSDoc on this interface drives
 * the generated API reference documentation.
 *
 * Every operation is user-scoped: `userId` identifies whose settings are read or written.
 */
export interface IdentityServiceModel {
  /**
   * Gets a user's identity settings by key.
   *
   * Returns one entry per key that has a stored value for that user, each carrying the
   * value plus the organization and user it belongs to. Keys with nothing stored are
   * **omitted** from the response rather than returned with an empty value, so the result
   * may be shorter than the list of keys requested.
   *
   * @param keys - Setting keys to fetch
   * @param userId - GUID of the user whose settings to read
   * @param options - Organization scoping; supply `organizationId` unless you intend the host partition
   * @returns The user's stored settings for the requested keys, as {@link IdentitySetting} rows
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Identity, IdentitySettingKey } from '@uipath/uipath-typescript/identity';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const identity = new Identity(sdk);
   * const settings = await identity.getSettings([IdentitySettingKey.UserTheme], '<userId>', {
   *   organizationId: '<organizationId>',
   * });
   * const theme = settings.find(s => s.key === IdentitySettingKey.UserTheme)?.value;
   * ```
   *
   * @example Fetch several keys, naming the organization explicitly
   * ```typescript
   * import { IdentitySettingKey } from '@uipath/uipath-typescript/identity';
   *
   * const settings = await identity.getSettings(
   *   [
   *     IdentitySettingKey.UserTheme,
   *     IdentitySettingKey.UserAccessibility,
   *     IdentitySettingKey.UserCasePinnedInstancesByTenant,
   *   ],
   *   '<userId>',
   *   { organizationId: '<organizationId>' }
   * );
   *
   * // Structured settings arrive as a JSON string
   * const pinned = settings.find(s => s.key === IdentitySettingKey.UserCasePinnedInstancesByTenant);
   * const parsed = pinned ? JSON.parse(pinned.value) : {};
   * ```
   */
  getSettings(
    keys: IdentitySettingKey[],
    userId: string,
    options?: IdentitySettingGetOptions
  ): Promise<IdentitySetting[]>;

  /**
   * Creates or updates a user's identity settings in bulk.
   *
   * Each submitted key is upserted for that user — keys that do not yet exist are created,
   * existing keys are overwritten. Keys absent from the request are left untouched, so
   * there is no need to send back the settings you are not changing. Returns the stored
   * rows as they are after the write, including their generated `id`.
   *
   * The organization must be supplied — on a write it is a required argument, and on a read
   * omitting it targets the host partition instead. Read a setting first if you do not have
   * it: every {@link IdentitySetting} carries its `organizationId`.
   *
   * @param settings - Settings to create or update
   * @param userId - GUID of the user whose settings to write
   * @param organizationId - Organization (account) GUID to write to
   * @returns The settings as stored after the write, as {@link IdentitySetting} rows
   *
   * @example Update a setting
   * ```typescript
   * import { IdentitySettingKey } from '@uipath/uipath-typescript/identity';
   *
   * const [current] = await identity.getSettings([IdentitySettingKey.UserTheme], '<userId>', {
   *   organizationId: '<organizationId>',
   * });
   *
   * const updated = await identity.updateSettings(
   *   [{ key: IdentitySettingKey.UserTheme, value: 'dark' }],
   *   current.userId,
   *   current.organizationId
   * );
   * ```
   *
   * @example Update several settings at once
   * ```typescript
   * import { IdentitySettingKey } from '@uipath/uipath-typescript/identity';
   *
   * await identity.updateSettings(
   *   [
   *     { key: IdentitySettingKey.UserTheme, value: 'dark' },
   *     { key: IdentitySettingKey.UserAccessibility, value: 'true' },
   *   ],
   *   '<userId>',
   *   '<organizationId>'
   * );
   * ```
   */
  updateSettings(
    settings: IdentitySettingUpsert[],
    userId: string,
    organizationId: string
  ): Promise<IdentitySetting[]>;
}
