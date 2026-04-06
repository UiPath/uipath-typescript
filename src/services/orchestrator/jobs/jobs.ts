import { FolderScopedService } from '../../folder-scoped';
import { RawJobGetResponse, JobGetAllOptions } from '../../../models/orchestrator/jobs.types';
import { RawJobOutputFields } from '../../../models/orchestrator/jobs.internal-types';
import { JobServiceModel, JobGetResponse, createJobWithMethods } from '../../../models/orchestrator/jobs.models';
import { pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
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
   * Gets all jobs across folders with optional filtering
   *
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to array of jobs or paginated response
   *
   * @example
   * ```typescript
   * import { Jobs } from '@uipath/uipath-typescript/jobs';
   *
   * const jobs = new Jobs(sdk);
   *
   * // Get all jobs
   * const allJobs = await jobs.getAll();
   *
   * // Get all jobs in a specific folder
   * const folderJobs = await jobs.getAll({ folderId: 123 });
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
   * Retrieves the job's output arguments, handling both inline output (stored directly on the job)
   * and file-based output (stored as a blob attachment for large outputs). Returns the parsed JSON
   * output or null if the job has no output.
   *
   * @param jobKey - The unique key (GUID) of the job
   * @returns Promise resolving to the parsed output object, or null if no output exists
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
