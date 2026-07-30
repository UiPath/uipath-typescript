/**
 * Identity service model — the ServiceModel interface that drives generated
 * API documentation.
 */

import type {
  IdentitySetting,
  IdentitySettingUpsert,
  IdentitySettingsGetOptions,
  IdentitySettingsUpdateOptions,
} from './identity.types';

/**
 * Public surface of the Identity service. JSDoc on this interface drives
 * the generated API reference documentation.
 */
export interface IdentityServiceModel {
  /**
   * Gets identity settings by key.
   *
   * Returns one entry per key that has a stored value, each carrying the value plus the
   * partition and user it belongs to. Keys with nothing stored are **omitted** from the
   * response rather than returned with an empty value, so the result may be shorter than
   * the list of keys requested.
   *
   * @param keys - Setting keys to fetch
   * @param options - Optional partition and user scoping
   * @returns The stored settings for the requested keys
   * {@link IdentitySetting}
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Identity } from '@uipath/uipath-typescript/identity';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const identity = new Identity(sdk);
   * const settings = await identity.getSettings(['UserTheme.Theme']);
   * const theme = settings.find(s => s.key === 'UserTheme.Theme')?.value;
   * ```
   *
   * @example Fetch several keys for a specific user and organization
   * ```typescript
   * const settings = await identity.getSettings(
   *   ['UserTheme.Theme', 'UserAccessibility.Accessibility', 'Favorites'],
   *   { partitionGlobalId: '<partitionGlobalId>', userId: '<userId>' }
   * );
   *
   * // Structured settings arrive as a JSON string
   * const favorites = settings.find(s => s.key === 'Favorites');
   * const parsed = favorites ? JSON.parse(favorites.value) : {};
   * ```
   */
  getSettings(keys: string[], options?: IdentitySettingsGetOptions): Promise<IdentitySetting[]>;

  /**
   * Creates or updates identity settings in bulk.
   *
   * Each submitted key is upserted — keys that do not yet exist are created, existing keys
   * are overwritten. Keys absent from the request are left untouched, so there is no need
   * to send back the settings you are not changing. Returns the stored rows as they are
   * after the write, including their generated `id`.
   *
   * Unlike {@link getSettings}, the partition cannot be inferred on a write and must be
   * supplied. Read a setting first if you do not have it — every
   * {@link IdentitySetting} carries its `partitionGlobalId`.
   *
   * @param settings - Settings to create or update
   * @param partitionGlobalId - Organization (partition) GUID to write to
   * @param options - Optional user scoping
   * @returns The settings as stored after the write
   * {@link IdentitySetting}
   *
   * @example Update a setting
   * ```typescript
   * const [current] = await identity.getSettings(['UserTheme.Theme']);
   *
   * const updated = await identity.updateSettings(
   *   [{ key: 'UserTheme.Theme', value: 'dark' }],
   *   current.partitionGlobalId
   * );
   * ```
   *
   * @example Update several settings for a specific user
   * ```typescript
   * await identity.updateSettings(
   *   [
   *     { key: 'UserTheme.Theme', value: 'dark' },
   *     { key: 'UserAccessibility.Accessibility', value: 'true' },
   *   ],
   *   '<partitionGlobalId>',
   *   { userId: '<userId>' }
   * );
   * ```
   */
  updateSettings(
    settings: IdentitySettingUpsert[],
    partitionGlobalId: string,
    options?: IdentitySettingsUpdateOptions
  ): Promise<IdentitySetting[]>;
}
