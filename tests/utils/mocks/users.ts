/**
 * Identity Users mock factories.
 *
 * Shapes mirror the real API responses captured live during onboarding — the API
 * returns camelCase keys, `groupIDs`, and numeric `type`/`category` codes (the
 * Swagger spec wrongly declares string enums for the latter).
 */

import type { RawUserEntry } from '../../../src/models/identity/users.internal-types';
import type { RawUserGetResponse } from '../../../src/models/identity';
import { UserCategory, UserType } from '../../../src/models/identity';
import { USER_TEST_CONSTANTS } from '../constants/users';

/**
 * Builds a user in the SDK response shape (transformed, without bound methods).
 */
export const createBasicUser = (
  overrides?: Partial<RawUserGetResponse>
): RawUserGetResponse => ({
  id: USER_TEST_CONSTANTS.USER_ID,
  userName: USER_TEST_CONSTANTS.USER_NAME,
  email: USER_TEST_CONSTANTS.EMAIL,
  emailConfirmed: true,
  name: USER_TEST_CONSTANTS.FIRST_NAME,
  surname: USER_TEST_CONSTANTS.LAST_NAME,
  displayName: USER_TEST_CONSTANTS.DISPLAY_NAME,
  createdTime: USER_TEST_CONSTANTS.CREATION_TIME,
  lastModifiedTime: USER_TEST_CONSTANTS.LAST_MODIFICATION_TIME,
  lastLoginTime: USER_TEST_CONSTANTS.LAST_LOGIN_TIME,
  groupIds: [USER_TEST_CONSTANTS.GROUP_ID],
  isActive: true,
  bypassBasicAuthRestriction: false,
  type: UserType.User,
  category: UserCategory.Local,
  invitationAccepted: true,
  ...overrides,
});

/**
 * Builds a raw user entry mirroring a live API response.
 */
export const createBasicRawUserEntry = (
  overrides?: Partial<RawUserEntry>
): RawUserEntry => ({
  id: USER_TEST_CONSTANTS.USER_ID,
  userName: USER_TEST_CONSTANTS.USER_NAME,
  email: USER_TEST_CONSTANTS.EMAIL,
  emailConfirmed: true,
  name: USER_TEST_CONSTANTS.FIRST_NAME,
  surname: USER_TEST_CONSTANTS.LAST_NAME,
  displayName: USER_TEST_CONSTANTS.DISPLAY_NAME,
  creationTime: USER_TEST_CONSTANTS.CREATION_TIME,
  lastModificationTime: USER_TEST_CONSTANTS.LAST_MODIFICATION_TIME,
  lastLoginTime: USER_TEST_CONSTANTS.LAST_LOGIN_TIME,
  groupIDs: [USER_TEST_CONSTANTS.GROUP_ID],
  isActive: true,
  bypassBasicAuthRestriction: false,
  type: 0,
  category: 0,
  invitationAccepted: true,
  // Internal field the API includes but the SDK drops:
  legacyId: USER_TEST_CONSTANTS.LEGACY_ID,
  ...overrides,
});
