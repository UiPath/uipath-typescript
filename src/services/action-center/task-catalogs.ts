import { ValidationError } from '../../core/errors';
import { track } from '../../core/telemetry';
import { TaskCatalogMap } from '../../models/action-center/task-catalogs.constants';
import { TaskCatalogGetResponse, TaskCatalogServiceModel } from '../../models/action-center/task-catalogs.models';
import {
  TaskCatalogCreateOptions,
  TaskCatalogGetAllOptions,
  TaskCatalogGetByIdOptions,
  TaskCatalogGetByNameOptions,
  TaskCatalogRetentionAction,
  TaskCatalogUpdateOptions,
} from '../../models/action-center/task-catalogs.types';
import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION, ODATA_PREFIX } from '../../utils/constants/common';
import { TASK_CATALOG_ENDPOINTS } from '../../utils/constants/endpoints';
import { resolveFolderHeaders } from '../../utils/folder/folder-headers';
import { HasPaginationOptions, NonPaginatedResponse, PaginatedResponse } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import { addPrefixToKeys, camelToPascalCaseKeys, pascalToCamelCaseKeys, transformData, transformOptions } from '../../utils/transform';
import { FolderScopedService } from '../folder-scoped';

/**
 * Service for interacting with UiPath Action Center task catalogs.
 */
export class TaskCatalogService extends FolderScopedService implements TaskCatalogServiceModel {
  @track('TaskCatalogs.GetAll')
  async getAll<T extends TaskCatalogGetAllOptions = TaskCatalogGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskCatalogGetResponse>
      : NonPaginatedResponse<TaskCatalogGetResponse>
  > {
    const { folderId, folderKey, folderPath, ...queryOptions } = options ?? {};
    const headers = resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType: 'TaskCatalogs.getAll', fallbackFolderKey: this.config.folderKey });

    const transformCatalog = (catalog: unknown) =>
      transformData(pascalToCamelCaseKeys(catalog as Record<string, unknown>) as TaskCatalogGetResponse, TaskCatalogMap);

    const apiOptions = transformOptions(queryOptions, TaskCatalogMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => TASK_CATALOG_ENDPOINTS.GET_ALL,
      headers,
      transformFn: transformCatalog,
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
    }, apiOptions as T) as any;
  }

  @track('TaskCatalogs.GetById')
  async getById(id: number, options: TaskCatalogGetByIdOptions = {}): Promise<TaskCatalogGetResponse> {
    return this.fetchById(id, options);
  }

  // Untracked core for getById, reused by the update read-modify-write path to avoid double telemetry.
  private async fetchById(id: number, options: TaskCatalogGetByIdOptions = {}): Promise<TaskCatalogGetResponse> {
    const { folderId, folderKey, folderPath, ...queryOptions } = options;
    const headers = resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType: 'TaskCatalogs.getById', fallbackFolderKey: this.config.folderKey });

    const apiFieldOptions = transformOptions(queryOptions, TaskCatalogMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));

    const response = await this.get<TaskCatalogGetResponse>(
      TASK_CATALOG_ENDPOINTS.GET_BY_ID(id),
      { headers, params: apiOptions }
    );

    return transformData(pascalToCamelCaseKeys(response.data) as TaskCatalogGetResponse, TaskCatalogMap);
  }

  @track('TaskCatalogs.GetByName')
  async getByName(name: string, options: TaskCatalogGetByNameOptions = {}): Promise<TaskCatalogGetResponse> {
    const { result } = await this.getByNameLookup<TaskCatalogGetResponse, TaskCatalogGetResponse>(
      'TaskCatalog',
      TASK_CATALOG_ENDPOINTS.GET_ALL,
      name,
      options,
      (raw) => transformData(pascalToCamelCaseKeys(raw), TaskCatalogMap),
      TaskCatalogMap,
    );
    return result;
  }

  @track('TaskCatalogs.Create')
  async create(name: string, options: TaskCatalogCreateOptions = {}): Promise<TaskCatalogGetResponse> {
    if (!name) {
      throw new ValidationError({ message: 'name is required for create' });
    }

    const { folderId, folderKey, folderPath, expand: _expand, select: _select, ...fields } = options;
    const headers = resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType: 'TaskCatalogs.create', fallbackFolderKey: this.config.folderKey });
    const response = await this.post<TaskCatalogGetResponse>(
      TASK_CATALOG_ENDPOINTS.CREATE,
      camelToPascalCaseKeys({ name, ...fields }),
      { headers }
    );
    return transformData(pascalToCamelCaseKeys(response.data) as TaskCatalogGetResponse, TaskCatalogMap);
  }

  @track('TaskCatalogs.UpdateById')
  async updateById(id: number, options: TaskCatalogUpdateOptions = {}): Promise<void> {
    if (!id) {
      throw new ValidationError({ message: 'id is required for updateById' });
    }

    const { folderId, folderKey, folderPath } = options;
    const current = await this.fetchById(id, { folderId, folderKey, folderPath });
    return this.update(current, options);
  }

  @track('TaskCatalogs.UpdateByName')
  async updateByName(name: string, options: TaskCatalogUpdateOptions = {}): Promise<void> {
    if (!name) {
      throw new ValidationError({ message: 'name is required for updateByName' });
    }

    const { folderId, folderKey, folderPath } = options;
    const { result: current } = await this.getByNameLookup<TaskCatalogGetResponse, TaskCatalogGetResponse>(
      'TaskCatalog',
      TASK_CATALOG_ENDPOINTS.GET_ALL,
      name,
      { folderId, folderKey, folderPath },
      (raw) => transformData(pascalToCamelCaseKeys(raw), TaskCatalogMap),
      TaskCatalogMap,
    );

    return this.update(current, options);
  }

  // Read-modify-write: merges the caller's fields over the current catalog so name,
  // description and retention are preserved when not passed. Tags are the exception:
  // the catalog GET does not return them, so they cannot be read back and preserved;
  // tags are only sent when the caller explicitly provides them.
  private async update(current: TaskCatalogGetResponse, options: TaskCatalogUpdateOptions): Promise<void> {
    const { folderId, folderKey, folderPath } = options;
    const headers = resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType: 'TaskCatalogs.update', fallbackFolderKey: this.config.folderKey });
    const body = camelToPascalCaseKeys({
      name: options.name ?? current.name,
      description: options.description ?? current.description,
      encrypted: current.encrypted, // immutable on update; always send the current value to avoid ForbiddenOperation
      // None is a read-only sentinel (no retention); send null rather than the sentinel on write.
      retentionAction: options.retentionAction ?? (current.retentionAction === TaskCatalogRetentionAction.None ? null : current.retentionAction),
      retentionPeriod: options.retentionPeriod ?? current.retentionPeriod,
      retentionBucketId: options.retentionBucketId ?? current.retentionBucketId,
      ...(options.tags !== undefined ? { tags: options.tags } : {}),
    });
    await this.post<void>(TASK_CATALOG_ENDPOINTS.UPDATE(current.id), body, { headers });
  }
}
