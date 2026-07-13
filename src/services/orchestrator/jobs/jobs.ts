import { FolderScopedService } from '../../folder-scoped';
import { RawJobGetResponse, JobGetAllOptions, JobGetByIdOptions, JobStopOptions, JobResumeOptions } from '../../../models/orchestrator/jobs.types';
import { JobServiceModel, JobGetResponse, createJobWithMethods } from '../../../models/orchestrator/jobs.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformOptions, transformData } from '../../../utils/transform';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS, ODATA_PREFIX } from '../../../utils/constants/common';
import { JobMap, JOB_KEY_RESOLUTION_CHUNK_SIZE } from '../../../models/orchestrator/jobs.constants';
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
import { StopStrategy } from '../../../models/orchestrator/processes.types';

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

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating, mirroring the transformRequest pattern used for
    // request bodies.
    const apiOptions = options ? transformOptions(options, JobMap) : options;

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
    }, apiOptions) as any;
  }

  @track('Jobs.GetById')
  async getById(id: string, folderId: number, options?: JobGetByIdOptions): Promise<JobGetResponse> {
    if (!id) {
      throw new ValidationError({ message: 'id is required for getById' });
    }
    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for getById' });
    }

    const headers = createHeaders({ [FOLDER_ID]: folderId });
    const apiFieldOptions = options ? transformOptions(options, JobMap) : {};
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<Record<string, unknown>>(
      JOB_ENDPOINTS.GET_BY_KEY(id),
      {
        params: apiOptions,
        headers,
      }
    );

    const rawJob = transformData(pascalToCamelCaseKeys(response.data) as RawJobGetResponse, JobMap);
    return createJobWithMethods(rawJob, this);
  }

  @track('Jobs.GetOutput')
  async getOutput(jobKey: string, folderId: number): Promise<Record<string, unknown> | null> {
    if (!jobKey) {
      throw new ValidationError({ message: 'jobKey is required for getOutput' });
    }

    const job = await this.getById(jobKey, folderId, { select: 'outputArguments,outputFile' });

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

  @track('Jobs.Stop')
  async stop(
    jobKeys: string[],
    folderId: number,
    options?: JobStopOptions
  ): Promise<void> {
    if (jobKeys.length === 0) {
      return;
    }

    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for stop' });
    }

    const headers = createHeaders({ [FOLDER_ID]: folderId });
    const strategy = options?.strategy ?? StopStrategy.SoftStop;

    const jobIds = await this.resolveJobKeys(jobKeys, folderId);

    await this.stopJobsByIds(jobIds, strategy, headers);
  }

  @track('Jobs.Resume')
  async resume(jobKey: string, folderId: number, options?: JobResumeOptions): Promise<void> {
    if (!jobKey) {
      throw new ValidationError({ message: 'jobKey is required for resume' });
    }

    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for resume' });
    }

    const headers = createHeaders({ [FOLDER_ID]: folderId });
    const body: Record<string, unknown> = { jobKey };

    if (options?.inputArguments) {
      body.inputArguments = JSON.stringify(options.inputArguments);
    }

    await this.post(
      JOB_ENDPOINTS.RESUME,
      body,
      { headers }
    );
  }

  @track('Jobs.Restart')
  async restart(jobKey: string, folderId: number): Promise<JobGetResponse> {
    if (!jobKey) {
      throw new ValidationError({ message: 'jobKey is required for restart' });
    }

    if (!folderId) {
      throw new ValidationError({ message: 'folderId is required for restart' });
    }

    const [jobId] = await this.resolveJobKeys([jobKey], folderId);
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const response = await this.post<Record<string, unknown>>(
      JOB_ENDPOINTS.RESTART,
      { jobId },
      { headers }
    );

    const rawJob = transformData(pascalToCamelCaseKeys(response.data) as RawJobGetResponse, JobMap);
    return createJobWithMethods(rawJob, this);
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

  /**
   * Resolves job UUID keys to integer IDs via the getAll method.
   * Chunks keys into batches to avoid URL length limits.
   */
  private async resolveJobKeys(
    jobKeys: string[],
    folderId: number
  ): Promise<number[]> {
    const uniqueKeys = [...new Set(jobKeys)];
    const keyToIdMap = new Map<string, number>();

    const chunks: string[][] = [];
    for (let i = 0; i < uniqueKeys.length; i += JOB_KEY_RESOLUTION_CHUNK_SIZE) {
      chunks.push(uniqueKeys.slice(i, i + JOB_KEY_RESOLUTION_CHUNK_SIZE));
    }

    const results = await Promise.all(
      chunks.map((chunk) => {
        const filterValues = chunk.map((key) => `'${key}'`).join(',');
        return this.getAll({
          folderId,
          filter: `key in (${filterValues})`,
          select: 'id,key',
          pageSize: chunk.length,
        });
      })
    );

    for (const response of results) {
      for (const job of response.items) {
        keyToIdMap.set(job.key, job.id);
      }
    }

    const missingKeys = uniqueKeys.filter((key) => !keyToIdMap.has(key));
    if (missingKeys.length > 0) {
      throw new ValidationError({ message: `Jobs not found for keys: ${missingKeys.join(', ')}` });
    }

    return uniqueKeys.map((key) => keyToIdMap.get(key)!);
  }

  /**
   * Calls the StopJobs OData action with resolved integer IDs.
   */
  private async stopJobsByIds(
    jobIds: number[],
    strategy: StopStrategy,
    headers: Record<string, string>
  ): Promise<void> {
    await this.post(
      JOB_ENDPOINTS.STOP,
      { jobIds, strategy },
      { headers }
    );
  }
}
