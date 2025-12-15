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
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const tasksService = new Tasks(sdk);
 * const allTasks = await tasksService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep TaskService for legacy UiPath class
export { TaskService as Tasks, TaskService } from './tasks';

// Re-export service-specific types
export type * from '../../models/action-center/tasks.types';
export type * from '../../models/action-center/tasks.models'; 