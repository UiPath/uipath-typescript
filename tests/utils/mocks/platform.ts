/**
 * Platform mock factories.
 *
 * Shapes mirror the real API response captured during onboarding.
 */

import type { RawPlatformSetting } from '../../../src/models/platform/platform.internal-types';
import type {
  RawPlatformUser,
  RawPlatformUserListResponse,
  RawPlatformUserUpdateResult,
} from '../../../src/models/platform/users.internal-types';
import { PLATFORM_TEST_CONSTANTS, PLATFORM_USER_TEST_CONSTANTS } from '../constants/platform';

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

/**
 * Builds a single user in the raw wire shape: camelCase fields, `groupIDs` casing,
 * numeric `type`/`category` codes, and the internal fields the service drops.
 */
export const createBasicRawPlatformUser = (
  overrides?: Partial<RawPlatformUser>
): RawPlatformUser => ({
  id: PLATFORM_USER_TEST_CONSTANTS.USER_ID,
  userName: PLATFORM_USER_TEST_CONSTANTS.USER_NAME,
  email: PLATFORM_USER_TEST_CONSTANTS.EMAIL,
  emailConfirmed: true,
  name: PLATFORM_USER_TEST_CONSTANTS.FIRST_NAME,
  surname: PLATFORM_USER_TEST_CONSTANTS.SURNAME,
  displayName: PLATFORM_USER_TEST_CONSTANTS.DISPLAY_NAME,
  creationTime: PLATFORM_USER_TEST_CONSTANTS.CREATION_TIME,
  lastModificationTime: PLATFORM_USER_TEST_CONSTANTS.LAST_MODIFICATION_TIME,
  lastLoginTime: PLATFORM_USER_TEST_CONSTANTS.LAST_LOGIN_TIME,
  groupIDs: [PLATFORM_USER_TEST_CONSTANTS.GROUP_ID, PLATFORM_USER_TEST_CONSTANTS.GROUP_ID_ALT],
  legacyId: PLATFORM_USER_TEST_CONSTANTS.LEGACY_ID,
  isActive: true,
  bypassBasicAuthRestriction: false,
  type: 0,
  category: 0,
  invitationAccepted: true,
  ...overrides,
});

/**
 * Builds the paged user list response in the raw wire shape. `totalCount`
 * defaults to the number of users so single-page mocks satisfy the service's
 * fetch-all loop; pass it explicitly to simulate further pages.
 */
export const createRawPlatformUserListResponse = (
  users: RawPlatformUser[] = [createBasicRawPlatformUser()],
  totalCount: number = users.length
): RawPlatformUserListResponse => ({
  totalCount,
  results: users,
});

/**
 * Builds the update result in the raw wire shape — the service renames
 * `succeeded` to `success`.
 */
export const createRawPlatformUserUpdateResult = (
  overrides?: Partial<RawPlatformUserUpdateResult>
): RawPlatformUserUpdateResult => ({
  succeeded: true,
  errors: [],
  ...overrides,
});
