/**
 * Platform directory types — request/response shapes for principal lookups.
 */

/**
 * The kind of principal a directory entry represents.
 */
export enum PlatformDirectoryEntityType {
  /** A person or robot account. */
  User = 'user',
  /** A group. */
  Group = 'group',
  /** An external application. */
  Application = 'application',
}

/**
 * Principal sources a directory search can be narrowed to.
 */
export enum PlatformDirectorySource {
  /** Users created directly in the organization. */
  LocalUsers = 'localUsers',
  /** Users provisioned from an external directory (e.g. Azure AD). */
  DirectoryUsers = 'directoryUsers',
  /** Groups created directly in the organization. */
  LocalGroups = 'localGroups',
  /** Groups provisioned from an external directory. */
  DirectoryGroups = 'directoryGroups',
  /** Robot accounts. */
  RobotAccounts = 'robotAccounts',
  /** External applications. */
  Applications = 'applications',
}

/**
 * A directory entry — a user, group, or application found by `directory.search()`.
 */
export interface PlatformDirectoryEntry {
  /** GUID of the principal. */
  id: string;
  /** The principal's identity name (username or group name). */
  name: string;
  /** Display name shown in the UI. */
  displayName: string;
  /** Email address; `null` for groups and applications. */
  email: string | null;
  /** Where the principal is provisioned from (e.g. `local`). */
  source: string;
  /** Directory domain the principal belongs to; `null` for local principals. */
  domain: string | null;
  /** Whether the entry is a user, group, or application. */
  type: PlatformDirectoryEntityType;
}

/**
 * Options for `directory.search()`.
 */
export interface PlatformDirectorySearchOptions {
  /** Returns only principals whose name starts with the text. */
  startsWith?: string;
  /** Returns only principals of this kind. */
  entityType?: PlatformDirectoryEntityType;
  /** Returns only principals from these sources. */
  sources?: PlatformDirectorySource[];
}

/**
 * A group returned by `directory.getGroupMembership()` — one of the groups the
 * user was checked against and belongs to.
 */
export interface PlatformDirectoryGroup {
  /** GUID of the group. */
  id: string;
  /** Group name. */
  name: string;
  /** Display name shown in the UI. */
  displayName: string;
  /** Email address; `null` for local groups. */
  email: string | null;
  /** Where the group is provisioned from (e.g. `local`). */
  source: string;
  /** Identifier in the external directory; `null` for local groups. */
  externalId: string | null;
}
