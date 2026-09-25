/**
 * Platform group field and value mappings.
 */

import { PlatformGroupType } from './groups.types';

/**
 * Semantic renames for groups: standard `*Time` names on responses, and the
 * `directoryUser*` membership fields the API expects on writes. Used for responses
 * with `transformData()` and for request bodies with `transformRequest()`, which
 * reverses the map (SDK name → wire name).
 */
export const PlatformGroupMap = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
  directoryUserMemberIDs: 'memberUserIds',
  directoryUserIDsToAdd: 'memberUserIdsToAdd',
  directoryUserIDsToRemove: 'memberUserIdsToRemove',
} as const;

/**
 * Maps the numeric `type` codes the API returns to {@link PlatformGroupType}.
 * The Swagger spec declares string values, but the live API sends codes.
 */
export const PlatformGroupTypeMap: { [key: number]: PlatformGroupType } = {
  0: PlatformGroupType.BuiltIn,
  1: PlatformGroupType.Custom,
};
