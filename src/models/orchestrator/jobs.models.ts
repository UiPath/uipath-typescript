import { JobGetAllOptions, JobGetByIdOptions, JobGetResponse } from './jobs.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

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
   * 
   * @experimental 
   * 
   * /// warning
    Preview: This method is experimental and may change or be removed in future releases.
    ///
   * 
   * Gets a single job by its numeric ID
   *
   * Returns the full job details including state, timing, input/output arguments, and associated resources.
   * Use the `expand` option to include related entities like `Robot`, `Machine`, or `Release` (process metadata).
   *
   * @param id - The numeric ID of the job
   * @param options - Optional query parameters including {@link JobGetByIdOptions} for expand, select, and folderId
   * @returns Promise resolving to a single {@link JobGetResponse}
   *
   * @example
   * ```typescript
   * // Get a job by ID
   * const job = await jobs.getById(<jobId>);
   *
   * // With expand to include related entities
   * const job = await jobs.getById(<jobId>, {
   *   expand: 'Robot,Machine,Release'
   * });
   *
   * // With folder scoping
   * const job = await jobs.getById(<jobId>, { folderId: <folderId> });
   * ```
   */
  getById(id: number, options?: JobGetByIdOptions): Promise<JobGetResponse>;
}
