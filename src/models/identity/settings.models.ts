/**
 * Identity Settings service model — the ServiceModel interface that drives generated
 * API documentation.
 */

import type {
  IdentitySetting,
  IdentitySettingGetAllOptions,
  IdentitySettingUpdateOptions,
  IdentitySettingUpdateResponse,
} from './settings.types';

/**
 * Public surface of the Identity Settings service. JSDoc on this interface drives
 * the generated API reference documentation.
 */
export interface IdentitySettingServiceModel {
  /**
   * Gets the identity settings for an organization.
   *
   * Returns every setting stored for the partition as a flat list of key/value pairs.
   * Values are always strings — cast them yourself for numeric or boolean settings.
   *
   * @param options - Optional partition scoping
   * @returns The organization's identity settings
   * {@link IdentitySetting}
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { IdentitySettings } from '@uipath/uipath-typescript/identity-settings';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const identitySettings = new IdentitySettings(sdk);
   * const settings = await identitySettings.getAll();
   * ```
   *
   * @example Read a single setting and target a specific organization
   * ```typescript
   * const settings = await identitySettings.getAll({ partitionGlobalId: '<partitionGlobalId>' });
   * const lifetime = settings.find(s => s.key === 'Auth.Password.DefaultLifetimeDays');
   * const days = lifetime?.value ? Number(lifetime.value) : undefined;
   * ```
   */
  getAll(options?: IdentitySettingGetAllOptions): Promise<IdentitySetting[]>;

  /**
   * Creates or updates identity settings in bulk.
   *
   * Each submitted key is upserted — keys that do not yet exist are created, existing keys
   * are overwritten. Keys absent from the request are left untouched, so there is no need
   * to send back the settings you are not changing. Pass `value: null` to clear a setting.
   *
   * @param settings - Settings to create or update
   * @param options - Optional partition scoping
   * @returns Operation result echoing the submitted settings
   * {@link IdentitySettingUpdateResponse}
   *
   * @example Update a setting
   * ```typescript
   * await identitySettings.updateSettings([
   *   { key: 'Auth.Password.DefaultLifetimeDays', value: '90' },
   * ]);
   * ```
   *
   * @example Update several settings in one call, targeting a specific organization
   * ```typescript
   * await identitySettings.updateSettings(
   *   [
   *     { key: 'Auth.Password.DefaultLifetimeDays', value: '90' },
   *     { key: 'Auth.Password.ShouldChangePasswordAfterFirstLogin', value: 'true' },
   *   ],
   *   { partitionGlobalId: '<partitionGlobalId>' }
   * );
   * ```
   */
  updateSettings(
    settings: IdentitySetting[],
    options?: IdentitySettingUpdateOptions
  ): Promise<IdentitySettingUpdateResponse>;
}
