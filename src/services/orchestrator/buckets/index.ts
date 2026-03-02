/**
 * Buckets Module
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
 * const buckets = new Buckets(sdk);
 * const allBuckets = await buckets.getAll();
 * ```
 *
 * @module
 */

export { BucketService as Buckets, BucketService } from './buckets';

export * from '../../../models/orchestrator/buckets.types';
export * from '../../../models/orchestrator/buckets.models';
