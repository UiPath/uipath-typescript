/**
 * Platform group types — request/response shapes for organization group management.
 */

import type { PlatformUserType } from './users.types';

/**
 * How a group was created.
 */
export enum PlatformGroupType {
  /** Ships with the organization (Everyone, Administrators, …); cannot be modified or deleted. */
  BuiltIn = 'builtIn',
  /** Created in the organization. */
  Custom = 'custom',
}

/**
 * A group, before entity methods are attached.
 */
export interface RawPlatformGroupGetResponse {
  /** GUID of the group. */
  id: string;
  /** Group name. */
  name: string;
  /** Display name shown in the UI. */
  displayName: string;
  /** Whether the group is built-in or custom. */
  type: PlatformGroupType;
  /** When the group was created. */
  createdTime: string;
  /** When the group was last modified. */
  lastModifiedTime: string | null;
  /** Organization (account) GUID the group belongs to. Added by the SDK from the request scope. */
  organizationId: string;
}

/**
 * Options for `groups.create()`.
 */
export interface PlatformGroupCreateOptions {
  /** GUIDs of users to add as members of the new group. */
  memberUserIds?: string[];
}

/**
 * Membership changes for a group update.
 */
export interface PlatformGroupMembershipOptions {
  /** GUIDs of users to add as members. */
  memberUserIdsToAdd?: string[];
  /** GUIDs of users to remove from the group. */
  memberUserIdsToRemove?: string[];
}

/**
 * Fields to change on a bound `group.update()` call. The group's current name
 * is filled in automatically when `name` is omitted — the API requires a name
 * on every update.
 */
export interface PlatformGroupUpdateOptions extends PlatformGroupMembershipOptions {
  /** New group name. Defaults to the group's current name. */
  name?: string;
}

/**
 * A group member reference. Only the identity is returned — fetch the full
 * profile with `users.getById()` when needed.
 */
export interface PlatformGroupMember {
  /** GUID of the member (user or robot account). */
  id: string;
  /** The member's account type. */
  type: PlatformUserType;
}
