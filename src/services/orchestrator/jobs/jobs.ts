import { FolderScopedService } from '../../folder-scoped';
import { JobGetResponse, JobGetAllOptions } from '../../../models/orchestrator/jobs.types';
import { JobServiceModel } from '../../../models/orchestrator/jobs.models';
import { pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { JOB_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION } from '../../../utils/constants/common';
import { JobMap } from '../../../models/orchestrator/jobs.constants';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Jobs API
 */
export class JobService extends FolderScopedService implements JobServiceModel {
  /**
   * Gets all jobs within a folder with optional filtering and pagination
   *
   * @param options - Query options including required folderId and optional pagination/filter options
   * @returns Promise resolving to array of jobs or paginated response
   *
   * @example
   * ```typescript
   * import { Jobs } from '@uipath/uipath-typescript/jobs';
   *
   * const jobs = new Jobs(sdk);
   *
   * // Get all jobs in a folder
   * const allJobs = await jobs.getAll({ folderId: 123 });
   *
   * // With filter
   * const runningJobs = await jobs.getAll({
   *   folderId: 123,
   *   filter: "State eq 'Running'"
   * });
   *
   * // First page with pagination
   * const page1 = await jobs.getAll({ folderId: 123, pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await jobs.getAll({ folderId: 123, cursor: page1.nextCursor });
   * }
   * ```
   */
  @track('Jobs.GetAll')
  async getAll<T extends JobGetAllOptions = JobGetAllOptions>(
    options: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<JobGetResponse>
      : NonPaginatedResponse<JobGetResponse>
  > {
    const transformJobResponse = (job: unknown) =>
      transformData(pascalToCamelCaseKeys(job as Record<string, unknown>) as JobGetResponse, JobMap);

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
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM
        }
      }
    }, options) as any;
  }
}
