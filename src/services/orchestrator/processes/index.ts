/**
 * Orchestrator Processes Module
 *
 * Provides access to UiPath Orchestrator for process and job management.
 *
 * Note: This is for Orchestrator Processes (robot/job execution).
 * For Maestro Processes (BPMN workflows), use @uipath/uipath-typescript/maestro-processes
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Processes } from '@uipath/uipath-typescript/orchestrator-processes';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const processesService = new Processes(sdk);
 * const allProcesses = await processesService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep ProcessService for legacy UiPath class
export { ProcessService as Processes, ProcessService } from './processes';

// Re-export service-specific types
export type * from '../../../models/orchestrator/processes.types';
export type * from '../../../models/orchestrator/processes.models';
