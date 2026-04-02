import { JobGetAllOptions, JobGetResponse, JobStopOptions, JobStopData } from './jobs.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { OperationResponse } from '../common/types';

/**
 * Service for managing UiPath Orchestrator Jobs.
 *
 * Jobs represent the execution of a process (automation) on a UiPath Robot. Each job tracks the lifecycle of a single process run, including its state, timing, input/output arguments, and associated resources. [UiPath Jobs Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-jobs)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Jobs } from '@uipath/uipath-typescript/jobs';
 *
 * const jobs = new Jobs(sdk);
 * const allJobs = await jobs.getAll();
 * ```
 */
export interface JobServiceModel {
  /**
   * Gets all jobs across folders with optional filtering
   *
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to either an array of jobs {@link NonPaginatedResponse}<{@link JobGetResponse}> or a {@link PaginatedResponse}<{@link JobGetResponse}> when pagination options are used.
   * {@link JobGetResponse}
   * @example
   * ```typescript
   * // Get all jobs
   * const allJobs = await jobs.getAll();
   *
   * // Get all jobs in a specific folder
   * const folderJobs = await jobs.getAll({ folderId: <folderId> });
   *
   * // With filtering
   * const runningJobs = await jobs.getAll({
   *   filter: "state eq 'Running'"
   * });
   *
   * // First page with pagination
   * const page1 = await jobs.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await jobs.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await jobs.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  getAll<T extends JobGetAllOptions = JobGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<JobGetResponse>
    : NonPaginatedResponse<JobGetResponse>
  >;

  /**
   * Stops one or more jobs by their UUID keys.
   *
   * Resolves the provided job UUID keys to integer IDs, then sends a stop request to the Orchestrator.
   * Keys are processed in chunks of 50 to avoid URL length limits. Throws if any keys cannot be resolved.
   *
   * @param jobKeys - Array of job UUID keys to stop (e.g., from {@link JobGetResponse}.key)
   * @param folderId - The folder ID where the jobs reside (required)
   * @param options - Optional {@link JobStopOptions} including stop strategy
   * @returns Promise resolving to an {@link OperationResponse}<{@link JobStopData}> with the resolved job IDs
   *
   * @example
   * ```typescript
   * import { Jobs } from '@uipath/uipath-typescript/jobs';
   *
   * const jobs = new Jobs(sdk);
   *
   * // Stop a single job with default soft stop
   * const result = await jobs.stop(
   *   ['c80c3b30-f010-4eb8-82d4-b67bc615e137'],
   *   123
   * );
   *
   * // Force-kill multiple jobs
   * const killResult = await jobs.stop(
   *   ['c80c3b30-f010-4eb8-82d4-b67bc615e137', '24ef1040-454d-4184-b994-c641ee32318d'],
   *   123,
   *   { strategy: StopStrategy.Kill }
   * );
   * ```
   */
  stop(
    jobKeys: string[],
    folderId: number,
    options?: JobStopOptions
  ): Promise<OperationResponse<JobStopData>>;
}
