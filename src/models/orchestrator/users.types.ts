import type { RequestOptions } from '../common/types';
import type { PaginationOptions } from '../../utils/pagination';

/**
 * Kind of account an Orchestrator user represents.
 */
export enum OrchestratorUserType {
  /** A local Orchestrator user account. */
  User = 'User',
  /** A local robot account. */
  Robot = 'Robot',
  /**
   * A user account from the identity directory — the Automation Cloud organization
   * directory or a connected directory such as Microsoft Entra ID — as opposed to a
   * local Orchestrator account.
   */
  DirectoryUser = 'DirectoryUser',
  /** A group from the identity directory, as opposed to a local Orchestrator account. */
  DirectoryGroup = 'DirectoryGroup',
  /** A robot account from the identity directory, as opposed to a local Orchestrator account. */
  DirectoryRobot = 'DirectoryRobot',
  /** An external application that authenticates with client credentials. */
  DirectoryExternalApplication = 'DirectoryExternalApplication',
}

/**
 * How the user account was provisioned.
 */
export enum OrchestratorUserProvisionType {
  /** The account was added explicitly by an administrator. */
  Manual = 'Manual',
  /** The account was provisioned automatically on first sign-in, for example through directory-group membership. */
  Automatic = 'Automatic',
}

/**
 * License type assigned to an Orchestrator user.
 */
export enum OrchestratorUserLicenseType {
  /** Unattended robot license for non-production environments. */
  NonProduction = 'NonProduction',
  Attended = 'Attended',
  Unattended = 'Unattended',
  Development = 'Development',
  Studio = 'Studio',
  RpaDeveloper = 'RpaDeveloper',
  StudioX = 'StudioX',
  CitizenDeveloper = 'CitizenDeveloper',
  /** Unattended robot without a user interface session. */
  Headless = 'Headless',
  StudioPro = 'StudioPro',
  RpaDeveloperPro = 'RpaDeveloperPro',
  TestAutomation = 'TestAutomation',
  /** Cloud-hosted robot managed by Automation Cloud. */
  AutomationCloud = 'AutomationCloud',
  /** Serverless cloud robot. */
  Serverless = 'Serverless',
  AutomationKit = 'AutomationKit',
  /** Serverless cloud robot used for test automation. */
  ServerlessTestAutomation = 'ServerlessTestAutomation',
  /** Cloud-hosted robot used for test automation. */
  AutomationCloudTestAutomation = 'AutomationCloudTestAutomation',
  AttendedStudioWeb = 'AttendedStudioWeb',
  Hosting = 'Hosting',
  AssistantWeb = 'AssistantWeb',
  ProcessOrchestration = 'ProcessOrchestration',
  AgentService = 'AgentService',
  AppTest = 'AppTest',
  PerformanceTest = 'PerformanceTest',
  BusinessRule = 'BusinessRule',
  CaseManagement = 'CaseManagement',
  Flow = 'Flow',
  Local = 'Local',
}

/**
 * Scope at which a role assigned to a user applies.
 */
export enum OrchestratorUserRoleType {
  /** The role carries both tenant-level and folder-level permissions. */
  Mixed = 'Mixed',
  /** The role applies across the whole tenant. */
  Tenant = 'Tenant',
  /** The role applies within specific folders. */
  Folder = 'Folder',
}

/**
 * A role assigned to an Orchestrator user. Returned on {@link OrchestratorUserGetResponse.userRoles}
 * when `expand` includes `userRoles`.
 */
export interface OrchestratorUserRole {
  /**
   * Id of the user-role association; `0` when the API does not materialize it on
   * expanded roles — use `userId` + `roleId` to identify the pair.
   */
  id: number;
  /** The id of the associated user. */
  userId: number;
  /** The id of the associated role. */
  roleId: number;
  /** The name of the associated user, or `null` when the API does not populate it on expanded roles. */
  userName: string | null;
  /** The name of the associated role. */
  roleName: string;
  /** Scope at which the role applies. */
  roleType: OrchestratorUserRoleType;
}

/**
 * A single Orchestrator user returned by {@link OrchestratorUserServiceModel.getAll}.
 *
 * Robot-provisioning configuration (attended/unattended robot settings, credentials,
 * update policy) is intentionally not exposed.
 */
