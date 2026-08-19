import { UiPath } from '../../../src/core';
import {
  ChoiceSets,
  DataFabricDirectoryService,
  DataFabricRoleService,
  Entities,
} from '../../../src/services/data-fabric';
import { Tasks, TaskCatalogs } from '../../../src/services/action-center';
import { Assets, Buckets, Jobs, Queues, Processes } from '../../../src/services/orchestrator';
import { AttachmentService as Attachments } from '../../../src/services/orchestrator/attachments';
import {
  MaestroProcessesService,
  ProcessInstancesService,
  ProcessIncidentsService,
  CasesService,
  CaseInstancesService,
} from '../../../src/services/maestro';
import { Feedback } from '../../../src/services/agents/feedback';
import { Agents } from '../../../src/services/agents';
import { AgentMemory } from '../../../src/services/agents/memory';
import { AgentTraces } from '../../../src/services/observability/traces/agent';
import { Traces } from '../../../src/services/observability/traces';
import { Governance } from '../../../src/services/governance';
import { Notifications, Subscriptions } from '../../../src/services/notification';
import { ConversationalAgentService } from '../../../src/services/conversational-agent';
import { Functions } from '../../../src/services/orchestrator/functions';
import { Platform } from '../../../src/services/platform';
import { loadIntegrationConfig, IntegrationConfig, resolveAuthMode, AuthRequirement, AuthMode } from './test-config';
export { hasUserToken, canAuthenticate, resolveAuthMode } from './test-config';
export type { AuthRequirement, AuthMode } from './test-config';
import { UiPath as LegacyUiPath } from '../../../src/uipath';
import { afterAll, beforeAll } from 'vitest';

// Re-export cleanup functions from cleanup.ts for convenience
export {
  cleanupTestTask,
  cleanupTestEntityRecords,
  cleanupTestProcessInstance,
  cleanupTestCaseInstance,
  cleanupTestBucketFile,
  cleanupAllTestResources,
  registerResource,
} from '../utils/cleanup';

/**
 * Unified services interface - same shape for both v1 and v2
 */
export interface TestServices {
  sdk: UiPath;
  entities: Entities;
  choiceSets: ChoiceSets;
  dataFabricRoles: DataFabricRoleService;
  dataFabricDirectory: DataFabricDirectoryService;
  tasks: Tasks;
  taskCatalogs?: TaskCatalogs;
  assets: Assets;
  buckets: Buckets;
  queues: Queues;
  jobs?: Jobs;
  attachments?: Attachments;
  processes: Processes;
  maestroProcesses: MaestroProcessesService;
  processInstances: ProcessInstancesService;
  processIncidents: ProcessIncidentsService;
  cases: CasesService;
  caseInstances: CaseInstancesService;
  feedback?: Feedback;
  memory?: AgentMemory;
  agentTraces?: AgentTraces;
  traces?: Traces;
  agents?: Agents;
  governance?: Governance;
  notifications?: Notifications;
  subscriptions?: Subscriptions;
  conversationalAgent?: ConversationalAgentService;
  functions?: Functions;
  platform?: Platform;
}

/**
 * SDK initialization modes:
 * - 'v0': Legacy SDK (1.0-preview) - services accessed via SDK properties (sdk.tasks, sdk.entities, etc.)
 * - 'v1': Modular SDK (1.0 GA) - services instantiated directly with SDK (new Tasks(sdk), new Entities(sdk), etc.)
 */
export type InitMode = 'v0' | 'v1';


let servicesInstance: TestServices | null = null;
let testConfig: IntegrationConfig | null = null;
let currentMode: InitMode | null = null;
let currentAuthMode: AuthMode | null = null;

/**
 * Picks the bearer token for the requested auth mode.
 *
 * @throws {Error} If user-token auth is requested but no token is configured
 */
function resolveToken(config: IntegrationConfig, authMode: AuthMode): string {
  if (authMode === 'pat') {
    return config.secret;
  }

  if (!config.userToken) {
    throw new Error(
      'User-token auth was requested but UIPATH_USER_TOKEN is not set. Suites that ' +
      'require it must guard with `describe.skipIf(!hasUserToken())` so they skip ' +
      'instead of failing when the token is unavailable.'
    );
  }

  return config.userToken;
}

/**
 * Creates services using V0 pattern (legacy SDK property access)
 */
function createV0Services(config: IntegrationConfig, token: string): TestServices {
  const sdk = new LegacyUiPath({
    baseUrl: config.baseUrl,
    orgName: config.orgName,
    tenantName: config.tenantName,
    secret: token,
  });

  if (!sdk.isAuthenticated()) {
    throw new Error('V0 SDK initialization failed: Authentication unsuccessful.');
  }

  // V0 pattern: services accessed via SDK properties
  // We wrap them to match the unified interface
  return {
    sdk: sdk as unknown as UiPath,
    entities: sdk.entities as unknown as Entities,
    choiceSets: sdk.entities.choicesets as unknown as ChoiceSets,
    dataFabricRoles: sdk.entities.roles as unknown as DataFabricRoleService,
    dataFabricDirectory: sdk.entities.directory as unknown as DataFabricDirectoryService,
    tasks: sdk.tasks as unknown as Tasks,
    assets: sdk.assets as unknown as Assets,
    buckets: sdk.buckets as unknown as Buckets,
    queues: sdk.queues as unknown as Queues,
    processes: sdk.processes as unknown as Processes,
    maestroProcesses: sdk.maestro.processes as unknown as MaestroProcessesService,
    processInstances: sdk.maestro.processes.instances as unknown as ProcessInstancesService,
    processIncidents: sdk.maestro.processes.incidents as unknown as ProcessIncidentsService,
    cases: sdk.maestro.cases as unknown as CasesService,
    caseInstances: sdk.maestro.cases.instances as unknown as CaseInstancesService,
  };
}

