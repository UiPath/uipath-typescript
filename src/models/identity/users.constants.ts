import { UserType, UserCategory } from './users.types';

/**
 * User field mappings (API field name → SDK field name).
 *
 * Semantic renames only — the API already returns camelCase, so no case
 * conversion is involved. `groupIDsToAdd`/`groupIDsToRemove` appear only in
 * update requests; `transformRequest()` reverses the map for outbound payloads.
 */
export const UserMap: { [key: string]: string } = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
  groupIDs: 'groupIds',
  groupIDsToAdd: 'groupIdsToAdd',
  groupIDsToRemove: 'groupIdsToRemove',
};

/**
 * Maps numeric user type codes (from API) to {@link UserType} enum values.
 */
export const UserTypeMap: { [key: number]: UserType } = {
  0: UserType.User,
  1: UserType.Robot,
  2: UserType.DirectoryUser,
  3: UserType.DirectoryGroup,
  4: UserType.RobotAccount,
  5: UserType.Application,
};

/**
 * Maps numeric user category codes (from API) to {@link UserCategory} enum values.
 */
export const UserCategoryMap: { [key: number]: UserCategory } = {
  0: UserCategory.Local,
  1: UserCategory.LinkedLocal,
  2: UserCategory.Directory,
};
