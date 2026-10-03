/**
 * Platform directory field and value mappings.
 */

import { PlatformDirectoryEntityType } from './directory.types';

/**
 * Semantic renames applied to directory search results — `identifier`/`identityName`
 * become the SDK-wide `id`/`name`.
 */
export const PlatformDirectoryEntryMap = {
  identifier: 'id',
  identityName: 'name',
} as const;

/**
 * Semantic renames applied to membership-check results.
 */
export const PlatformDirectoryGroupMap = {
  identifier: 'id',
} as const;

/**
 * Maps the numeric `type` codes the API returns to {@link PlatformDirectoryEntityType}.
 * The Swagger spec declares string values, but the live API sends codes.
 */
export const PlatformDirectoryEntityTypeMap: { [key: number]: PlatformDirectoryEntityType } = {
  0: PlatformDirectoryEntityType.User,
  1: PlatformDirectoryEntityType.Group,
  2: PlatformDirectoryEntityType.Application,
};
