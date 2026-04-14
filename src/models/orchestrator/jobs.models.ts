import { JobGetAllOptions, JobResumeOptions, RawJobGetResponse } from './jobs.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { OperationResponse } from '../common/types';

// Combined type for job data with methods
export type JobGetResponse = RawJobGetResponse & JobMethods;

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
   * Gets all jobs across folders with optional filtering and pagination.
   *
   * Returns jobs with full details including state, timing, and input/output arguments.
   * Pass `folderId` to scope the query to a specific folder.
   *
   * !!! info "Input and output fields are not included in `getAll` responses"
   *     The `inputArguments`, `inputFile`, `outputArguments`, and `outputFile` fields will always be `null` in the `getAll` response. To retrieve a job's output, use the {@link getOutput} method with the job's `key` and `folderId`.
   *
   * @param options - Query options including optional folderId, filtering, and pagination options
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
   * Gets the output of a completed job.
   *
   * Retrieves the job's output arguments, handling both inline output (stored directly on the job
   * as a JSON string in `outputArguments`) and file-based output (stored as a blob attachment for
   * large outputs). Returns the parsed JSON output or `null` if the job has no output.
   *
   * @param jobKey - The unique key (GUID) of the job to retrieve output from
   * @param folderId - The folder ID where the job resides
   * @returns Promise resolving to the parsed output as `Record<string, unknown>`, or `null` if no output exists
   *
   * @example
   * ```typescript
   * // Get output from a completed job
   * const output = await jobs.getOutput(<jobKey>, <folderId>);
   *
   * if (output) {
   *   console.log('Job output:', output);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Get output using bound method (jobKey and folderId are taken from the job object)
   * const allJobs = await jobs.getAll();
   * const completedJob = allJobs.items.find(j => j.state === JobState.Successful);
   *
   * if (completedJob) {
   *   const output = await completedJob.getOutput();
   * }
   * ```
   */
  getOutput(jobKey: string, folderId: number): Promise<Record<string, unknown> | null>;

  /**
   * Resumes a suspended job.
   *
   * Sends a resume request to a job that is currently in the `Suspended` state.
   * The job transitions to `Resumed` and continues execution. Optionally pass
   * input arguments to provide data for the resumed workflow.
   *
   * @param jobKey - The unique key (GUID) of the suspended job to resume
   * @param folderId - The folder ID where the job resides
   * @param options - Optional parameters including input arguments
   * @returns Promise resolving to an {@link OperationResponse}<{@link JobGetResponse}> with the resumed job details
   *
   * @example
   * ```typescript
   * // Resume a suspended job
   * const result = await jobs.resume(<jobKey>, <folderId>);
   * console.log(result.data.state); // 'Resumed'
   * ```
   *
   * @example
   * ```typescript
   * // Resume with input arguments
   * const result = await jobs.resume(<jobKey>, <folderId>, {
   *   inputArguments: JSON.stringify({ approved: true })
   * });
   * ```
   */
  resume(jobKey: string, folderId: number, options?: JobResumeOptions): Promise<OperationResponse<JobGetResponse>>;

  /**
   * Restarts a completed or faulted job.
   *
   * Creates a new job execution from a previously completed, faulted, or stopped job.
   * The new job is created with `Pending` state and uses the same process and input
   * arguments as the original job.
   *
   * @param jobId - The numeric ID of the job to restart
   * @param folderId - The folder ID where the job resides
   * @returns Promise resolving to an {@link OperationResponse}<{@link JobGetResponse}> with the new job details
   *
   * @example
   * ```typescript
   * // Restart a faulted job
   * const result = await jobs.restart(<jobId>, <folderId>);
   * console.log(result.data.state); // 'Pending'
   * console.log(result.data.key);   // new job key
   * ```
   */
  restart(jobId: number, folderId: number): Promise<OperationResponse<JobGetResponse>>;
}

/**
 * Methods available on job response objects.
 * These are bound to the job data and delegate to the service.
 */
export interface JobMethods {
  /**
   * Gets the output of this job.
   *
   * Retrieves the job's output arguments, handling both inline output (stored directly on the job
   * as a JSON string in `outputArguments`) and file-based output (stored as a blob attachment for
   * large outputs). Returns the parsed JSON output or `null` if the job has no output.
   *
   * @returns Promise resolving to the parsed output as `Record<string, unknown>`, or `null` if no output exists
   *
   * @example
   * ```typescript
   * const allJobs = await jobs.getAll();
   * const completedJob = allJobs.items.find(j => j.state === JobState.Successful);
   *
   * if (completedJob) {
   *   const output = await completedJob.getOutput();
   * }
   * ```
   */
  getOutput(): Promise<Record<string, unknown> | null>;

  /**
   * Resumes this suspended job.
   *
   * @param options - Optional parameters including input arguments
   * @returns Promise resolving to an {@link OperationResponse}<{@link JobGetResponse}> with the resumed job details
   */
  resume(options?: JobResumeOptions): Promise<OperationResponse<JobGetResponse>>;

  /**
   * Restarts this job, creating a new execution.
   *
   * @returns Promise resolving to an {@link OperationResponse}<{@link JobGetResponse}> with the new job details
   */
  restart(): Promise<OperationResponse<JobGetResponse>>;
}

/**
 * Creates methods for a job response object.
 *
 * @param jobData - The raw job data from API
 * @param service - The job service instance
 * @returns Object containing job methods
 */
function createJobMethods(jobData: RawJobGetResponse, service: JobServiceModel): JobMethods {
  return {
    async getOutput(): Promise<Record<string, unknown> | null> {
      if (!jobData.key) throw new Error('Job key is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.getOutput(jobData.key, jobData.folderId);
    },
    async resume(options?: JobResumeOptions): Promise<OperationResponse<JobGetResponse>> {
      if (!jobData.key) throw new Error('Job key is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.resume(jobData.key, jobData.folderId, options);
    },
    async restart(): Promise<OperationResponse<JobGetResponse>> {
      if (!jobData.id) throw new Error('Job id is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.restart(jobData.id, jobData.folderId);
    },
  };
}

/**
 * Creates a job response with bound methods.
 *
 * @param jobData - The raw job data from API
 * @param service - The job service instance
 * @returns A job object with added methods
 */
export function createJobWithMethods(
  jobData: RawJobGetResponse,
  service: JobServiceModel
): JobGetResponse {
  const methods = createJobMethods(jobData, service);
  return Object.assign({}, jobData, methods);
}
