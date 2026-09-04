import { config } from 'dotenv';
import path from 'path';

// Load environment variables from .env.integration
config({ path: path.resolve(__dirname, '../../.env.integration') });

export interface IntegrationConfig {
  baseUrl: string;
  /**
   * Base URL for suites authenticating with a user token. The CORS proxy in
   * front of `baseUrl` whitelists paths per service, which suites reaching
   * newer services would have to be added to; user-token suites therefore
   * talk to the platform host directly. Falls back to `baseUrl` when unset.
   */
  minterBaseUrl?: string;
  orgName: string;
  tenantName: string;
  tenantId?: string;
  secret: string;
  /**
   * User access token, minted by a browser login (Minter) rather than issued to
   * an external application. Required by services that reject PAT and
   * client-credentials tokens outright: everything under `insightsrtm_` (Agents,
   * Agent Memory, Agent Traces, Governance) and the notification service.
   * Unset by default — suites that need it skip rather than fail.
   */
  userToken?: string;
  timeout: number;
  skipCleanup: boolean;
  folderId?: string;
  folderKey?: string;
  folderPath?: string;
  maestroTestProcessKey?: string;
  /**
   * Process key of a statically-faulted Maestro process (faulted once ever, never run by
   * the suite). The incident read tests target it instead of the actively-faulting retry
   * fixture, so their reads never race an incident write — the first incidents read after
   * a write triggers a server-side re-aggregation that can exceed the test timeout.
   */
  maestroIncidentsProcessKey?: string;
  /**
   * Release key of a deployed case-management process used to self-seed a running case
   * instance via Orchestrator jobs. Must be a case process that stays Running after start
   * (e.g. one with a human task). The release key doubles as the Maestro processKey.
   */
  maestroCaseProcessKey?: string;
  /**
   * Release key of a deployed case-management process that runs to Completed without
   * human interaction (e.g. timer-driven). Used to seed reopenable instances — reopen
   * requires Completed status. Reopened instances do not re-complete on their own, so
   * tests must close them afterwards.
   */
  maestroCompletedCaseProcessKey?: string;
  orchestratorTestProcessKey?: string;
  dataFabricTestEntityId?: string;
  dataFabricTestFolderEntityId?: string;
  dataFabricTestChoiceSetId?: string;
  dataFabricTestAttachmentField?: string;
  // Cross-entity join fixture for the queryRecordsById join test. The three
  // join-key fields are required (the test throws when any is missing);
  // dataFabricTestJoinEntityName is optional and defaults to the queried entity.
  dataFabricTestJoinEntityName?: string;
  dataFabricTestJoinFieldName?: string;
  dataFabricTestJoinRelatedEntityName?: string;
  dataFabricTestJoinRelatedFieldName?: string;
  orchestratorAttachmentId?: string;
  /**
   * Name of a dedicated queue used by the queue item / transaction
   * integration tests (items are inserted into it). The write tests throw
   * when it is not configured, so they never mutate arbitrary queues.
   */
  queuesTestQueueName?: string;
  jobsTestFolderId?: string;
  tasksTestUserGroupId?: string;
  tasksTestUserId?: string;
  casTestAgentId?: string;
  casTestFolderId?: string;
  /**
   * Trace GUID used by the Agent Traces span tests. The trace must exist in the
   * test tenant and have at least one span; suites guard on it and throw when unset.
   */
  tracesTestTraceId?: string;
  functionsTestFolderId?: string;
  functionsTestFunctionName?: string;
  /**
   * Organization (account) GUID of the test organization. Required by the Platform suite:
   * omitting it on a read makes the API fall back to the host partition rather than the
   * caller's organization, which an external application is not authorized for.
   */
  organizationId?: string;
  /**
   * GUID of the user whose platform settings the Platform suite reads and round-trips.
   * Required: settings are scoped to (organization, user), the user must belong to the
   * organization the test PAT authenticates against, and the SDK cannot derive the calling
   * user from a PAT.
   *
   * Named for `IDENTITY_TEST_USER_ID` / the `UIPATH_IDENTITY_TEST_USER_ID` repository secret,
   * which are already provisioned under that name and are not developer-facing.
   */
  identityTestUserId?: string;
}

