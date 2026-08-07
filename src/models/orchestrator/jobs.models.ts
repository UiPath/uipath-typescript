import { JobGetAllOptions, JobGetByIdOptions, RawJobGetResponse, JobStopOptions, JobResumeOptions, JobAttachmentGetResponse, JobLinkAttachmentOptions } from './jobs.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/** Combined response type for job data with bound methods. */
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
   * const recentInvoiceJobs = await jobs.getAll({
   *   filter: "processName eq 'InvoiceBot'",
   *   orderby: 'createdTime desc',
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
   * Gets a job by its unique key (GUID).
   *
   * Returns the full job details including state, timing, input/output arguments, and error information.
   * Use `expand` to include related entities like `robot`, or `machine`.
   *
   * @param id - The unique key (GUID) of the job to retrieve
   * @param folderId - The folder ID where the job resides
   * @param options - Optional query options for expanding or selecting fields
   * @returns Promise resolving to a {@link JobGetResponse} with full job details and bound methods
   *
   * @example
   * ```typescript
   * // Get a job by key
   * const job = await jobs.getById(<id>, <folderId>);
   * console.log(job.state, job.processName);
   * ```
   *
   * @example
   * ```typescript
   * // With expanded related entities
   * const job = await jobs.getById(<id>, <folderId>, {
   *   expand: 'robot,machine'
   * });
   * console.log(job.robot?.name, job.machine?.name);
   * ```
   */
  getById(id: string, folderId: number, options?: JobGetByIdOptions): Promise<JobGetResponse>;

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
   * Stops one or more jobs by their UUID keys.
   *
   * Sends a stop request for the specified jobs to the Orchestrator. Throws if any keys cannot be resolved.
   *
   * @param jobKeys - Array of job UUID keys to stop (e.g., from {@link JobGetResponse}.key)
   * @param folderId - The folder ID where the jobs reside (required)
   * @param options - Optional {@link JobStopOptions} including stop strategy
   * @returns Promise that resolves when the jobs are stopped successfully, or rejects on failure
   *
   * @example
   * ```typescript
   * // Stop a single job with default soft stop
   * await jobs.stop([<jobKey>], <folderId>);
   * ```
   *
   * @example
   * ```typescript
   * import { StopStrategy } from '@uipath/uipath-typescript/jobs';
   *
   * // Force-kill multiple jobs
   * await jobs.stop(
   *   [<jobKey1>, <jobKey2>],
   *   <folderId>,
   *   { strategy: StopStrategy.Kill }
   * );
   * ```
   */
  stop(
    jobKeys: string[],
    folderId: number,
    options?: JobStopOptions
  ): Promise<void>;

  /**
   * Resumes a suspended job.
   *
   * Sends a resume request to a job that is currently in the `Suspended` state.
   * The job transitions to `Resumed` and then to `Running` as it continues execution. Optionally pass
   * input arguments to provide data for the resumed workflow.
   *
   * @param jobKey - The unique key (GUID) of the suspended job to resume
   * @param folderId - The folder ID where the job resides
   * @param options - Optional parameters including input arguments
   * @returns Promise that resolves when the job is resumed successfully, or rejects on failure
   *
   * @example
   * ```typescript
   * // Resume a suspended job
   * await jobs.resume(<jobKey>, <folderId>);
   * ```
   *
   * @example
   * ```typescript
   * // Resume with input arguments
   * await jobs.resume(<jobKey>, <folderId>, {
   *   inputArguments: { approved: true }
   * });
   * ```
   */
  resume(jobKey: string, folderId: number, options?: JobResumeOptions): Promise<void>;

  /**
   * Restarts a job in a final state (Successful, Faulted, or Stopped).
   *
   * Creates a **new** job execution from a previously successful, faulted, or stopped job.
   * The new job has its own unique `key`, starts in `Pending` state, and uses
   * the same process and input arguments as the original job.
   *
   * To monitor the new job's progress, poll with {@link getById}
   * using the returned job's key until the state reaches a final value.
   *
   * @param jobKey - The unique key (GUID) of the job to restart
   * @param folderId - The folder ID where the job resides
   * @returns Promise resolving to the new {@link JobGetResponse} with full job details
   *
   * @example
   * ```typescript
   * // Restart a faulted job
   * const newJob = await jobs.restart(<jobKey>, <folderId>);
   * console.log(newJob.state); // 'Pending'
   * console.log(newJob.key);   // new job key (different from original)
   * ```
   */
  restart(jobKey: string, folderId: number): Promise<JobGetResponse>;

  /**
   * Gets all attachments linked to a job.
   *
   * Returns one entry per link, each carrying the attachment's name, its
   * category, and the `attachmentId` needed to read the file itself. To get a
   * job key and its folder, first list jobs with {@link getAll} — each job
   * exposes `key` and `folderId`.
   *
   * The result is empty when the job has no attachments.
   *
   * @param jobKey - The unique key (GUID) of the job whose attachments to retrieve
   * @param folderId - The folder ID where the job resides
   * @returns Promise resolving to an array of {@link JobAttachmentGetResponse} links, empty when the job has none
   *
   * @example
   * ```typescript
   * const attachments = await jobs.getAttachments(<jobKey>, <folderId>);
   * ```
   *
   * @example
   * ```typescript
   * import { Attachments } from '@uipath/uipath-typescript/attachments';
   *
   * // Read the underlying file of each attachment linked to a job
   * const attachmentsService = new Attachments(sdk);
   * const links = await jobs.getAttachments(<jobKey>, <folderId>);
   *
   * for (const link of links) {
   *   const attachment = await attachmentsService.getById(link.attachmentId);
   *   console.log(link.category, attachment.blobFileAccess.uri);
   * }
   * ```
   */
  getAttachments(jobKey: string, folderId: number): Promise<JobAttachmentGetResponse[]>;

  /**
   * Links an existing attachment to a job.
   *
   * This does not upload a file — it associates an attachment that already
   * exists in Orchestrator with a job. Supply the `attachmentId` of that
   * attachment; the job is identified by `jobKey`.
   *
   * The returned link does not carry `attachmentName` or `creatorUserId` yet —
   * read the job's attachments back with {@link getAttachments} to get the
   * fully populated entry.
   *
   * @param attachmentId - The unique ID (GUID) of the attachment to link
   * @param jobKey - The unique key (GUID) of the job to link the attachment to
   * @param folderId - The folder ID where the job resides
   * @param options - Optional settings for the link, such as its category
   * @returns Promise resolving to the created {@link JobAttachmentGetResponse} link
   *
   * @example
   * ```typescript
   * const link = await jobs.linkAttachment(<attachmentId>, <jobKey>, <folderId>);
   * ```
   *
   * @example
   * ```typescript
   * // Group the attachment under a category of your choosing
   * const link = await jobs.linkAttachment(<attachmentId>, <jobKey>, <folderId>, {
   *   category: 'Invoice',
   * });
   * ```
   */
  linkAttachment(
    attachmentId: string,
    jobKey: string,
    folderId: number,
    options?: JobLinkAttachmentOptions
  ): Promise<JobAttachmentGetResponse>;
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
   * Stops this job.
   *
   * Sends a stop request for this job to the Orchestrator.
   *
   * @param options - Optional {@link JobStopOptions} including stop strategy (defaults to SoftStop)
   * @returns Promise that resolves when the jobs are stopped successfully, or rejects on failure
   *
   * @example
   * ```typescript
   * const allJobs = await jobs.getAll({ folderId: <folderId> });
   * const runningJob = allJobs.items.find(j => j.state === JobState.Running);
   *
   * if (runningJob) {
   *   await runningJob.stop();
   * }
   * ```
   */
  stop(options?: JobStopOptions): Promise<void>;

  /**
   * Resumes this suspended job.
   *
   * @param options - Optional parameters including input arguments
   * @returns Promise that resolves when the job is resumed successfully, or rejects on failure
   */
  resume(options?: JobResumeOptions): Promise<void>;

  /**
   * Restarts this job, creating a new execution with a new key.
   *
   * @returns Promise resolving to the new {@link JobGetResponse} with full job details
   */
  restart(): Promise<JobGetResponse>;

  /**
   * Gets all attachments linked to this job.
   *
   * @returns Promise resolving to an array of {@link JobAttachmentGetResponse} links, empty when the job has none
   *
   * @example
   * ```typescript
   * const job = await jobs.getById(<jobKey>, <folderId>);
   * const attachments = await job.getAttachments();
   * ```
   */
  getAttachments(): Promise<JobAttachmentGetResponse[]>;

  /**
   * Links an existing attachment to this job.
   *
   * @param attachmentId - The unique ID (GUID) of the attachment to link
   * @param options - Optional settings for the link, such as its category
   * @returns Promise resolving to the created {@link JobAttachmentGetResponse} link
   *
   * @example
   * ```typescript
   * const job = await jobs.getById(<jobKey>, <folderId>);
   * const link = await job.linkAttachment(<attachmentId>, { category: 'Invoice' });
   * ```
   */
  linkAttachment(
    attachmentId: string,
    options?: JobLinkAttachmentOptions
  ): Promise<JobAttachmentGetResponse>;
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
    async stop(options?: JobStopOptions): Promise<void> {
      if (!jobData.key) throw new Error('Job key is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.stop([jobData.key], jobData.folderId, options);
    },
    async resume(options?: JobResumeOptions): Promise<void> {
      if (!jobData.key) throw new Error('Job key is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.resume(jobData.key, jobData.folderId, options);
    },
    async restart(): Promise<JobGetResponse> {
      if (!jobData.key) throw new Error('Job key is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.restart(jobData.key, jobData.folderId);
    },
    async getAttachments(): Promise<JobAttachmentGetResponse[]> {
      if (!jobData.key) throw new Error('Job key is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.getAttachments(jobData.key, jobData.folderId);
    },
    async linkAttachment(
      attachmentId: string,
      options?: JobLinkAttachmentOptions
    ): Promise<JobAttachmentGetResponse> {
      if (!jobData.key) throw new Error('Job key is undefined');
      if (!jobData.folderId) throw new Error('Job folderId is undefined');
      return service.linkAttachment(attachmentId, jobData.key, jobData.folderId, options);
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
