import { FolderScopedService } from '../../folder-scoped';
import { RawJobGetResponse, JobGetAllOptions, JobResumeOptions } from '../../../models/orchestrator/jobs.types';
import { RawJobOutputFields } from '../../../models/orchestrator/jobs.internal-types';
import { JobServiceModel, JobGetResponse, createJobWithMethods } from '../../../models/orchestrator/jobs.models';
import { pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { JobMap } from '../../../models/orchestrator/jobs.constants';
import { AttachmentService } from '../attachments/attachments';
import { OperationResponse } from '../../../models/common/types';
import { ValidationError, ServerError } from '../../../core/errors';
import { ErrorFactory } from '../../../core/errors/error-factory';
import { errorResponseParser } from '../../../core/errors/parser';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import type { IUiPath } from '../../../core/types';

/**
 * Service for interacting with UiPath Orchestrator Jobs API
 */
export class JobService extends FolderScopedService implements JobServiceModel {
  private attachmentService: AttachmentService;

  /**
   * Creates an instance of the Jobs service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    this.attachmentService = new AttachmentService(instance);
  }

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
  @track('Jobs.GetAll')
  async getAll<T extends JobGetAllOptions = JobGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<JobGetResponse>
      : NonPaginatedResponse<JobGetResponse>
  > {
    const transformJobResponse = (job: Record<string, unknown>) => {
      const rawJob = transformData(pascalToCamelCaseKeys(job) as RawJobGetResponse, JobMap);
      return createJobWithMethods(rawJob, this);
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => JOB_ENDPOINTS.GET_ALL,
      getByFolderEndpoint: JOB_ENDPOINTS.GET_ALL,
      transformFn: transformJobResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
    }, options) as any;
  }

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
  @track('Jobs.GetOutput')
  async getOutput(jobKey: string, folderId: number): Promise<Record<string, unknown> | null> {
    if (!jobKey) {
      throw new ValidationError({ message: 'jobKey is required for getOutput' });
    }

    const job = await this.fetchJobByKey(jobKey, folderId);

    if (job.OutputArguments) {
      try {
        return JSON.parse(job.OutputArguments) as Record<string, unknown>;
      } catch {
        throw new ServerError({ message: 'Failed to parse job output arguments as JSON' });
      }
    }

    if (job.OutputFile) {
      return this.downloadOutputFile(job.OutputFile);
    }

    return null;
  }

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
  @track('Jobs.Resume')
  async resume(jobKey: string, folderId: number, options?: JobResumeOptions): Promise<OperationResponse<JobGetResponse>> {
    if (!jobKey) {
      throw new ValidationError({ message: 'jobKey is required for resume' });
    }

    const headers = createHeaders({ [FOLDER_ID]: folderId });
    const body: Record<string, unknown> = { jobKey };

    if (options?.inputArguments) {
      body.inputArguments = options.inputArguments;
    }

    const response = await this.post<Record<string, unknown>>(
      JOB_ENDPOINTS.RESUME,
      body,
      { headers }
    );

    const rawJob = transformData(pascalToCamelCaseKeys(response.data) as RawJobGetResponse, JobMap);
    return { success: true, data: createJobWithMethods(rawJob, this) };
  }

  /**
   * Fetches a job by its Key (GUID) using the GetByKey endpoint.
   * Only selects fields needed for output extraction.
   */
  private async fetchJobByKey(
    jobKey: string,
    folderId: number
  ): Promise<RawJobOutputFields> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    const response = await this.get<RawJobOutputFields>(
      JOB_ENDPOINTS.GET_BY_KEY(jobKey),
      {
        params: {
          $select: 'OutputArguments,OutputFile',
        },
        headers,
      }
    );
    return response.data;
  }

  /**
   * Downloads the output file content via the Attachments API.
   * 1. Fetches blob access info from the attachment using AttachmentService
   * 2. Downloads content from the presigned blob URI
   * 3. Parses and returns the JSON content
   */
  private async downloadOutputFile(
    outputFileKey: string
  ): Promise<Record<string, unknown> | null> {
    const attachment = await this.attachmentService.getById(outputFileKey);

    const blobAccess = attachment.blobFileAccess;
    if (!blobAccess?.uri) {
      return null;
    }

    const blobHeaders: Record<string, string> = { ...blobAccess.headers };

    // Add auth header if the blob URI requires authenticated access
    if (blobAccess.requiresAuth) {
      const token = await this.getValidAuthToken();
      blobHeaders['Authorization'] = `Bearer ${token}`;
    }

    const blobResponse = await fetch(blobAccess.uri, {
      method: 'GET',
      headers: blobHeaders,
    });

    if (!blobResponse.ok) {
      const errorInfo = await errorResponseParser.parse(blobResponse);
      throw ErrorFactory.createFromHttpStatus(blobResponse.status, errorInfo);
    }

    const content = await blobResponse.text();
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      throw new ServerError({ message: 'Failed to parse job output file as JSON' });
    }
  }
}
