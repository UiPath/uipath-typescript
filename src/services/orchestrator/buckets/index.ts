/**
 * Orchestrator Buckets Module
 *
 * Provides access to UiPath Orchestrator for storage bucket management.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Buckets } from '@uipath/uipath-typescript/buckets';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const bucketsService = new Buckets(sdk);
 * const allBuckets = await bucketsService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep BucketService for legacy UiPath class
export { BucketService as Buckets, BucketService } from './buckets';

// Re-export service-specific types
export type * from '../../../models/orchestrator/buckets.types';
export type * from '../../../models/orchestrator/buckets.models';
