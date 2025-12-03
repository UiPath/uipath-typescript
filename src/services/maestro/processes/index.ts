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
 * const uiPath = new UiPath(config);
 * await uiPath.initialize();
 *
 * // Get BPMN process definitions
 * const processes = new Processes(uiPath);
 * const allProcesses = await processes.getAll();
 *
 * // Get process instances
 * const instances = new ProcessInstances(uiPath);
 * const allInstances = await instances.getAll();
 *
 * // Cancel a specific process instance
 * await instances.cancel('instance-id', 'folder-key', { comment: 'Cancelling process' });
 *
 * // Get all process incidents
 * const incidents = new ProcessIncidents(uiPath);
 * const allIncidents = await incidents.getAll();
 * ```
 *
 * @module
 */

// Export services with clean names (flat structure, no hierarchy)
export { MaestroProcessesService as Processes, MaestroProcessesService } from './processes';
export { ProcessInstancesService as ProcessInstances, ProcessInstancesService } from './process-instances';
export { ProcessIncidentsService as ProcessIncidents, ProcessIncidentsService } from './process-incidents';

// Export helpers for advanced use cases
export { BpmnHelpers } from './helpers';

// Re-export types for convenience
export type * from '../../../models/maestro/processes.types';
export type * from '../../../models/maestro/processes.models';
export type * from '../../../models/maestro/process-instances.types';
export type * from '../../../models/maestro/process-instances.models';
export type * from '../../../models/maestro/process-incidents.types';
export type * from '../../../models/maestro/process-incidents.models';

// Re-export common utilities users might need
export { UiPathError } from '../../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../../utils/pagination';
export type { UiPathSDKConfig } from '../../../core/config/sdk-config';
export type { UiPath } from '../../../core/uipath';
