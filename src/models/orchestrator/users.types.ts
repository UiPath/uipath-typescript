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
  /** A person provisioned from an external directory (for example Microsoft Entra ID). */
  DirectoryUser = 'DirectoryUser',
  /** A group provisioned from an external directory. */
  DirectoryGroup = 'DirectoryGroup',
  /** A robot account provisioned from an external directory. */
  DirectoryRobot = 'DirectoryRobot',
  /** An external application that authenticates with client credentials. */
  DirectoryExternalApplication = 'DirectoryExternalApplication',
}

/**
 * How the user's robot was provisioned.
 */
export enum OrchestratorUserProvisionType {
  /** The robot was created explicitly by an administrator. */
  Manual = 'Manual',
  /** The robot was provisioned automatically when the user first signed in. */
  Automatic = 'Automatic',
}

/**
 * License type assigned to an Orchestrator user.
 */
export enum OrchestratorUserLicenseType {
  /** Robot license for non-production (test or staging) use. */
  NonProduction = 'NonProduction',
  Attended = 'Attended',
  Unattended = 'Unattended',
  /** Robot license for development machines. */
  Development = 'Development',
  Studio = 'Studio',
  RpaDeveloper = 'RpaDeveloper',
  StudioX = 'StudioX',
  /** StudioX license bundled for citizen developers. */
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
  /** Attended license granted through Studio Web. */
  AttendedStudioWeb = 'AttendedStudioWeb',
  /** Hosting license for robots run on behalf of other tenants. */
  Hosting = 'Hosting',
  /** License for the web version of UiPath Assistant. */
  AssistantWeb = 'AssistantWeb',
  /** License for Maestro process orchestration. */
  ProcessOrchestration = 'ProcessOrchestration',
  /** License for running agents. */
  AgentService = 'AgentService',
  /** License for application test automation. */
  AppTest = 'AppTest',
  /** License for performance testing. */
  PerformanceTest = 'PerformanceTest',
  /** License for business rule execution. */
  BusinessRule = 'BusinessRule',
  /** License for case management. */
  CaseManagement = 'CaseManagement',
  /** License for flow execution. */
  Flow = 'Flow',
  /** License consumed locally rather than from the tenant pool. */
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
  /** Id of the user-role association. */
  id: number;
  /** The id of the associated user. */
  userId: number;
  /** The id of the associated role. */
  roleId: number;
  /** The name of the associated user. */
  userName: string;
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
  /** The domain from which the user is imported, or `null` for local users. */
  domain: string | null;
  /** The directory identifier from which the user is imported, or `null` for local users. */
  directoryIdentifier: string | null;
  /** The user type. */
  type: OrchestratorUserType;
  /** How the user's robot was provisioned. */
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
 * `expand` supports `userRoles`. `pageSize` may not exceed 1000 — the API rejects
 * larger values.
 */
export type OrchestratorUserGetAllOptions = RequestOptions & PaginationOptions;
