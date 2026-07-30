/**
 * Identity mock factories.
 *
 * Shapes mirror the real API response captured during onboarding.
 */

import type { IdentitySetting } from '../../../src/models/identity/identity.types';
import { IDENTITY_TEST_CONSTANTS } from '../constants/identity';

/**
 * Builds a single stored identity setting.
 */
export const createBasicIdentitySetting = (
  overrides?: Partial<IdentitySetting>
): IdentitySetting => ({
  id: IDENTITY_TEST_CONSTANTS.SETTING_ID,
  key: IDENTITY_TEST_CONSTANTS.SETTING_KEY,
  value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE,
  partitionGlobalId: IDENTITY_TEST_CONSTANTS.PARTITION_GLOBAL_ID,
  userId: IDENTITY_TEST_CONSTANTS.USER_ID,
  ...overrides,
});

/**
 * Builds the settings list returned by a multi-key read.
 */
export const createBasicIdentitySettings = (): IdentitySetting[] => [
  createBasicIdentitySetting(),
  createBasicIdentitySetting({
    id: IDENTITY_TEST_CONSTANTS.SETTING_ID_ALT,
    key: IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT,
    value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE_ALT,
  }),
];
