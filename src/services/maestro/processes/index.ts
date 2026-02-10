/**
 * Maestro Processes Module
 *
 * Provides access to UiPath Maestro for BPMN process management operations.
 * This module includes process definitions, process instances, and process incidents.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { MaestroProcesses, ProcessInstances, ProcessIncidents } from '@uipath/uipath-typescript/maestro-processes';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * // Get BPMN process definitions
 * const maestroProcesses = new MaestroProcesses(sdk);
 * const allProcesses = await maestroProcesses.getAll();
 *
 * // Get process instances
 * const processInstances = new ProcessInstances(sdk);
 * const allInstances = await processInstances.getAll();
 *
 * // Get all process incidents
 * const processIncidents = new ProcessIncidents(sdk);
 * const allIncidents = await processIncidents.getAll();
 * ```
 *
 * @module
 */

export { MaestroProcessesService as MaestroProcesses, MaestroProcessesService } from './processes';
export { ProcessInstancesService as ProcessInstances, ProcessInstancesService } from './process-instances';
export { ProcessIncidentsService as ProcessIncidents, ProcessIncidentsService } from './process-incidents';

export * from '../../../models/maestro/processes.types';
export * from '../../../models/maestro/processes.models';
export * from '../../../models/maestro/process-instances.types';
export * from '../../../models/maestro/process-instances.models';
export * from '../../../models/maestro/process-incidents.types';
export * from '../../../models/maestro/process-incidents.models';
