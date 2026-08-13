/**
 * Platform user types — request/response shapes for organization user management.
 */

import type { PaginationOptions } from '../../utils/pagination';

/**
 * How a user account was created and how it is supposed to be used.
 */
export enum PlatformUserType {
  /** A person signing in interactively. */
  User = 'user',
  /** An account used by an unattended robot. */
  Robot = 'robot',
  /** A person provisioned from an external directory (e.g. Azure AD). */
  DirectoryUser = 'directoryUser',
  /** A group provisioned from an external directory. */
  DirectoryGroup = 'directoryGroup',
  /** A dedicated robot account (machine identity, no interactive sign-in). */
  RobotAccount = 'robotAccount',
  /** An external application (client credentials). */
  Application = 'application',
}

/**
 * How a user relates to directory provisioning.
 */
export enum PlatformUserCategory {
  /** Created directly in the organization. */
  Local = 'local',
  /** A local account linked to a directory identity. */
  LinkedLocal = 'linkedLocal',
  /** Provisioned entirely from an external directory. */
  Directory = 'directory',
}

/**
 * Fields users can be sorted by in `users.getAll()`.
 */
export enum PlatformUserSortField {
  Id = 'Id',
  UserName = 'UserName',
  Email = 'Email',
  EmailConfirmed = 'EmailConfirmed',
  Name = 'Name',
  Surname = 'Surname',
  DisplayName = 'DisplayName',
  CreatedTime = 'CreationTime',
  LastModifiedTime = 'LastModificationTime',
  LastLoginTime = 'LastLoginTime',
  IsActive = 'IsActive',
  Type = 'Type',
  Category = 'Category',
  InvitationAccepted = 'InvitationAccepted',
}

/**
 * Sort direction for `users.getAll()`.
 */
export enum PlatformUserSortOrder {
  Ascending = 'asc',
  Descending = 'desc',
}

/**
 * A user account, before entity methods are attached.
 */
export interface RawPlatformUserGetResponse {
  /** GUID of the user. */
  id: string;
  /** Sign-in username (usually the email address). */
  userName: string;
  /** The user's email address. */
  email: string;
  /** Whether the email address has been confirmed. */
  emailConfirmed: boolean;
  /** First name. */
  name: string | null;
  /** Last name. */
  surname: string | null;
  /** Display name shown in the UI. */
  displayName: string | null;
  /** When the account was created. */
  createdTime: string;
  /** When the account was last modified. */
  lastModifiedTime: string | null;
  /** When the user last signed in. */
  lastLoginTime: string | null;
  /** GUIDs of the groups the user belongs to. */
  groupIds: string[];
  /** Whether the account is active. */
  isActive: boolean;
  /** How the account was created and is used. */
  type: PlatformUserType;
  /** How the account relates to directory provisioning. */
  category: PlatformUserCategory;
  /** Whether the user has accepted their invitation. */
  invitationAccepted: boolean;
}

/**
 * Options for `users.getAll()`.
 */
export type PlatformUserGetAllOptions = PaginationOptions & {
  /** Filters users whose name, email, or username contains the term. */
  searchTerm?: string;
  /** Field to sort by. */
  sortBy?: PlatformUserSortField;
  /** Sort direction. */
  sortOrder?: PlatformUserSortOrder;
};

/**
 * Fields to change on a user. Only the fields present are sent — omitted
 * fields are left untouched.
 */
export interface PlatformUserUpdateOptions {
  /** New first name. */
  name?: string;
  /** New last name. */
  surname?: string;
  /** New display name. */
  displayName?: string;
  /** New email address. */
  email?: string;
  /** Activates or deactivates the account. */
  isActive?: boolean;
  /** New password. */
  password?: string;
  /** GUIDs of groups to add the user to. */
  groupIdsToAdd?: string[];
  /** GUIDs of groups to remove the user from. */
  groupIdsToRemove?: string[];
}

/**
 * A single failure reported by a user update.
 */
export interface PlatformUserUpdateError {
  /** Machine-readable error code. */
  code: string;
  /** Human-readable description of the failure. */
  description: string;
}

/**
 * Result of a user update.
 */
export interface PlatformUserUpdateResponse {
  /** Whether the update was applied. */
  success: boolean;
  /** Failures reported by the API; empty when `success` is `true`. */
  errors: PlatformUserUpdateError[];
}
