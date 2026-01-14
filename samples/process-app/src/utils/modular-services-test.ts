/**
 * Modular Services Test File
 *
 * This file demonstrates and tests the modular import pattern for all SDK services.
 * Each service is imported from its own module path for tree-shaking benefits.
 *
 * Usage pattern:
 * 1. Import UiPath from core module for authentication
 * 2. Import specific services from their modular paths
 * 3. Instantiate services with the SDK instance
 * 4. Call service methods
 */

// Core SDK - for authentication and initialization
import { UiPath } from '@uipath/uipath-typescript/core';

// Modular service imports - tree-shakeable
import { MaestroProcesses, ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';
import { Entities } from '@uipath/uipath-typescript/entities';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { Assets } from '@uipath/uipath-typescript/assets';
import { Queues } from '@uipath/uipath-typescript/queues';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import { Processes } from '@uipath/uipath-typescript/processes';

/**
 * Test results interface
 */
interface ServiceTestResult {
  service: string;
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

/**
 * Test all modular services
 *
 * @param sdk - Initialized UiPath SDK instance
 * @returns Array of test results
 */
export async function testAllModularServices(sdk: UiPath): Promise<ServiceTestResult[]> {
  const results: ServiceTestResult[] = [];

  // Test 1: MaestroProcesses
  results.push(await testMaestroProcesses(sdk));

  // Test 2: ProcessInstances
  results.push(await testProcessInstances(sdk));

  // Test 3: Cases
  results.push(await testCases(sdk));

  // Test 4: CaseInstances
  results.push(await testCaseInstances(sdk));

  // Test 5: Entities - End-to-end test (getAll + getRecordsById)
  results.push(await testEntities(sdk));

  // Test 6: Tasks - End-to-end test (getAll works across folders)
  results.push(await testTasks(sdk));

  // Test 7: Assets - End-to-end test (getAll works across folders)
  results.push(await testAssets(sdk));

  // Test 8: Queues - End-to-end test (getAll works across folders)
  results.push(await testQueues(sdk));

  // Test 9: Buckets - End-to-end test (getAll works across folders)
  results.push(await testBuckets(sdk));

  // Test 10: Orchestrator Processes - End-to-end test (getAll works across folders)
  results.push(await testOrchestratorProcesses(sdk));

  return results;
}

/**
 * Test MaestroProcesses service
 */
async function testMaestroProcesses(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new MaestroProcesses(sdk);
    const processes = await service.getAll();
    return {
      service: 'MaestroProcesses',
      success: true,
      message: `Found ${processes.length} maestro processes`,
      data: processes
    };
  } catch (error) {
    return {
      service: 'MaestroProcesses',
      success: false,
      message: 'Failed to fetch maestro processes',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test ProcessInstances service
 */
async function testProcessInstances(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new ProcessInstances(sdk);
    const instances = await service.getAll();
    const count = 'items' in instances ? instances.items.length : 0;
    return {
      service: 'ProcessInstances',
      success: true,
      message: `Found ${count} process instances`,
      data: instances
    };
  } catch (error) {
    return {
      service: 'ProcessInstances',
      success: false,
      message: 'Failed to fetch process instances',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Cases service
 */
async function testCases(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new Cases(sdk);
    const cases = await service.getAll();
    return {
      service: 'Cases',
      success: true,
      message: `Found ${cases.length} cases`,
      data: cases
    };
  } catch (error) {
    return {
      service: 'Cases',
      success: false,
      message: 'Failed to fetch cases',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test CaseInstances service
 */
async function testCaseInstances(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new CaseInstances(sdk);
    const instances = await service.getAll();
    const count = 'items' in instances ? instances.items.length : 0;
    return {
      service: 'CaseInstances',
      success: true,
      message: `Found ${count} case instances`,
      data: instances
    };
  } catch (error) {
    return {
      service: 'CaseInstances',
      success: false,
      message: 'Failed to fetch case instances',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Entities service - End-to-end test
 * Gets all entities, then tests getRecordsById on the first entity
 */
async function testEntities(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new Entities(sdk);

    // First, get all entities
    const entities = await service.getAll();

    if (entities.length === 0) {
      return {
        service: 'Entities',
        success: true,
        message: 'No entities found in system (getAll() returned empty)',
        data: { entities: [], records: null }
      };
    }

    // Get the first entity and test getRecordsById
    const firstEntity = entities[0];
    const records = await service.getRecordsById(firstEntity.id);
    const recordCount = 'items' in records ? records.items.length : 0;

    return {
      service: 'Entities',
      success: true,
      message: `Found ${entities.length} entities. First entity "${firstEntity.name}" has ${recordCount} records`,
      data: {
        entityCount: entities.length,
        firstEntityId: firstEntity.id,
        firstEntityName: firstEntity.name,
        recordCount
      }
    };
  } catch (error) {
    return {
      service: 'Entities',
      success: false,
      message: 'Failed to test Entities service',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Tasks service - End-to-end test
 * Tasks.getAll() works across folders without requiring folderId
 */
async function testTasks(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new Tasks(sdk);

    // getAll() works across folders without folderId
    const tasks = await service.getAll();
    const count = 'items' in tasks ? tasks.items.length : 0;

    return {
      service: 'Tasks',
      success: true,
      message: `Found ${count} tasks across all folders`,
      data: tasks
    };
  } catch (error) {
    return {
      service: 'Tasks',
      success: false,
      message: 'Failed to fetch tasks',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Assets service - End-to-end test
 * Assets.getAll() works across folders without requiring folderId
 */
async function testAssets(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new Assets(sdk);

    // getAll() works across folders without folderId
    const assets = await service.getAll();
    const count = 'items' in assets ? assets.items.length : 0;

    return {
      service: 'Assets',
      success: true,
      message: `Found ${count} assets across all folders`,
      data: assets
    };
  } catch (error) {
    return {
      service: 'Assets',
      success: false,
      message: 'Failed to fetch assets',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Queues service - End-to-end test
 * Queues.getAll() works across folders without requiring folderId
 */
async function testQueues(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new Queues(sdk);

    // getAll() works across folders without folderId
    const queues = await service.getAll();
    const count = 'items' in queues ? queues.items.length : 0;

    return {
      service: 'Queues',
      success: true,
      message: `Found ${count} queues across all folders`,
      data: queues
    };
  } catch (error) {
    return {
      service: 'Queues',
      success: false,
      message: 'Failed to fetch queues',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Buckets service - End-to-end test
 * Buckets.getAll() works across folders without requiring folderId
 */
async function testBuckets(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new Buckets(sdk);

    // getAll() works across folders without folderId
    const buckets = await service.getAll();
    const count = 'items' in buckets ? buckets.items.length : 0;

    return {
      service: 'Buckets',
      success: true,
      message: `Found ${count} buckets across all folders`,
      data: buckets
    };
  } catch (error) {
    return {
      service: 'Buckets',
      success: false,
      message: 'Failed to fetch buckets',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Test Orchestrator Processes service - End-to-end test
 * Processes.getAll() works across folders without requiring folderId
 */
async function testOrchestratorProcesses(sdk: UiPath): Promise<ServiceTestResult> {
  try {
    const service = new Processes(sdk);

    // getAll() works across folders without folderId
    const processes = await service.getAll();
    const count = 'items' in processes ? processes.items.length : 0;

    return {
      service: 'OrchestratorProcesses',
      success: true,
      message: `Found ${count} orchestrator processes across all folders`,
      data: processes
    };
  } catch (error) {
    return {
      service: 'OrchestratorProcesses',
      success: false,
      message: 'Failed to fetch orchestrator processes',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Print test results to console
 */
export function printTestResults(results: ServiceTestResult[]): void {
  console.log('\n=== Modular Services Test Results ===\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.service}: ${result.message}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed ===\n`);
}

/**
 * Quick verification that all imports work correctly (compile-time check)
 * This function just verifies that all service classes can be imported and instantiated
 */
export function verifyModularImports(sdk: UiPath): boolean {
  // All these instantiations verify the imports work
  const services = [
    new MaestroProcesses(sdk),
    new ProcessInstances(sdk),
    new Cases(sdk),
    new CaseInstances(sdk),
    new Entities(sdk),
    new Tasks(sdk),
    new Assets(sdk),
    new Queues(sdk),
    new Buckets(sdk),
    new Processes(sdk)
  ];

  console.log(`All ${services.length} modular service imports verified successfully!`);
  return services.length === 10;
}
