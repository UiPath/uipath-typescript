/**
 * Orchestrator Users service test constants
 * Orchestrator-user-specific constants only
 */

import type { RawOrchestratorUserDto } from '../../../src/models/orchestrator/users.internal-types';

const USER_ID = 4660601;
const USER_KEY = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const USER_NAME = 'jane.doe@example.com';
const FULL_NAME = 'Jane Doe';
const TENANT_ID = 794591;
const ROLE_ID = 42;
const ROLE_NAME = 'Automation User';
const USER_ROLE_ID = 7001;
const GROUP_ID = 4660543;
const GROUP_KEY = '35551807-06b1-4cda-90a1-2fb84851eee7';
// Distinctive timestamps so a rename test proves the value travelled through intact.
const CREATED_TIME = '2000-01-01T00:00:00.000Z';
const LAST_MODIFIED_TIME = '2000-01-02T00:00:00.000Z';
const LAST_LOGIN_TIME = '2000-01-03T00:00:00.000Z';

/** Raw PascalCase user as the API returns it (wire format), including the fields the SDK drops. */
const RAW_USER: RawOrchestratorUserDto = {
  DirectoryIdentifier: null,
  Name: 'Jane',
  Surname: 'Doe',
  UserName: USER_NAME,
  Domain: null,
  FullName: FULL_NAME,
  EmailAddress: USER_NAME,
  LastLoginTime: LAST_LOGIN_TIME,
  IsActive: true,
  CreationTime: CREATED_TIME,
  AuthenticationSource: 'local',
  Password: null,
  IsExternalLicensed: false,
  UserRoles: [
    {
      UserId: USER_ID,
      RoleId: ROLE_ID,
      // The API never populates UserName on expanded roles.
      UserName: null,
      RoleName: ROLE_NAME,
      RoleType: 'Tenant',
      Id: USER_ROLE_ID,
    },
  ],
  RolesList: [ROLE_NAME],
  ExternalRoles: [],
  LoginProviders: [],
  TenantId: TENANT_ID,
  TenancyName: null,
  TenantDisplayName: null,
  TenantKey: null,
  Type: 'DirectoryUser',
  ProvisionType: 'Automatic',
  LicenseType: 'Attended',
  Key: USER_KEY,
  MayHaveUserSession: true,
  MayHaveRobotSession: true,
  MayHaveUnattendedSession: false,
  MayHavePersonalWorkspace: true,
  RestrictToPersonalWorkspace: false,
  AccountId: null,
  HasOnlyInheritedPrivileges: false,
  ExplicitMayHaveUserSession: false,
  ExplicitMayHaveRobotSession: false,
  ExplicitMayHavePersonalWorkspace: false,
  ExplicitRestrictToPersonalWorkspace: false,
  LastModificationTime: LAST_MODIFIED_TIME,
  LastModifierUserId: null,
  CreatorUserId: null,
  Id: USER_ID,
  RobotProvision: null,
  UnattendedRobot: {
    UserName: null,
    Password: '',
    CredentialStoreId: 808781,
    CredentialType: 'NoCredential',
    CredentialExternalName: null,
    LimitConcurrentExecution: false,
    RobotId: 361685,
    MachineMappingsCount: 0,
    ExecutionSettings: {},
  },
  NotificationSubscription: {
    Queues: false,
    Robots: false,
    Jobs: false,
  },
  UpdatePolicy: { Type: 'LatestVersion', SpecificVersion: null },
};

/** Raw group account: the person and tenant fields the API leaves `null` for non-person accounts. */
const RAW_GROUP: RawOrchestratorUserDto = {
  ...RAW_USER,
  Id: GROUP_ID,
  Key: GROUP_KEY,
  Type: 'DirectoryGroup',
  Name: null,
  Surname: null,
  UserName: null,
  FullName: null,
  EmailAddress: null,
  AuthenticationSource: null,
  TenantId: null,
  LicenseType: null,
  UserRoles: [{ UserId: GROUP_ID, RoleId: ROLE_ID, UserName: null, RoleName: null, RoleType: null, Id: USER_ROLE_ID }],
};

export const ORCHESTRATOR_USER_TEST_CONSTANTS = {
  GROUP_ID,
  RAW_GROUP,
  USER_ID,
  USER_KEY,
  USER_NAME,
  FULL_NAME,
  TENANT_ID,
  ROLE_ID,
  ROLE_NAME,
  USER_ROLE_ID,
  CREATED_TIME,
  LAST_MODIFIED_TIME,
  LAST_LOGIN_TIME,
  RAW_USER,

  // Wire fields the SDK strips from every user. Deliberately independent of the production
  // ORCHESTRATOR_USER_DROPPED_FIELDS constant so the transform test cannot pass vacuously.
  DROPPED_WIRE_FIELDS: ['Password', 'NotificationSubscription', 'RobotProvision', 'UnattendedRobot', 'UpdatePolicy', 'ExternalRoles'],

  // Paginated response shape of the live tenant (36 users, 4 pages of 10).
  TOTAL_COUNT: 36,
  TOTAL_PAGES: 4,

  // OData options as a caller writes them (SDK names) and as the API must receive them.
  FILTER_SDK: "isActive eq true and createdTime gt 2000-01-01T00:00:00.000Z",
  FILTER_API: "isActive eq true and creationTime gt 2000-01-01T00:00:00.000Z",
  ORDERBY_SDK: 'lastModifiedTime desc',
  ORDERBY_API: 'lastModificationTime desc',
  SELECT_SDK: 'id,userName,createdTime,lastModifiedTime',
  SELECT_API: 'id,userName,creationTime,lastModificationTime',
  FILTER_BY_TYPE: "type eq 'DirectoryUser'",
  EXPAND_USER_ROLES: 'userRoles',

  // Error messages
  ERROR_USERS_FORBIDDEN: 'Insufficient permissions to list users',
} as const;
