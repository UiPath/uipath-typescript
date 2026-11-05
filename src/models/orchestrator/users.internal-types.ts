/**
 * Wire shapes of the Orchestrator Users API (PascalCase, before any SDK transform).
 * Defined independently of the public types — they describe the API contract, not the
 * SDK's response shape.
 */

/** Wire shape of a user-role association (`UserRoleDto`). */
export interface RawOrchestratorUserRoleDto {
  Id: number;
  UserId: number;
  RoleId: number;
  UserName: string | null;
  RoleName: string | null;
  RoleType: string | null;
}

/** Wire shape of attended-robot provisioning (`AttendedRobotDto`). Dropped from responses. */
export interface RawOrchestratorAttendedRobotDto {
  UserName: string | null;
  ExecutionSettings: Record<string, unknown> | null;
  RobotId: number | null;
  RobotType: string | null;
}

/** Wire shape of unattended-robot provisioning (`UnattendedRobotDto`). Dropped from responses. */
export interface RawOrchestratorUnattendedRobotDto {
  UserName: string | null;
  Password: string | null;
  CredentialStoreId: number | null;
  CredentialType: string | null;
  CredentialExternalName: string | null;
  ExecutionSettings: Record<string, unknown> | null;
  LimitConcurrentExecution: boolean;
  RobotId: number | null;
  MachineMappingsCount: number;
}

/** Wire shape of the robot update policy (`UpdatePolicyDto`). Dropped from responses. */
export interface RawOrchestratorUpdatePolicyDto {
  Type: string;
  SpecificVersion: string | null;
}

/** Wire shape of a user (`UserDto`), including the fields the SDK drops. */
export interface RawOrchestratorUserDto {
  Id: number;
  Key: string;
  UserName: string | null;
  Name: string | null;
  Surname: string | null;
  FullName: string | null;
  EmailAddress: string | null;
  Domain: string | null;
  DirectoryIdentifier: string | null;
  Type: string;
  ProvisionType: string;
  LicenseType: string | null;
  AuthenticationSource: string | null;
  IsActive: boolean;
  IsExternalLicensed: boolean;
  RolesList: string[];
  LoginProviders: string[];
  UserRoles?: RawOrchestratorUserRoleDto[];
  TenantId: number | null;
  TenancyName: string | null;
  TenantDisplayName: string | null;
  TenantKey: string | null;
  AccountId: string | null;
  LastLoginTime: string | null;
  CreationTime: string;
  LastModificationTime: string | null;
  CreatorUserId: number | null;
  LastModifierUserId: number | null;
  MayHaveUserSession: boolean;
  MayHaveRobotSession: boolean;
  MayHaveUnattendedSession: boolean;
  MayHavePersonalWorkspace: boolean;
  RestrictToPersonalWorkspace: boolean;
  HasOnlyInheritedPrivileges: boolean;
  ExplicitMayHaveUserSession: boolean;
  ExplicitMayHaveRobotSession: boolean;
  ExplicitMayHavePersonalWorkspace: boolean;
  ExplicitRestrictToPersonalWorkspace: boolean;
  /** Deprecated by the API; always `null`. */
  Password: string | null;
  /** Every member is deprecated by the API. */
  NotificationSubscription: Record<string, boolean> | null;
  RobotProvision: RawOrchestratorAttendedRobotDto | null;
  UnattendedRobot: RawOrchestratorUnattendedRobotDto | null;
  UpdatePolicy: RawOrchestratorUpdatePolicyDto | null;
  /** Returned by the API but absent from its public contract. */
  ExternalRoles: unknown[];
}

/**
 * Wire fields removed from each user before it is returned: deprecated members
 * (`Password`, `NotificationSubscription`), robot-provisioning configuration including
 * credential fields (`RobotProvision`, `UnattendedRobot`, `UpdatePolicy`), and
 * `ExternalRoles`, which is absent from the API's public contract.
 */
export const ORCHESTRATOR_USER_DROPPED_FIELDS = [
  'Password',
  'NotificationSubscription',
  'RobotProvision',
  'UnattendedRobot',
  'UpdatePolicy',
  'ExternalRoles',
] as const satisfies ReadonlyArray<keyof RawOrchestratorUserDto>;
