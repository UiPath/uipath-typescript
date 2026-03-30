import { FolderScopedService } from '../../folder-scoped';
import { JobGetResponse, JobGetAllOptions, JobStopOptions, JobStopData } from '../../../models/orchestrator/jobs.types';
import { JobServiceModel } from '../../../models/orchestrator/jobs.models';
import { pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../../utils/constants/common';
import { JobMap } from '../../../models/orchestrator/jobs.constants';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import { OperationResponse, CollectionResponse } from '../../../models/common/types';
import { StopStrategy } from '../../../models/orchestrator/processes.types';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID, RESPONSE_TYPES } from '../../../utils/constants/headers';

/** Maximum number of job keys to resolve in a single OData filter query */
const JOB_KEY_RESOLUTION_CHUNK_SIZE = 50;

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
    const transformJobResponse = (job: any) =>
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
   * Stops one or more jobs by their UUID keys.
   *
   * Resolves job UUID keys to integer IDs, then calls the StopJobs OData action.
   * Keys are resolved in chunks of 50 to avoid URL length limits.
   *
   * @param jobKeys - Array of job UUID keys to stop
   * @param folderId - The folder ID where the jobs reside (required by the API)
   * @param options - Optional stop options including strategy
   * @returns Promise resolving to an OperationResponse with the resolved job IDs
   */
  @track('Jobs.Stop')
  async stop(
    jobKeys: string[],
    folderId: number,
    options?: JobStopOptions
  ): Promise<OperationResponse<JobStopData>> {
    if (jobKeys.length === 0) {
      return { success: true, data: { jobIds: [] } };
    }

    const headers = createHeaders({ [FOLDER_ID]: folderId });
    const strategy = options?.strategy ?? StopStrategy.SoftStop;

    const jobIds = await this.resolveJobKeys(jobKeys, headers);

    await this.stopJobsByIds(jobIds, strategy, headers);

    return { success: true, data: { jobIds } };
  }

  /**
   * Resolves job UUID keys to integer IDs via OData filter queries.
   * Chunks keys into batches to avoid URL length limits.
   */
  private async resolveJobKeys(
    jobKeys: string[],
    headers: Record<string, string>
  ): Promise<number[]> {
    const uniqueKeys = [...new Set(jobKeys)];
    const keyToIdMap = new Map<string, number>();

    for (let i = 0; i < uniqueKeys.length; i += JOB_KEY_RESOLUTION_CHUNK_SIZE) {
      const chunk = uniqueKeys.slice(i, i + JOB_KEY_RESOLUTION_CHUNK_SIZE);
      const filterValues = chunk.map((key) => `'${key}'`).join(',');
      const filter = `Key in (${filterValues})`;

      const response = await this.get<CollectionResponse<{ Key: string; Id: number }>>(
        JOB_ENDPOINTS.GET_ALL,
        {
          params: { $filter: filter, $select: 'Id,Key' },
          headers,
        }
      );

      for (const job of response.data.value) {
        keyToIdMap.set(job.Key, job.Id);
      }
    }

    const missingKeys = uniqueKeys.filter((key) => !keyToIdMap.has(key));
    if (missingKeys.length > 0) {
      throw new Error(`Jobs not found for keys: ${missingKeys.join(', ')}`);
    }

    return jobKeys.map((key) => keyToIdMap.get(key)!);
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
      { headers, responseType: RESPONSE_TYPES.TEXT }
    );
  }
}
