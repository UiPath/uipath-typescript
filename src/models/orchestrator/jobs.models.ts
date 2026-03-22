import { JobGetAllOptions, JobGetResponse } from './jobs.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Orchestrator Jobs.
 *
 * Jobs represent the execution of a process (release) on a UiPath Robot. They track the full lifecycle from creation through completion or failure. [UiPath Jobs Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-jobs)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Jobs } from '@uipath/uipath-typescript/jobs';
 *
 * const jobs = new Jobs(sdk);
 * const allJobs = await jobs.getAll({ folderId: 123 });
 * ```
 */
export interface JobServiceModel {
  /**
   * Gets all jobs within a folder with optional filtering and pagination
   *
   * @param options - Query options including required folderId and optional pagination/filter options
   * @returns Promise resolving to either an array of jobs {@link NonPaginatedResponse}<{@link JobGetResponse}> or a {@link PaginatedResponse}<{@link JobGetResponse}> when pagination options are used.
   * {@link JobGetResponse}
   * @example
   * ```typescript
   * // Get all jobs in a folder
   * const allJobs = await jobs.getAll({ folderId: <folderId> });
   *
   * // With filter
   * const runningJobs = await jobs.getAll({
   *   folderId: <folderId>,
   *   filter: "State eq 'Running'"
   * });
   *
   * // First page with pagination
   * const page1 = await jobs.getAll({ folderId: <folderId>, pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await jobs.getAll({ folderId: <folderId>, cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await jobs.getAll({
   *   folderId: <folderId>,
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  getAll<T extends JobGetAllOptions = JobGetAllOptions>(options: T): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<JobGetResponse>
    : NonPaginatedResponse<JobGetResponse>
  >;
}
