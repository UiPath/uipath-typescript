/**
 * Orchestrator Processes Module
 *
 * Provides access to UiPath Orchestrator for process and job management.
 *
 * Note: For Maestro Processes (BPMN workflows), use @uipath/uipath-typescript/maestro-processes
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Processes } from '@uipath/uipath-typescript/orchestrator-processes';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const processes = new Processes(sdk);
 * const allProcesses = await processes.getAll();
 * ```
 *
 * @module
 */

export { ProcessService as Processes, ProcessService } from './processes';

export type * from '../../../models/orchestrator/processes.types';
export type * from '../../../models/orchestrator/processes.models';
