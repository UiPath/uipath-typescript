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
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const queuesService = new Queues(sdk);
 * const allQueues = await queuesService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep QueueService for legacy UiPath class
export { QueueService as Queues, QueueService } from './queues';

// Re-export service-specific types
export type * from '../../../models/orchestrator/queues.types';
export type * from '../../../models/orchestrator/queues.models';
