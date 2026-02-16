import { OperationResponse } from '../common/types';
import {
  RawJobGetResponse,
  JobGetAllOptions,
  JobGetByIdOptions,
  JobStopOptions,
  JobStopJobsOptions,
  JobResumeOptions,
} from './jobs.types';
import { StopStrategy } from './processes.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Methods bound to a Job response object for lifecycle operations.
 */
export interface JobMethods {
  /**
   * Stops this job with the specified strategy
   * @param strategy - The stop strategy (SoftStop or Kill)
   * @returns Promise resolving to an OperationResponse
   */
  stop(strategy: StopStrategy): Promise<OperationResponse<{ id: number }>>;
  /**
   * Restarts this job
   * @returns Promise resolving to an OperationResponse
   */
  restart(): Promise<OperationResponse<{ id: number }>>;
  /**
   * Resumes this job (for suspended jobs)
   * @param inputArguments - Optional input arguments as a JSON string
   * @returns Promise resolving to an OperationResponse
   */
  resume(inputArguments?: string): Promise<OperationResponse<{ jobKey: string }>>;
}

/**
 * The composed Job response type with bound methods
 */
export type JobGetResponse = RawJobGetResponse & JobMethods;

/**
 * Creates bound methods for a Job response object
 * @param rawData - The raw job data
 * @param service - The JobService instance to delegate calls to
 * @returns Object containing bound methods
 */
export function createJobMethods(rawData: RawJobGetResponse, service: JobServiceModel): JobMethods {
  return {
    stop(strategy: StopStrategy) {
      if (!rawData.id) throw new Error('Job ID is required to stop a job');
      return service.stop(rawData.id, { strategy }, rawData.folderId);
    },
    restart() {
      if (!rawData.id) throw new Error('Job ID is required to restart a job');
      return service.restart(rawData.id, rawData.folderId);
    },
    resume(inputArguments?: string) {
      if (!rawData.key) throw new Error('Job key is required to resume a job');
      return service.resume({ jobKey: rawData.key, inputArguments }, rawData.folderId);
    },
  };
}

/**
 * Creates a Job response object with bound methods
 * @param rawData - The raw job data
 * @param service - The JobService instance to delegate calls to
 * @returns Job response object with methods attached
 */
export function createJobWithMethods(rawData: RawJobGetResponse, service: JobServiceModel): JobGetResponse {
  const methods = createJobMethods(rawData, service);
  return Object.assign({}, rawData, methods);
}

/**
 * Service for managing UiPath Orchestrator Jobs (runtime execution instances).
 *
 * Jobs represent running or completed executions of automation processes. Use this service
 * to query, monitor, stop, restart, and resume jobs after they are created via `processes.start()`.
 *
 * [UiPath Jobs Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-jobs)
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
   * Gets all jobs across folders with optional filtering and pagination.
   * Returns a NonPaginatedResponse when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided.
   *
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to either {@link NonPaginatedResponse} or {@link PaginatedResponse} of {@link JobGetResponse}
   * @example
   * ```typescript
   * // Get all jobs
   * const allJobs = await jobs.getAll();
   *
   * // Get jobs within a specific folder
   * const folderJobs = await jobs.getAll({
   *   folderId: <folderId>
   * });
   *
   * // Get jobs with filtering
   * const runningJobs = await jobs.getAll({
   *   filter: "State eq 'Running'"
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
   * Gets a single job by ID.
   *
   * @param id - Job ID. First, get jobs with `jobs.getAll()` to find the ID.
   * @param options - Optional query parameters including folderId
   * @returns Promise resolving to a single {@link JobGetResponse} with bound methods
   * @example
   * ```typescript
   * // Get job by ID
   * const job = await jobs.getById(<jobId>);
   *
   * // Get job by ID with folder context
   * const job = await jobs.getById(<jobId>, { folderId: <folderId> });
   *
   * // Use bound methods on the response
   * await job.stop(StopStrategy.SoftStop);
   * await job.restart();
   * ```
   */
  getById(id: number, options?: JobGetByIdOptions): Promise<JobGetResponse>;

  /**
   * Stops a single job by ID.
   *
   * @param id - Job ID to stop
   * @param options - Stop options including strategy
   * @param folderId - Optional folder ID for folder context
   * @returns Promise resolving to an {@link OperationResponse}
   * @example
   * ```typescript
   * import { StopStrategy } from '@uipath/uipath-typescript/processes';
   *
   * // Soft stop a job
   * await jobs.stop(<jobId>, { strategy: StopStrategy.SoftStop });
   *
   * // Kill a job immediately
   * await jobs.stop(<jobId>, { strategy: StopStrategy.Kill }, <folderId>);
   * ```
   */
  stop(id: number, options: JobStopOptions, folderId?: number): Promise<OperationResponse<{ id: number }>>;

  /**
   * Stops multiple jobs at once.
   *
   * @param options - Stop options including jobIds array and strategy
   * @param folderId - Optional folder ID for folder context
   * @returns Promise resolving to an {@link OperationResponse}
   * @example
   * ```typescript
   * import { StopStrategy } from '@uipath/uipath-typescript/processes';
   *
   * // Stop multiple jobs
   * await jobs.stopJobs({
   *   jobIds: [<jobId1>, <jobId2>],
   *   strategy: StopStrategy.SoftStop
   * });
   * ```
   */
  stopJobs(options: JobStopJobsOptions, folderId?: number): Promise<OperationResponse<{ jobIds: number[] }>>;

  /**
   * Restarts a faulted or stopped job.
   *
   * @param jobId - The job ID to restart
   * @param folderId - Optional folder ID for folder context
   * @returns Promise resolving to an {@link OperationResponse}
   * @example
   * ```typescript
   * // Restart a failed job
   * await jobs.restart(<jobId>);
   *
   * // Restart with folder context
   * await jobs.restart(<jobId>, <folderId>);
   * ```
   */
  restart(jobId: number, folderId?: number): Promise<OperationResponse<{ id: number }>>;

  /**
   * Resumes a suspended job.
   *
   * @param options - Resume options including jobKey and optional inputArguments
   * @param folderId - Optional folder ID for folder context
   * @returns Promise resolving to an {@link OperationResponse}
   * @example
   * ```typescript
   * // Resume a suspended job
   * await jobs.resume({ jobKey: '<jobKey>' });
   *
   * // Resume with input arguments
   * await jobs.resume({
   *   jobKey: '<jobKey>',
   *   inputArguments: '{"param1": "value1"}'
   * });
   * ```
   */
  resume(options: JobResumeOptions, folderId?: number): Promise<OperationResponse<{ jobKey: string }>>;
}