/**
 * Creates services using V1 pattern (modular instantiation)
 */
function createV1Services(config: IntegrationConfig, token: string): TestServices {
  const sdk = new UiPath({
    baseUrl: config.baseUrl,
    orgName: config.orgName,
    tenantName: config.tenantName,
    secret: token,
  });

  if (!sdk.isAuthenticated()) {
    throw new Error('V1 SDK initialization failed: Authentication unsuccessful.');
  }

  // V1 pattern: services instantiated directly with SDK
  return {
    sdk,
    entities: new Entities(sdk),
    choiceSets: new ChoiceSets(sdk),
    dataFabricRoles: new DataFabricRoleService(sdk),
    dataFabricDirectory: new DataFabricDirectoryService(sdk),
    tasks: new Tasks(sdk),
    taskCatalogs: new TaskCatalogs(sdk),
    assets: new Assets(sdk),
    buckets: new Buckets(sdk),
    queues: new Queues(sdk),
    jobs: new Jobs(sdk),
    attachments: new Attachments(sdk),
    processes: new Processes(sdk),
    maestroProcesses: new MaestroProcessesService(sdk),
    processInstances: new ProcessInstancesService(sdk),
    processIncidents: new ProcessIncidentsService(sdk),
    cases: new CasesService(sdk),
    caseInstances: new CaseInstancesService(sdk),
    feedback: new Feedback(sdk),
    memory: new AgentMemory(sdk),
    agentTraces: new AgentTraces(sdk),
    traces: new Traces(sdk),
    agents: new Agents(sdk),
    governance: new Governance(sdk),
    notifications: new Notifications(sdk),
    subscriptions: new Subscriptions(sdk),
    conversationalAgent: new ConversationalAgentService(sdk),
    functions: new Functions(sdk),
    platform: new Platform(sdk),
  };
}

/**
 * Initialize services in the specified init mode and auth mode.
 *
 * The cached instance is keyed on both — a suite running under one credential
 * must never be handed the SDK built for the other.
 */
export async function initializeServices(
  mode: InitMode,
  authMode: AuthMode = 'pat'
): Promise<TestServices> {
  if (servicesInstance && currentMode === mode && currentAuthMode === authMode) {
    return servicesInstance;
  }

  testConfig = loadIntegrationConfig();
  currentMode = mode;
  currentAuthMode = authMode;

  const token = resolveToken(testConfig, authMode);

  if (mode === 'v0') {
    servicesInstance = createV0Services(testConfig, token);
  } else {
    servicesInstance = createV1Services(testConfig, token);
  }

  return servicesInstance;
}

/**
 * Get the current services instance
 */
export function getServices(): TestServices {
  if (!servicesInstance) {
    throw new Error(
      'Services not initialized. Call initializeServices() or use setupUnifiedTests() first.'
    );
  }
  return servicesInstance;
}

/**
 * Get the test configuration
 */
export function getTestConfig(): IntegrationConfig {
  if (!testConfig) {
    testConfig = loadIntegrationConfig();
  }
  return testConfig;
}

/**
 * Get the current initialization mode
 */
export function getCurrentMode(): InitMode | null {
  return currentMode;
}

/**
 * Get the credential the current services instance authenticates with
 */
export function getCurrentAuthMode(): AuthMode | null {
  return currentAuthMode;
}

/**
 * Cleanup services
 */
export function cleanupServices(): void {
  servicesInstance = null;
  currentMode = null;
  currentAuthMode = null;
}

/**
 * Setup hooks for unified tests with a specific init mode and auth requirement.
 *
 * The requirement defaults to `'any'`, which prefers the user token when one is
 * configured — a user token carries the caller's own permissions and so reaches
 * more of the API than an external app's granted scopes. Suites that genuinely
 * need one credential declare it explicitly.
 *
 * Suites declaring `'user'` must be gated on `hasUserToken()` (or
 * `canAuthenticate('user')`) — setup throws when nothing can satisfy the
 * requirement, so an unguarded suite fails the run rather than skipping.
 */
export function setupUnifiedTests(mode: InitMode, requirement: AuthRequirement = 'any'): void {
  beforeAll(async () => {
    const authMode = resolveAuthMode(requirement);
    if (!authMode) {
      throw new Error(
        `No configured credential satisfies the '${requirement}' auth requirement. ` +
        'Set UIPATH_SECRET and/or UIPATH_USER_TOKEN, and guard the suite with ' +
        '`describe.skipIf(!canAuthenticate(...))` so it skips instead of failing.'
      );
    }
    await initializeServices(mode, authMode);
  });

  afterAll(() => {
    cleanupServices();
  });
}
