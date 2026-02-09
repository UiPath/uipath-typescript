/**
 * Tasks Module
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
 * const tasks = new Tasks(sdk);
 * const allTasks = await tasks.getAll();
 * ```
 *
 * @module
 */

export { TaskService as Tasks, TaskService } from './tasks';

export * from '../../models/action-center/tasks.types';
export * from '../../models/action-center/tasks.models'; 