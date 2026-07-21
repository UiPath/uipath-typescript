/**
 * Identity user management types — response shapes and enums.
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
