/**
 * Maestro Processes Module
 *
 * Provides access to UiPath Maestro for BPMN process management operations.
 * This module includes process definitions, process instances, and process incidents.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Processes, ProcessInstances, ProcessIncidents } from '@uipath/uipath-typescript/maestro-processes';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * // Get BPMN process definitions
 * const processesService = new Processes(sdk);
 * const allProcesses = await processesService.getAll();
 *
 * // Get process instances
 * const processInstancesService = new ProcessInstances(sdk);
 * const allInstances = await processInstancesService.getAll();
 *
 * // Get all process incidents
 * const processIncidentsService = new ProcessIncidents(sdk);
 * const allIncidents = await processIncidentsService.getAll();
 * ```
 *
 * @module
 */

// Export services with clean names (flat structure, no hierarchy)
export { MaestroProcessesService as Processes, MaestroProcessesService } from './processes';
export { ProcessInstancesService as ProcessInstances, ProcessInstancesService } from './process-instances';
export { ProcessIncidentsService as ProcessIncidents, ProcessIncidentsService } from './process-incidents';

// Re-export service-specific types
export type * from '../../../models/maestro/processes.types';
export type * from '../../../models/maestro/processes.models';
export type * from '../../../models/maestro/process-instances.types';
export type * from '../../../models/maestro/process-instances.models';
export type * from '../../../models/maestro/process-incidents.types';
export type * from '../../../models/maestro/process-incidents.models';
