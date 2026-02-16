/**
 * Queues Module
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
 * const queues = new Queues(sdk);
 * const allQueues = await queues.getAll();
 * ```
 *
 * @module
 */

export { QueueService as Queues, QueueService } from './queues';

export * from '../../../models/orchestrator/queues.types';
export * from '../../../models/orchestrator/queues.models';
