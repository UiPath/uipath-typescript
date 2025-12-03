/**
 * Orchestrator Queues Module
 *
 * Provides access to UiPath Orchestrator for queue management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Queues } from '@uipath/uipath-typescript/queues';
 *
 * const uiPath = new UiPath(config);
 * await uiPath.initialize();
 *
 * const queuesService = new Queues(uiPath);
 * const allQueues = await queuesService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep QueueService for legacy UiPath class
export { QueueService as Queues, QueueService } from './queues';

// Re-export types for convenience
export type * from '../../../models/orchestrator/queues.types';
export type * from '../../../models/orchestrator/queues.models';

// Re-export common utilities users might need
export { UiPathError } from '../../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../../utils/pagination';
export type { UiPathSDKConfig } from '../../../core/config/sdk-config';
export type { UiPath } from '../../../core/uipath';