export interface OrchestratorUserGetResponse {
  /** Numeric user id. */
  id: number;
  /** Unique key (GUID) for the user. */
  key: string;
  /** The name used to log in to Orchestrator. */
  userName: string;
  /** The name of the person for which the user is created. */
  name: string;
  /** The surname of the person for which the user is created. */
  surname: string;
  /** The full name of the person, constructed as `Name Surname`. */
  fullName: string;
  /** The e-mail address associated with the user. */
  emailAddress: string;
  /** The domain from which the user is imported, or `null` when the user is not imported from a domain. */
  domain: string | null;
  /** The directory identifier from which the user is imported, or `null` when the user is not imported from a directory. */
  directoryIdentifier: string | null;
  /** The user type. */
  type: OrchestratorUserType;
  /** How the user account was provisioned. */
  provisionType: OrchestratorUserProvisionType;
  /** The user's license type, or `null` when no license is assigned. */
  licenseType: OrchestratorUserLicenseType | null;
  /** The source which authenticated this user. */
  authenticationSource: string;
  /** States if the user is active or not. An inactive user cannot log in to Orchestrator. */
  isActive: boolean;
  /** Whether the user's license is managed externally. */
  isExternalLicensed: boolean;
  /** The collection of role names associated with the user. */
  rolesList: string[];
  /** The collection of entities that can authenticate the user. */
  loginProviders: string[];
  /** The roles associated with the user. Only returned when `expand` includes `userRoles`. */
  userRoles?: OrchestratorUserRole[];
  /** The id of the tenant owning the user. */
  tenantId: number;
  /** The name of the tenant owning the user. */
  tenancyName: string | null;
  /** The display name of the tenant owning the user. */
  tenantDisplayName: string | null;
  /** The key of the tenant owning the user. */
  tenantKey: string | null;
  /** The account id of the user in the identity provider. */
  accountId: string | null;
  /** The date and time when the user last logged in, or `null` if the user never logged in. */
  lastLoginTime: string | null;
  /** The date and time when the user was created. */
  createdTime: string;
  /** The date and time when the user was last modified. */
  lastModifiedTime: string | null;
  /** Id of the user who created this user, or `null` when created by the system. */
  creatorUserId: number | null;
  /** Id of the user who last modified this user, or `null` when never modified by a user. */
  lastModifierUserId: number | null;
  /** Specifies whether this user is allowed to have a User session (default: true). */
  mayHaveUserSession: boolean;
  /** Specifies whether this user is allowed to have an Attended Robot attached (default: true). */
  mayHaveRobotSession: boolean;
  /** Specifies whether this user is allowed to have an Unattended Robot attached (default: false). */
  mayHaveUnattendedSession: boolean;
  /** Specifies whether this user is allowed to have a Personal Workspace. */
  mayHavePersonalWorkspace: boolean;
  /** Restrict to personal workspace view. */
  restrictToPersonalWorkspace: boolean;
  /** Whether every privilege the user holds is inherited from group membership. */
  hasOnlyInheritedPrivileges: boolean;
  /** Specifies whether this user is explicitly allowed to have a User session (default: true). */
  explicitMayHaveUserSession: boolean;
  /** Specifies whether this user is explicitly allowed to have an Attended Robot attached (default: true). */
  explicitMayHaveRobotSession: boolean;
  /** Specifies whether this user is explicitly allowed to have a Personal Workspace. */
  explicitMayHavePersonalWorkspace: boolean;
  /** Explicitly restricted to personal workspace view. */
  explicitRestrictToPersonalWorkspace: boolean;
}

/**
 * Options for {@link OrchestratorUserServiceModel.getAll}.
 *
 * `filter`, `orderby`, `select` and `expand` use the SDK field names shown on
 * {@link OrchestratorUserGetResponse} (for example `createdTime`, not the wire name).
 * `expand` supports `userRoles`. Pages hold at most 1000 users; a larger `pageSize`
 * is reduced to 1000.
 */
export type OrchestratorUserGetAllOptions = RequestOptions & PaginationOptions;
