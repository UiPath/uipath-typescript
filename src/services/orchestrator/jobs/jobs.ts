import { FolderScopedService } from '../../folder-scoped';
import { RawJobGetResponse, JobGetAllOptions, JobGetByKeyOptions } from '../../../models/orchestrator/jobs.types';
import { JobServiceModel, JobGetResponse, createJobWithMethods } from '../../../models/orchestrator/jobs.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS, ODATA_PREFIX } from '../../../utils/constants/common';
import { JobMap } from '../../../models/orchestrator/jobs.constants';
import { AttachmentService } from '../attachments/attachments';
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
   * Gets a job by its unique key (GUID).
   *
   * Returns the full job details including state, timing, input/output arguments, and error information.
   * Use `expand` to include related entities like Robot, Machine, or Release.
   *
   * @param jobKey - The unique key (GUID) of the job to retrieve
   * @param folderId - The folder ID where the job resides
   * @param options - Optional query options for expanding or selecting fields
   * @returns Promise resolving to a {@link JobGetResponse} with full job details and bound methods
   *
   * @example
   * ```typescript
   * // Get a job by key
   * const job = await jobs.getByKey(<jobKey>, <folderId>);
   * console.log(job.state, job.processName);
   * ```
   *
   * @example
   * ```typescript
   * // With expanded related entities
   * const job = await jobs.getByKey(<jobKey>, <folderId>, {
   *   expand: 'Robot,Machine,Release'
   * });
   * console.log(job.robot?.name, job.machine?.name);
   * ```
   */
  @track('Jobs.GetByKey')
  async getByKey(jobKey: string, folderId: number, options: JobGetByKeyOptions = {}): Promise<JobGetResponse> {
    if (!jobKey) {
      throw new ValidationError({ message: 'jobKey is required for getByKey' });
    }

    const headers = createHeaders({ [FOLDER_ID]: folderId });
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<Record<string, unknown>>(
      JOB_ENDPOINTS.GET_BY_KEY(jobKey),
      {
        params: apiOptions,
        headers,
      }
    );

    const rawJob = transformData(pascalToCamelCaseKeys(response.data) as RawJobGetResponse, JobMap);
    return createJobWithMethods(rawJob, this);
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

    const job = await this.getByKey(jobKey, folderId, { select: 'OutputArguments,OutputFile' });

    if (job.outputArguments) {
      try {
        return JSON.parse(job.outputArguments) as Record<string, unknown>;
      } catch {
        throw new ServerError({ message: 'Failed to parse job output arguments as JSON' });
      }
    }

    if (job.outputFile) {
      return this.downloadOutputFile(job.outputFile);
    }

    return null;
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
