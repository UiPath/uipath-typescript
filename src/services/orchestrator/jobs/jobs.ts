import { FolderScopedService } from '../../folder-scoped';
import { JobGetResponse, JobGetAllOptions, JobGetByIdOptions } from '../../../models/orchestrator/jobs.types';
import { JobServiceModel } from '../../../models/orchestrator/jobs.models';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_PAGINATION, ODATA_OFFSET_PARAMS, ODATA_PREFIX } from '../../../utils/constants/common';
import { JobMap } from '../../../models/orchestrator/jobs.constants';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_ID } from '../../../utils/constants/headers';

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
   * Gets a single job by its numeric ID
   *
   * @param id - The numeric ID of the job
   * @param options - Optional query parameters including expand, select, and folderId
   * @returns Promise resolving to a single job
   *
   * @example
   * ```typescript
   * import { Jobs } from '@uipath/uipath-typescript/jobs';
   *
   * const jobs = new Jobs(sdk);
   *
   * // Get a job by ID
   * const job = await jobs.getById(12345);
   *
   * // Get a job with expanded relations
   * const job = await jobs.getById(12345, {
   *   expand: 'Release,Robot,Machine'
   * });
   * ```
   */
  @track('Jobs.GetById')
  async getById(id: number, options: JobGetByIdOptions = {}): Promise<JobGetResponse> {
    const { folderId, ...queryOptions } = options;

    const headers = folderId ? createHeaders({ [FOLDER_ID]: folderId }) : undefined;

    const keysToPrefix = Object.keys(queryOptions);
    const apiOptions = addPrefixToKeys(queryOptions, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<JobGetResponse>(
      JOB_ENDPOINTS.GET_BY_ID(id),
      {
        headers,
        params: apiOptions,
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data) as JobGetResponse, JobMap);
  }
}
