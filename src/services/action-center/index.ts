/**
 * Action Center Services Module
 *
 * Provides access to UiPath Action Center for task management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Tasks } from '@uipath/uipath-typescript/tasks';
 *
 * const uiPath = new UiPath(config);
 * await uiPath.initialize();
 *
 * const tasksService = new Tasks(uiPath);
 * const allTasks = await tasksService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep TaskService for legacy UiPath class
export { TaskService as Tasks, TaskService } from './tasks';

// Re-export types for convenience
export type * from '../../models/action-center/tasks.types';
export type * from '../../models/action-center/tasks.models';

// Re-export common utilities users might need
export { UiPathError } from '../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../utils/pagination';
export type { UiPathSDKConfig } from '../../core/config/sdk-config';
export type { UiPath } from '../../core/uipath'; 