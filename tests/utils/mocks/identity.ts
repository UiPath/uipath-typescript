/**
 * Identity Settings mock factories.
 */

import type { IdentitySetting } from '../../../src/models/identity/settings.types';
import { IDENTITY_SETTING_TEST_CONSTANTS } from '../constants/identity';

/**
 * Builds a single identity setting.
 */
export const createBasicIdentitySetting = (
  overrides?: Partial<IdentitySetting>
): IdentitySetting => ({
  key: IDENTITY_SETTING_TEST_CONSTANTS.SETTING_KEY,
  value: IDENTITY_SETTING_TEST_CONSTANTS.SETTING_VALUE,
  ...overrides,
});

/**
 * Builds the settings list returned by a bulk read.
 */
export const createBasicIdentitySettings = (): IdentitySetting[] => [
  createBasicIdentitySetting(),
  createBasicIdentitySetting({
    key: IDENTITY_SETTING_TEST_CONSTANTS.SETTING_KEY_ALT,
    value: IDENTITY_SETTING_TEST_CONSTANTS.SETTING_VALUE_ALT,
  }),
];
