import { FolderScopedService } from '../../folder-scoped';
import { JobGetResponse, JobGetAllOptions, JobGetOutputOptions } from '../../../models/orchestrator/jobs.types';
import { JobServiceModel } from '../../../models/orchestrator/jobs.models';
import { pascalToCamelCaseKeys, transformData, arrayDictionaryToRecord } from '../../../utils/transform';
import { JOB_ENDPOINTS, ORCHESTRATOR_ATTACHMENT_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { JobMap } from '../../../models/orchestrator/jobs.constants';
import { RawAttachmentResponse } from '../../../models/orchestrator/jobs.internal-types';
import { ValidationError } from '../../../core/errors';
import { ErrorFactory } from '../../../core/errors/error-factory';
import { errorResponseParser } from '../../../core/errors/parser';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Jobs API
 */
export class JobService extends FolderScopedService implements JobServiceModel {
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
    const transformJobResponse = (job: Record<string, unknown>) =>
      transformData(pascalToCamelCaseKeys(job) as JobGetResponse, JobMap);

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
   * @param options - Options containing the job key (GUID)
   * @returns Promise resolving to the parsed output object, or null if no output exists
   */
  @track('Jobs.GetOutput')
  async getOutput(options: JobGetOutputOptions): Promise<Record<string, unknown> | null> {
    const { jobKey } = options;

    if (!jobKey) {
      throw new ValidationError({ message: 'jobKey is required for getOutput' });
    }

    const job = await this.fetchJobByKey(jobKey);

    if (!job) {
      return null;
    }

    if (job.OutputArguments) {
      try {
        return JSON.parse(job.OutputArguments) as Record<string, unknown>;
      } catch {
        throw new ValidationError({ message: `Failed to parse job output arguments as JSON` });
      }
    }

    if (job.OutputFile) {
      return this.downloadOutputFile(job.OutputFile);
    }

    return null;
  }

  /**
   * Fetches a job by its Key (GUID), returning the raw API response (PascalCase).
   * Uses the Jobs list endpoint with a Key filter. Only selects fields needed for output extraction.
   */
  private async fetchJobByKey(
    jobKey: string
  ): Promise<{ OutputArguments: string | null; OutputFile: string | null } | null> {
    const response = await this.get<{
      value: { OutputArguments: string | null; OutputFile: string | null }[];
    }>(
      JOB_ENDPOINTS.GET_ALL,
      {
        params: {
          $filter: `Key eq ${jobKey}`,
          $select: 'OutputArguments,OutputFile',
          $top: 1,
        },
      }
    );
    return response.data.value?.[0] ?? null;
  }

  /**
   * Downloads the output file content via the Attachments API.
   * 1. Fetches blob access info from the attachment
   * 2. Downloads content from the presigned blob URI
   * 3. Parses and returns the JSON content
   */
  private async downloadOutputFile(
    outputFileKey: string
  ): Promise<Record<string, unknown> | null> {
    const attachmentResponse = await this.get<RawAttachmentResponse>(
      ORCHESTRATOR_ATTACHMENT_ENDPOINTS.GET_BY_ID(outputFileKey)
    );

    const blobAccess = attachmentResponse.data.BlobFileAccess;
    if (!blobAccess?.Uri) {
      return null;
    }

    // Convert array-based headers {Keys: [...], Values: [...]} to a Record
    const blobHeaders: Record<string, string> = blobAccess.Headers
      ? arrayDictionaryToRecord({
          keys: blobAccess.Headers.Keys,
          values: blobAccess.Headers.Values,
        })
      : {};

    // Add auth header if the blob URI requires authenticated access
    if (blobAccess.RequiresAuth) {
      const token = await this.getValidAuthToken();
      blobHeaders['Authorization'] = `Bearer ${token}`;
    }

    const blobResponse = await fetch(blobAccess.Uri, {
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
      throw new ValidationError({ message: `Failed to parse job output file as JSON` });
    }
  }
}
