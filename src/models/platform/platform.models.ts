/**
 * Platform service model — the ServiceModel interface that drives generated
 * API documentation.
 */

import type {
  PlatformSetting,
  PlatformSettingKey,
  PlatformSettingUpsert,
  PlatformSettingGetOptions,
} from './platform.types';

/**
 * Public surface of the Platform service. JSDoc on this interface drives
 * the generated API reference documentation.
 *
 * Every operation is user-scoped: `userId` identifies whose settings are read or written.
 */
export interface PlatformServiceModel {
  /**
   * Gets a user's platform settings by key.
   *
   * Returns one entry per key that has a stored value for that user, each carrying the
   * value plus the organization and user it belongs to. Keys with nothing stored are
   * **omitted** from the response rather than returned with an empty value, so the result
   * may be shorter than the list of keys requested.
   *
   * @param keys - Setting keys to fetch
   * @param userId - GUID of the user whose settings to read
   * @param options - Organization scoping; supply `organizationId` unless you intend the host partition
   * @returns The user's stored settings for the requested keys, as {@link PlatformSetting} rows
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Platform, PlatformSettingKey } from '@uipath/uipath-typescript/platform';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const platform = new Platform(sdk);
   * const settings = await platform.getUserSettings([PlatformSettingKey.UserTheme], '<userId>', {
   *   organizationId: '<organizationId>',
   * });
   * const theme = settings.find(s => s.key === PlatformSettingKey.UserTheme)?.value;
   * ```
   *
   * @example Fetch several keys, naming the organization explicitly
   * ```typescript
   * import { PlatformSettingKey } from '@uipath/uipath-typescript/platform';
   *
   * const settings = await platform.getUserSettings(
   *   [
   *     PlatformSettingKey.UserTheme,
   *     PlatformSettingKey.UserAccessibility,
   *     PlatformSettingKey.UserCasePinnedInstancesByTenant,
   *   ],
   *   '<userId>',
   *   { organizationId: '<organizationId>' }
   * );
   *
   * // Structured settings arrive as a JSON string
   * const pinned = settings.find(s => s.key === PlatformSettingKey.UserCasePinnedInstancesByTenant);
   * const parsed = pinned ? JSON.parse(pinned.value) : {};
   * ```
   */
  getUserSettings(
    keys: PlatformSettingKey[],
    userId: string,
    options?: PlatformSettingGetOptions
  ): Promise<PlatformSetting[]>;

  /**
   * Creates or updates a user's platform settings in bulk.
   *
   * Each submitted key is upserted for that user — keys that do not yet exist are created,
   * existing keys are overwritten. Keys absent from the request are left untouched, so
   * there is no need to send back the settings you are not changing. Returns the stored
   * rows as they are after the write, including their generated `id`.
   *
   * The organization must be supplied — on a write it is a required argument, and on a read
   * omitting it targets the host partition instead. Read a setting first if you do not have
   * it: every {@link PlatformSetting} carries its `organizationId`.
   *
   * @param settings - Settings to create or update
   * @param userId - GUID of the user whose settings to write
   * @param organizationId - Organization (account) GUID to write to
   * @returns The settings as stored after the write, as {@link PlatformSetting} rows
   *
   * @example Update a setting
   * ```typescript
   * import { PlatformSettingKey } from '@uipath/uipath-typescript/platform';
   *
   * const [current] = await platform.getUserSettings([PlatformSettingKey.UserTheme], '<userId>', {
   *   organizationId: '<organizationId>',
   * });
   *
   * const updated = await platform.updateUserSettings(
   *   [{ key: PlatformSettingKey.UserTheme, value: 'dark' }],
   *   current.userId,
   *   current.organizationId
   * );
   * ```
   *
   * @example Update several settings at once
   * ```typescript
   * import { PlatformSettingKey } from '@uipath/uipath-typescript/platform';
   *
   * await platform.updateUserSettings(
   *   [
   *     { key: PlatformSettingKey.UserTheme, value: 'dark' },
   *     { key: PlatformSettingKey.UserAccessibility, value: 'true' },
   *   ],
   *   '<userId>',
   *   '<organizationId>'
   * );
   * ```
   */
  updateUserSettings(
    settings: PlatformSettingUpsert[],
    userId: string,
    organizationId: string
  ): Promise<PlatformSetting[]>;
}
