import { BaseService } from '../../base';
import { OperationResponse } from '../../../models/common/types';
import {
  RawJobGetResponse,
  JobGetAllOptions,
  JobGetByIdOptions,
  JobStopOptions,
  JobStopJobsOptions,
  JobResumeOptions,
} from '../../../models/orchestrator/jobs.types';
import { JobServiceModel, JobGetResponse, createJobWithMethods } from '../../../models/orchestrator/jobs.models';
import { JobMap } from '../../../models/orchestrator/jobs.constants';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Jobs API
 */
export class JobService extends BaseService implements JobServiceModel {
  /**
   * Gets all jobs across folders with optional filtering and pagination
   */
  @track('Jobs.GetAll')
  async getAll<T extends JobGetAllOptions = JobGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<JobGetResponse>
      : NonPaginatedResponse<JobGetResponse>
  > {
    const transformJobResponse = (job: any) =>
      createJobWithMethods(
        transformData(pascalToCamelCaseKeys(job) as RawJobGetResponse, JobMap),
        this
      );

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
   * Gets a single job by ID
   */
  @track('Jobs.GetById')
  async getById(id: number, options: JobGetByIdOptions = {}): Promise<JobGetResponse> {
    const { folderId, ...queryOptions } = options;
    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};

    const keysToPrefix = Object.keys(queryOptions);
    const apiOptions = addPrefixToKeys(queryOptions, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<RawJobGetResponse>(
      JOB_ENDPOINTS.GET_BY_ID(id),
      {
        headers,
        params: apiOptions,
      }
    );

    const transformedJob = transformData(
      pascalToCamelCaseKeys(response.data) as RawJobGetResponse,
      JobMap
    );

    return createJobWithMethods(transformedJob, this);
  }

  /**
   * Stops a single job by ID
   */
  @track('Jobs.Stop')
  async stop(id: number, options: JobStopOptions, folderId?: number): Promise<OperationResponse<{ id: number }>> {
    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};

    const requestBody = {
      strategy: options.strategy,
    };

    await this.post(
      JOB_ENDPOINTS.STOP(id),
      requestBody,
      { headers }
    );

    return { success: true, data: { id } };
  }

  /**
   * Stops multiple jobs at once
   */
  @track('Jobs.StopJobs')
  async stopJobs(options: JobStopJobsOptions, folderId?: number): Promise<OperationResponse<{ jobIds: number[] }>> {
    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};

    const requestBody = {
      jobIds: options.jobIds,
      strategy: options.strategy,
    };

    await this.post(
      JOB_ENDPOINTS.STOP_JOBS,
      requestBody,
      { headers }
    );

    return { success: true, data: { jobIds: options.jobIds } };
  }

  /**
   * Restarts a faulted or stopped job
   */
  @track('Jobs.Restart')
  async restart(jobId: number, folderId?: number): Promise<OperationResponse<{ id: number }>> {
    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};

    const requestBody = {
      jobId,
    };

    await this.post(
      JOB_ENDPOINTS.RESTART,
      requestBody,
      { headers }
    );

    return { success: true, data: { id: jobId } };
  }

  /**
   * Resumes a suspended job
   */
  @track('Jobs.Resume')
  async resume(options: JobResumeOptions, folderId?: number): Promise<OperationResponse<{ jobKey: string }>> {
    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : {};

    const requestBody: Record<string, any> = {
      jobKey: options.jobKey,
    };

    if (options.inputArguments !== undefined) {
      requestBody.inputArguments = options.inputArguments;
    }

    await this.post(
      JOB_ENDPOINTS.RESUME,
      requestBody,
      { headers }
    );

    return { success: true, data: { jobKey: options.jobKey } };
  }
}
