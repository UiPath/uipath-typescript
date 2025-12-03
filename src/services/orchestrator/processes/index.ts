/**
 * Orchestrator Processes Module
 *
 * Provides access to UiPath Orchestrator for process and job management.
 *
 * Note: This is for Orchestrator Processes (robot/job execution).
 * For Maestro Processes (BPMN workflows), use @uipath/uipath-typescript/maestro
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Processes } from '@uipath/uipath-typescript/orchestrator-processes';
 *
 * const uiPath = new UiPath(config);
 * await uiPath.initialize();
 *
 * const processesService = new Processes(uiPath);
 * const allProcesses = await processesService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep ProcessService for legacy UiPath class
export { ProcessService as Processes, ProcessService } from './processes';

// Re-export types for convenience
export type * from '../../../models/orchestrator/processes.types';
export type * from '../../../models/orchestrator/processes.models';

// Re-export common utilities users might need
export { UiPathError } from '../../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../../utils/pagination';
export type { UiPathSDKConfig } from '../../../core/config/sdk-config';
export type { UiPath } from '../../../core/uipath';
