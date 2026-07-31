/**
 * Identity mock factories.
 *
 * Shapes mirror the real API response captured during onboarding.
 */

import type { RawIdentitySetting } from '../../../src/models/identity/identity.internal-types';
import { IDENTITY_TEST_CONSTANTS } from '../constants/identity';

/**
 * Builds a single setting row in the raw wire shape — the service renames
 * `partitionGlobalId` to `organizationId`.
 */
export const createBasicIdentitySetting = (
  overrides?: Partial<RawIdentitySetting>
): RawIdentitySetting => ({
  id: IDENTITY_TEST_CONSTANTS.SETTING_ID,
  key: IDENTITY_TEST_CONSTANTS.SETTING_KEY,
  value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE,
  partitionGlobalId: IDENTITY_TEST_CONSTANTS.ORGANIZATION_ID,
  userId: IDENTITY_TEST_CONSTANTS.USER_ID,
  ...overrides,
});

/**
 * Builds the settings list returned by a multi-key read.
 */
export const createBasicIdentitySettings = (): RawIdentitySetting[] => [
  createBasicIdentitySetting(),
  createBasicIdentitySetting({
    id: IDENTITY_TEST_CONSTANTS.SETTING_ID_ALT,
    key: IDENTITY_TEST_CONSTANTS.SETTING_KEY_ALT,
    value: IDENTITY_TEST_CONSTANTS.SETTING_VALUE_ALT,
  }),
];
