import { UiPath } from '../../../src/core';
import { Entities, ChoiceSets } from '../../../src/services/data-fabric';
import { Tasks } from '../../../src/services/action-center';
import { Assets, Buckets, Queues, Processes } from '../../../src/services/orchestrator';
import {
  MaestroProcessesService,
  ProcessInstancesService,
  ProcessIncidentsService,
  CasesService,
  CaseInstancesService,
} from '../../../src/services/maestro';
import { loadIntegrationConfig, IntegrationConfig } from './test-config';
import { UiPath as LegacyUiPath } from '../../../src/uipath';
import { afterAll, beforeAll } from 'vitest';

// Re-export cleanup functions from cleanup.ts for convenience
export {
  cleanupTestTask,
  cleanupTestEntityRecords,
  cleanupTestProcessInstance,
  cleanupTestCaseInstance,
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
  tasks: Tasks;
  assets: Assets;
  buckets: Buckets;
  queues: Queues;
  processes: Processes;
  maestroProcesses: MaestroProcessesService;
  processInstances: ProcessInstancesService;
  processIncidents: ProcessIncidentsService;
  cases: CasesService;
  caseInstances: CaseInstancesService;
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

/**
 * Creates services using V0 pattern (legacy SDK property access)
 */
function createV0Services(config: IntegrationConfig): TestServices {
  const sdk = new LegacyUiPath({
    baseUrl: config.baseUrl,
    orgName: config.orgName,
    tenantName: config.tenantName,
    secret: config.secret,
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
function createV1Services(config: IntegrationConfig): TestServices {
  const sdk = new UiPath({
    baseUrl: config.baseUrl,
    orgName: config.orgName,
    tenantName: config.tenantName,
    secret: config.secret,
  });

  if (!sdk.isAuthenticated()) {
    throw new Error('V1 SDK initialization failed: Authentication unsuccessful.');
  }

  // V1 pattern: services instantiated directly with SDK
  return {
    sdk,
    entities: new Entities(sdk),
    choiceSets: new ChoiceSets(sdk),
    tasks: new Tasks(sdk),
    assets: new Assets(sdk),
    buckets: new Buckets(sdk),
    queues: new Queues(sdk),
    processes: new Processes(sdk),
    maestroProcesses: new MaestroProcessesService(sdk),
    processInstances: new ProcessInstancesService(sdk),
    processIncidents: new ProcessIncidentsService(sdk),
    cases: new CasesService(sdk),
    caseInstances: new CaseInstancesService(sdk),
  };
}

/**
 * Initialize services in the specified mode
 */
export async function initializeServices(mode: InitMode): Promise<TestServices> {
  if (servicesInstance && currentMode === mode) {
    return servicesInstance;
  }

  testConfig = loadIntegrationConfig();
  currentMode = mode;

  if (mode === 'v0') {
    servicesInstance = createV0Services(testConfig);
  } else {
    servicesInstance = createV1Services(testConfig);
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
 * Cleanup services
 */
export function cleanupServices(): void {
  servicesInstance = null;
  currentMode = null;
}

/**
 * Setup hooks for unified tests with a specific mode
 */
export function setupUnifiedTests(mode: InitMode): void {
  beforeAll(async () => {
    await initializeServices(mode);
  });

  afterAll(() => {
    cleanupServices();
  });
}
