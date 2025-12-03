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
 * const uiPath = new UiPath(config);
 * await uiPath.initialize();
 *
 * const bucketsService = new Buckets(uiPath);
 * const allBuckets = await bucketsService.getAll();
 * ```
 *
 * @module
 */

// Export service with cleaner name and keep BucketService for legacy UiPath class
export { BucketService as Buckets, BucketService } from './buckets';

// Re-export types for convenience
export type * from '../../../models/orchestrator/buckets.types';
export type * from '../../../models/orchestrator/buckets.models';

// Re-export common utilities users might need
export { UiPathError } from '../../../core/errors';
export type { PaginatedResponse, NonPaginatedResponse } from '../../../utils/pagination';
export type { UiPathSDKConfig } from '../../../core/config/sdk-config';
export type { UiPath } from '../../../core/uipath';