function isValidUrl(value: string): boolean {
  try {
    void new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateConfig(rawConfig: Record<string, unknown>): IntegrationConfig {
  const errors: string[] = [];

  if (typeof rawConfig.baseUrl !== 'string' || !isValidUrl(rawConfig.baseUrl)) {
    errors.push('  - baseUrl: UIPATH_BASE_URL must be a valid URL');
  }
  if (rawConfig.minterBaseUrl !== undefined &&
      (typeof rawConfig.minterBaseUrl !== 'string' || !isValidUrl(rawConfig.minterBaseUrl))) {
    errors.push('  - minterBaseUrl: MINTER_BASE_URL must be a valid URL when set');
  }
  if (typeof rawConfig.orgName !== 'string' || rawConfig.orgName.length === 0) {
    errors.push('  - orgName: UIPATH_ORG_NAME is required');
  }
  if (typeof rawConfig.tenantName !== 'string' || rawConfig.tenantName.length === 0) {
    errors.push('  - tenantName: UIPATH_TENANT_NAME is required');
  }
  if (typeof rawConfig.secret !== 'string' || rawConfig.secret.length === 0) {
    errors.push('  - secret: UIPATH_SECRET is required');
  }

  if (errors.length > 0) {
    throw new Error(
      `Integration test configuration is invalid:\n${errors.join('\n')}\n\n` +
      `Please ensure you have created a .env.integration file based on .env.integration.example ` +
      `and filled in all required values.`
    );
  }

  return {
    baseUrl: rawConfig.baseUrl as string,
    minterBaseUrl: typeof rawConfig.minterBaseUrl === 'string' ? rawConfig.minterBaseUrl : undefined,
    orgName: rawConfig.orgName as string,
    tenantName: rawConfig.tenantName as string,
    tenantId: typeof rawConfig.tenantId === 'string' ? rawConfig.tenantId : undefined,
    secret: rawConfig.secret as string,
    userToken: typeof rawConfig.userToken === 'string' && rawConfig.userToken.length > 0
      ? rawConfig.userToken
      : undefined,
    timeout: typeof rawConfig.timeout === 'number' && rawConfig.timeout > 0 ? rawConfig.timeout : 30000,
    skipCleanup: typeof rawConfig.skipCleanup === 'boolean' ? rawConfig.skipCleanup : false,
    folderId: typeof rawConfig.folderId === 'string' ? rawConfig.folderId : undefined,
    folderKey: typeof rawConfig.folderKey === 'string' ? rawConfig.folderKey : undefined,
    folderPath: typeof rawConfig.folderPath === 'string' ? rawConfig.folderPath : undefined,
    maestroTestProcessKey: typeof rawConfig.maestroTestProcessKey === 'string' ? rawConfig.maestroTestProcessKey : undefined,
    maestroIncidentsProcessKey: typeof rawConfig.maestroIncidentsProcessKey === 'string' ? rawConfig.maestroIncidentsProcessKey : undefined,
    maestroCaseProcessKey: typeof rawConfig.maestroCaseProcessKey === 'string' ? rawConfig.maestroCaseProcessKey : undefined,
    maestroCompletedCaseProcessKey: typeof rawConfig.maestroCompletedCaseProcessKey === 'string' ? rawConfig.maestroCompletedCaseProcessKey : undefined,
    orchestratorTestProcessKey: typeof rawConfig.orchestratorTestProcessKey === 'string' ? rawConfig.orchestratorTestProcessKey : undefined,
    dataFabricTestEntityId: typeof rawConfig.dataFabricTestEntityId === 'string' ? rawConfig.dataFabricTestEntityId : undefined,
    dataFabricTestFolderEntityId: typeof rawConfig.dataFabricTestFolderEntityId === 'string' ? rawConfig.dataFabricTestFolderEntityId : undefined,
    dataFabricTestChoiceSetId: typeof rawConfig.dataFabricTestChoiceSetId === 'string' ? rawConfig.dataFabricTestChoiceSetId : undefined,
    dataFabricTestAttachmentField: typeof rawConfig.dataFabricTestAttachmentField === 'string' ? rawConfig.dataFabricTestAttachmentField : undefined,
    dataFabricTestJoinEntityName: typeof rawConfig.dataFabricTestJoinEntityName === 'string' ? rawConfig.dataFabricTestJoinEntityName : undefined,
    dataFabricTestJoinFieldName: typeof rawConfig.dataFabricTestJoinFieldName === 'string' ? rawConfig.dataFabricTestJoinFieldName : undefined,
    dataFabricTestJoinRelatedEntityName: typeof rawConfig.dataFabricTestJoinRelatedEntityName === 'string' ? rawConfig.dataFabricTestJoinRelatedEntityName : undefined,
    dataFabricTestJoinRelatedFieldName: typeof rawConfig.dataFabricTestJoinRelatedFieldName === 'string' ? rawConfig.dataFabricTestJoinRelatedFieldName : undefined,
    orchestratorAttachmentId: typeof rawConfig.orchestratorAttachmentId === 'string' ? rawConfig.orchestratorAttachmentId : undefined,
    queuesTestQueueName: typeof rawConfig.queuesTestQueueName === 'string' ? rawConfig.queuesTestQueueName : undefined,
    jobsTestFolderId: typeof rawConfig.jobsTestFolderId === 'string' ? rawConfig.jobsTestFolderId : undefined,
    tasksTestUserGroupId: typeof rawConfig.tasksTestUserGroupId === 'string' ? rawConfig.tasksTestUserGroupId : undefined,
    tasksTestUserId: typeof rawConfig.tasksTestUserId === 'string' ? rawConfig.tasksTestUserId : undefined,
    casTestAgentId: typeof rawConfig.casTestAgentId === 'string' ? rawConfig.casTestAgentId : undefined,
    casTestFolderId: typeof rawConfig.casTestFolderId === 'string' ? rawConfig.casTestFolderId : undefined,
    tracesTestTraceId: typeof rawConfig.tracesTestTraceId === 'string' ? rawConfig.tracesTestTraceId : undefined,
    functionsTestFolderId: typeof rawConfig.functionsTestFolderId === 'string' ? rawConfig.functionsTestFolderId : undefined,
    functionsTestFunctionName: typeof rawConfig.functionsTestFunctionName === 'string' ? rawConfig.functionsTestFunctionName : undefined,
    organizationId: typeof rawConfig.organizationId === 'string' ? rawConfig.organizationId : undefined,
    identityTestUserId: typeof rawConfig.identityTestUserId === 'string' ? rawConfig.identityTestUserId : undefined,
  };
}

let cachedConfig: IntegrationConfig | null = null;

/**
 * Loads and validates integration test configuration from environment variables.
 * Configuration is cached after first load.
 *
 * @throws {Error} If required environment variables are missing or invalid
 * @returns {IntegrationConfig} Validated configuration object
 */
export function loadIntegrationConfig(): IntegrationConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const rawConfig = {
    baseUrl: process.env.UIPATH_BASE_URL,
    minterBaseUrl: process.env.MINTER_BASE_URL || undefined,
    orgName: process.env.UIPATH_ORG_NAME,
    tenantName: process.env.UIPATH_TENANT_NAME,
    tenantId: process.env.UIPATH_TENANT_ID_DEV || undefined,
    secret: process.env.UIPATH_SECRET,
    userToken: process.env.UIPATH_USER_TOKEN || undefined,
    timeout: process.env.INTEGRATION_TEST_TIMEOUT
      ? parseInt(process.env.INTEGRATION_TEST_TIMEOUT, 10)
      : 30000,
    skipCleanup: process.env.INTEGRATION_TEST_SKIP_CLEANUP === 'true',
    folderId: process.env.INTEGRATION_TEST_FOLDER_ID || undefined,
    folderKey: process.env.INTEGRATION_TEST_FOLDER_KEY || undefined,
    folderPath: process.env.INTEGRATION_TEST_FOLDER_PATH || undefined,
    maestroTestProcessKey: process.env.MAESTRO_TEST_PROCESS_KEY || undefined,
    maestroIncidentsProcessKey: process.env.MAESTRO_TEST_INCIDENTS_PROCESS_KEY || undefined,
    maestroCaseProcessKey: process.env.MAESTRO_TEST_CASE_PROCESS_KEY || undefined,
    maestroCompletedCaseProcessKey: process.env.MAESTRO_TEST_COMPLETED_CASE_PROCESS_KEY || undefined,
    orchestratorTestProcessKey: process.env.ORCHESTRATOR_TEST_PROCESS_KEY || undefined,
    dataFabricTestEntityId: process.env.DATA_FABRIC_TEST_ENTITY_ID || undefined,
    dataFabricTestFolderEntityId: process.env.DATA_FABRIC_TEST_FOLDER_ENTITY_ID || undefined,
    dataFabricTestChoiceSetId: process.env.DATA_FABRIC_TEST_CHOICESET_ID || undefined,
    dataFabricTestAttachmentField: process.env.DATA_FABRIC_TEST_ATTACHMENT_FIELD || undefined,
    dataFabricTestJoinEntityName: process.env.DATA_FABRIC_TEST_JOIN_ENTITY_NAME || undefined,
    dataFabricTestJoinFieldName: process.env.DATA_FABRIC_TEST_JOIN_FIELD_NAME || undefined,
    dataFabricTestJoinRelatedEntityName: process.env.DATA_FABRIC_TEST_JOIN_RELATED_ENTITY_NAME || undefined,
    dataFabricTestJoinRelatedFieldName: process.env.DATA_FABRIC_TEST_JOIN_RELATED_FIELD_NAME || undefined,
    orchestratorAttachmentId: process.env.ORCHESTRATOR_ATTACHMENT_ID || undefined,
    queuesTestQueueName: process.env.QUEUES_TEST_QUEUE_NAME || undefined,
    jobsTestFolderId: process.env.JOBS_TEST_FOLDER_ID || undefined,
    tasksTestUserGroupId: process.env.TASKS_TEST_USER_GROUP_ID || undefined,
    tasksTestUserId: process.env.TASKS_TEST_USER_ID || undefined,
    casTestAgentId: process.env.CAS_TEST_AGENT_ID || undefined,
    casTestFolderId: process.env.CAS_TEST_FOLDER_ID || undefined,
    tracesTestTraceId: process.env.TRACES_TEST_TRACE_ID || undefined,
    functionsTestFolderId: process.env.FUNCTIONS_TEST_FOLDER_ID || undefined,
    functionsTestFunctionName: process.env.FUNCTIONS_TEST_FUNCTION_NAME || undefined,
    organizationId: process.env.UIPATH_ORGANIZATION_ID || undefined,
    identityTestUserId: process.env.IDENTITY_TEST_USER_ID || undefined,
  };

  cachedConfig = validateConfig(rawConfig);
  return cachedConfig;
}

/**
 * What a suite needs from its credential:
 * - 'pat'  — the external-application identity specifically
 * - 'user' — a user access token specifically (insightsrtm_, notification service)
 * - 'any'  — either works; the harness picks the best available
 */
export type AuthRequirement = 'pat' | 'user' | 'any';

/** The credential actually used for a run. */
export type AuthMode = 'pat' | 'user';

/**
 * Resolves a requirement to the credential to authenticate with, or null when
 * nothing configured can satisfy it.
 *
 * Reads `process.env` directly and stays free of side effects so it can be
 * evaluated at collection time by `describe.skipIf(...)`, which runs long before
 * any `beforeAll`. Resolution must agree between the guard and the setup helper,
 * so both call this.
 *
 * `'any'` prefers the user token: it carries the signed-in user's permissions
 * rather than an external app's granted scopes, so it reaches strictly more of
 * the API. Set `INTEGRATION_AUTH_MODE=pat` to force the PAT path instead — used
 * to keep that path covered even once a user token is available everywhere.
 */
export function resolveAuthMode(requirement: AuthRequirement): AuthMode | null {
  const hasUser = Boolean(process.env.UIPATH_USER_TOKEN);
  const hasPat = Boolean(process.env.UIPATH_SECRET);

  if (requirement === 'user') return hasUser ? 'user' : null;
  if (requirement === 'pat') return hasPat ? 'pat' : null;

  const forced = process.env.INTEGRATION_AUTH_MODE;
  if (forced === 'pat') return hasPat ? 'pat' : null;
  if (forced === 'user') return hasUser ? 'user' : null;

  if (hasUser) return 'user';
  return hasPat ? 'pat' : null;
}

/**
 * Picks the host for a run. User-token suites use `MINTER_BASE_URL` when set:
 * the default host sits behind a CORS proxy whose path whitelist has to list
 * every service a suite touches, and these suites reach services that are not
 * on it. PAT suites keep the default host.
 */
export function resolveBaseUrl(config: IntegrationConfig, authMode: AuthMode): string {
  return authMode === 'user' ? config.minterBaseUrl ?? config.baseUrl : config.baseUrl;
}

/** Whether any configured credential can satisfy the requirement. */
export function canAuthenticate(requirement: AuthRequirement): boolean {
  return resolveAuthMode(requirement) !== null;
}

/**
 * Resets the cached configuration (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
