/**
 * Orchestrator Jobs Module
 *
 * Provides access to UiPath Orchestrator for job lifecycle management
 * (querying, monitoring, stopping, restarting, and resuming jobs).
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Jobs } from '@uipath/uipath-typescript/jobs';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const jobs = new Jobs(sdk);
 * const allJobs = await jobs.getAll();
 * ```
 *
 * @module
 */

export { JobService as Jobs, JobService } from './jobs';

export * from '../../../models/orchestrator/jobs.types';
export * from '../../../models/orchestrator/jobs.models';
