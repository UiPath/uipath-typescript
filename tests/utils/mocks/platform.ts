/**
 * Platform mock factories.
 *
 * Shapes mirror the real API response captured during onboarding.
 */

import type { RawPlatformSetting } from '../../../src/models/platform/platform.internal-types';
import { PLATFORM_TEST_CONSTANTS } from '../constants/platform';

/**
 * Builds a single setting row in the raw wire shape — the service renames
 * `partitionGlobalId` to `organizationId`.
 */
export const createBasicPlatformSetting = (
  overrides?: Partial<RawPlatformSetting>
): RawPlatformSetting => ({
  id: PLATFORM_TEST_CONSTANTS.SETTING_ID,
  key: PLATFORM_TEST_CONSTANTS.SETTING_KEY,
  value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE,
  partitionGlobalId: PLATFORM_TEST_CONSTANTS.ORGANIZATION_ID,
  userId: PLATFORM_TEST_CONSTANTS.USER_ID,
  ...overrides,
});

/**
 * Builds the settings list returned by a multi-key read.
 */
export const createBasicPlatformSettings = (): RawPlatformSetting[] => [
  createBasicPlatformSetting(),
  createBasicPlatformSetting({
    id: PLATFORM_TEST_CONSTANTS.SETTING_ID_ALT,
    key: PLATFORM_TEST_CONSTANTS.SETTING_KEY_ALT,
    value: PLATFORM_TEST_CONSTANTS.SETTING_VALUE_ALT,
  }),
];
