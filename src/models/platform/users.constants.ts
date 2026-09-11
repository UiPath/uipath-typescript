/**
 * Platform user field and value mappings.
 */

import { PlatformUserType, PlatformUserCategory } from './users.types';

/**
 * Semantic renames between wire and SDK user fields: standard `*Time` names and
 * `groupIDs` → `groupIds` casing. Used for responses with `transformData()` and
 * for `users.updateById()` bodies with `transformRequest()`, which reverses the
 * map (SDK name → wire name).
 */
export const PlatformUserMap = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
  groupIDs: 'groupIds',
  groupIDsToAdd: 'groupIdsToAdd',
  groupIDsToRemove: 'groupIdsToRemove',
} as const;

/**
 * Maps the numeric `type` codes the API returns to {@link PlatformUserType}.
 * The Swagger spec declares string values, but the live API sends codes.
 */
export const PlatformUserTypeMap: { [key: number]: PlatformUserType } = {
  0: PlatformUserType.User,
  1: PlatformUserType.Robot,
  2: PlatformUserType.DirectoryUser,
  3: PlatformUserType.DirectoryGroup,
  4: PlatformUserType.RobotAccount,
  5: PlatformUserType.Application,
};

/**
 * Maps the numeric `category` codes the API returns to {@link PlatformUserCategory}.
 */
export const PlatformUserCategoryMap: { [key: number]: PlatformUserCategory } = {
  0: PlatformUserCategory.Local,
  1: PlatformUserCategory.LinkedLocal,
  2: PlatformUserCategory.Directory,
};
