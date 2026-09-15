/**
 * Platform group field and value mappings.
 */

import { PlatformGroupType } from './groups.types';

/**
 * Semantic renames applied to group rows: standard `*Time` names.
 */
export const PlatformGroupMap = {
  creationTime: 'createdTime',
  lastModificationTime: 'lastModifiedTime',
} as const;

/**
 * Outbound renames for `groups.create()` — the API expects `directoryUserMemberIDs`.
 * Used with `transformRequest()`, which reverses the map (SDK name → wire name).
 */
export const PlatformGroupCreateMap = {
  directoryUserMemberIDs: 'memberUserIds',
} as const;

/**
 * Outbound renames for `groups.updateById()`.
 * Used with `transformRequest()`, which reverses the map (SDK name → wire name).
 */
export const PlatformGroupUpdateMap = {
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
