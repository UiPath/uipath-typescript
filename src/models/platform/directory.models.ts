/**
 * Platform directory service model — the ServiceModel interface that drives
 * generated API documentation.
 */

import type {
  PlatformDirectoryEntry,
  PlatformDirectorySearchOptions,
  PlatformDirectoryGroup,
} from './directory.types';

/**
 * Public surface of the Directory service.
 *
 * The directory is the lookup layer over an organization's principals — users,
 * groups, and applications, whether local or provisioned from an external
 * directory. Use it to find principals by name and to answer membership questions
 * ("is this user in the Administrators group?") without listing whole groups.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Directory } from '@uipath/uipath-typescript/directory';
 *
 * const directory = new Directory(sdk);
 * const results = await directory.search('sar');
 * ```
 */
export interface PlatformDirectoryServiceModel {
  /**
   * Searches the organization's principals by name prefix.
   *
   * Returns users, groups, and applications whose name starts with the text, from both
   * local and external-directory sources. The prefix is required (one character is
   * enough); every match comes back in a single response — the results are not paged.
   *
   * @param startsWith - Name prefix to match
   * @param options - Narrow the results by principal kind or source
   * @returns The matching principals, as {@link PlatformDirectoryEntry} items
   *
   * @example Find principals by name
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Directory } from '@uipath/uipath-typescript/directory';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const directory = new Directory(sdk);
   * const results = await directory.search('sar');
   * ```
   *
   * @example Find groups only
   * ```typescript
   * import { PlatformDirectoryEntityType } from '@uipath/uipath-typescript/directory';
   *
   * const groups = await directory.search('Admin', {
   *   entityType: PlatformDirectoryEntityType.Group,
   * });
   * ```
   */
  search(startsWith: string, options?: PlatformDirectorySearchOptions): Promise<PlatformDirectoryEntry[]>;

  /**
   * Checks which of the given groups a user belongs to.
   *
   * Returns the subset of `groupIds` the user is a member of — the membership
   * check behind "does this user hold the admin group?". An empty array means
   * the user is in none of them.
   *
   * First, get group IDs with `groups.getAll()` (from `@uipath/uipath-typescript/groups`).
   *
   * @param userId - GUID of the user to check
   * @param groupIds - GUIDs of the groups to check against
   * @returns The groups the user belongs to, as {@link PlatformDirectoryGroup} items
   *
   * @example
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Directory } from '@uipath/uipath-typescript/directory';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const directory = new Directory(sdk);
   * const memberships = await directory.getGroupMembership('<userId>', ['<adminGroupId>']);
   * const isAdmin = memberships.length > 0;
   * ```
   */
  getGroupMembership(userId: string, groupIds: string[]): Promise<PlatformDirectoryGroup[]>;
}
