/**
 * Platform service model — the ServiceModel interface that drives generated
 * API documentation.
 */

import type {
  PlatformSetting,
  PlatformSettingKey,
  PlatformSettingUpsert,
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
   * Reads are scoped to the organization the SDK was initialized against.
   *
   * @param keys - Setting keys to fetch
   * @param userId - GUID of the user whose settings to read
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
   * const settings = await platform.getUserSettings([PlatformSettingKey.UserTheme], '<userId>');
   * const theme = settings.find(s => s.key === PlatformSettingKey.UserTheme)?.value;
   * ```
   *
   * @example Fetch several keys at once
   * ```typescript
   * import { PlatformSettingKey } from '@uipath/uipath-typescript/platform';
   *
   * const settings = await platform.getUserSettings(
   *   [
   *     PlatformSettingKey.UserTheme,
   *     PlatformSettingKey.UserAccessibility,
   *     PlatformSettingKey.UserCasePinnedInstancesByTenant,
   *   ],
   *   '<userId>'
   * );
   *
   * // Structured settings arrive as a JSON string
   * const pinned = settings.find(s => s.key === PlatformSettingKey.UserCasePinnedInstancesByTenant);
   * const parsed = pinned ? JSON.parse(pinned.value) : {};
   * ```
   */
  getUserSettings(keys: PlatformSettingKey[], userId: string): Promise<PlatformSetting[]>;

  /**
   * Creates or updates a user's platform settings in bulk.
   *
   * Each submitted key is upserted for that user — keys that do not yet exist are created,
   * existing keys are overwritten. Keys absent from the request are left untouched, so
   * there is no need to send back the settings you are not changing. Returns the stored
   * rows as they are after the write, including their generated `id`.
   *
   * Writes go to the organization the SDK was initialized against.
   *
   * @param settings - Settings to create or update
   * @param userId - GUID of the user whose settings to write
   * @returns The settings as stored after the write, as {@link PlatformSetting} rows
   *
   * @example Update a setting
   * ```typescript
   * import { PlatformSettingKey } from '@uipath/uipath-typescript/platform';
   *
   * const updated = await platform.updateUserSettings(
   *   [{ key: PlatformSettingKey.UserTheme, value: 'dark' }],
   *   '<userId>'
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
   *   '<userId>'
   * );
   * ```
   */
  updateUserSettings(
    settings: PlatformSettingUpsert[],
    userId: string
  ): Promise<PlatformSetting[]>;
}
