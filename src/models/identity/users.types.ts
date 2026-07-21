/**
 * Identity user management types — response shapes, request payloads and enums.
 */

/**
 * Defines how a user was created and how it is supposed to be used.
 */
export enum UserType {
  /** Standard interactive user. */
  User = 'user',
  /** Robot user driving unattended automation. */
  Robot = 'robot',
  /** User provisioned from an external directory (e.g. Azure AD). */
  DirectoryUser = 'directoryUser',
  /** Group provisioned from an external directory. */
  DirectoryGroup = 'directoryGroup',
  /** Robot account (non-interactive machine identity). */
  RobotAccount = 'robotAccount',
  /** External application identity. */
  Application = 'application',
}

/**
 * Discriminates a user by how they relate to directory provisioning.
 */
export enum UserCategory {
  /** Local account managed in UiPath. */
  Local = 'local',
  /** Local account linked to a directory identity. */
  LinkedLocal = 'linkedLocal',
  /** Account provisioned from an external directory. */
  Directory = 'directory',
}

/**
 * User as returned by the Identity user management API.
 *
 * Field selection: `legacyId` (an internal platform synchronization field) is returned
 * by the API but dropped from the SDK because it has no use for an application developer.
 */
export interface RawUserGetResponse {
  /** User GUID. */
  id: string;
  /** The username. */
  userName: string;
  /** Email address. Empty string when the user has no email. */
  email: string;
  /** Whether the email address has been confirmed. */
  emailConfirmed: boolean;
  /** First name. */
  name: string | null;
  /** Last name. */
  surname: string | null;
  /** Display name. */
  displayName: string | null;
  /** When the user was created. */
  createdTime: string;
  /** When the user was last modified. */
  lastModifiedTime: string | null;
  /** When the user last logged in. `null` if the user has never logged in. */
  lastLoginTime: string | null;
  /** GUIDs of the groups the user is a member of. */
  groupIds: string[];
  /** Whether the user is active. */
  isActive: boolean;
  /** Whether this user bypasses the basic authentication restriction. */
  bypassBasicAuthRestriction: boolean;
  /** How the user was created and is supposed to be used. */
  type: UserType;
  /** How the user relates to directory provisioning. */
  category: UserCategory;
  /** Whether the user has accepted their invitation. */
  invitationAccepted: boolean;
}

/**
 * Error entry from a failed user operation.
 */
export interface UserOperationError {
  /** Machine-readable error code (e.g. `InvalidUserName`). */
  code: string;
  /** Human-readable error description. */
  description: string;
}

/**
 * Overall outcome of a user operation.
 */
export interface UserOperationResult {
  /** Whether the operation succeeded. */
  succeeded: boolean;
  /** Errors that caused the operation to fail. Empty on success. */
  errors: UserOperationError[];
}

/**
 * Response from `updateById()`.
 */
export interface UserUpdateResponse extends UserOperationResult {}

/**
 * Payload for `updateById()`. Only the provided fields are changed.
 */
export interface UserUpdateOptions {
  /** New first name. */
  name?: string;
  /** New last name. */
  surname?: string;
  /** New display name. */
  displayName?: string;
  /** New email address. */
  email?: string;
  /** Activate (`true`) or deactivate (`false`) the user. */
  isActive?: boolean;
  /** New password. */
  password?: string;
  /** GUIDs of groups to add the user to. */
  groupIdsToAdd?: string[];
  /** GUIDs of groups to remove the user from. */
  groupIdsToRemove?: string[];
  /** Whether this user bypasses the basic authentication restriction. */
  bypassBasicAuthRestriction?: boolean;
  /** Whether the user should be marked as having accepted their invitation. */
  invitationAccepted?: boolean;
}

/**
 * A user to create with `create()`.
 */
export interface UserCreateData {
  /** Username — can only contain letters or digits. */
  userName: string;
  /** Email address. */
  email?: string;
  /** First name. */
  name?: string;
  /** Last name. */
  surname?: string;
  /** Display name. */
  displayName?: string;
  /** Whether the user should be marked as having accepted their invitation. */
  invitationAccepted?: boolean;
  /** Whether this user bypasses the basic authentication restriction. */
  bypassBasicAuthRestriction?: boolean;
}

/**
 * Options for `create()`.
 */
export interface UserCreateOptions {
  /** GUIDs of groups every created user is added to. */
  groupIds?: string[];
}

/**
 * A user to invite with `invite()`.
 */
export interface UserInviteData {
  /** Email address the invitation is sent to. */
  email: string;
  /**
   * URL the accept-invite link redirects to. Must be an allowed UiPath portal URL for
   * the organization, e.g. `https://cloud.uipath.com/portal_/acceptInvite?organizationId=...`
   * — other URLs are rejected per user with `Redirect URL is not valid`.
   */
  redirectUrl: string;
  /** First name. */
  name?: string;
  /** Last name. */
  surname?: string;
  /** Language code for the invitation email (e.g. `en`). */
  language?: string;
  /** GUIDs of groups the invited user is added to. */
  groupIds?: string[];
}

/**
 * Per-user outcome of `invite()`.
 */
export interface UserInviteResult {
  /** Email address the invitation was sent to. */
  email: string;
  /** GUID of the newly invited user. All-zeros GUID when the invitation failed. */
  id: string;
  /** Why the invitation failed. `null` on success. */
  errorMessage: string | null;
  /** Whether this user was successfully invited. */
  success: boolean;
}

/**
 * Response from `invite()`.
 *
 * `result` reflects the request as a whole; individual invitations can still fail —
 * check `success` on each entry in `users`.
 */
export interface UserInviteResponse {
  /** Overall outcome of the invite request. */
  result: UserOperationResult;
  /** Per-user invitation outcomes. */
  users: UserInviteResult[];
}
