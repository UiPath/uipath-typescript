import { track } from '@/core/telemetry';
import { ValidationError } from '@/core/errors';
import type {
  FolderGetAllOptions,
  FolderGetAllResponse,
  FolderGetByKeyOptions,
  FolderGetResponse,
} from '@/models/orchestrator/folders.types';
import type { FolderServiceModel } from '@/models/orchestrator/folders.models';
import { FOLDER_ENDPOINTS } from '@/utils/constants/endpoints';
import { ODATA_PREFIX, FOLDER_PAGINATION, FOLDER_OFFSET_PARAMS } from '@/utils/constants/common';
import { addPrefixToKeys, pascalToCamelCaseKeys } from '@/utils/transform';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';
import { PaginationHelpers } from '@/utils/pagination/helpers';
import { PaginationType } from '@/utils/pagination/internal-types';
import { GUID_REGEX } from '@/utils/validation/guid';
import { BaseService } from '@/services/base';

/**
 * Service for looking up UiPath Orchestrator folders.
 *
 * This service is not folder-scoped — no folder headers are sent on requests.
 */
export class FolderService extends BaseService implements FolderServiceModel {
  @track('Folders.GetAll')
  async getAll<T extends FolderGetAllOptions = FolderGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FolderGetAllResponse>
      : NonPaginatedResponse<FolderGetAllResponse>
  > {
    const transformFn = (folder: Record<string, unknown>): FolderGetAllResponse =>
      pascalToCamelCaseKeys(folder) as FolderGetAllResponse;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => FOLDER_ENDPOINTS.GET_ALL,
      transformFn,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: FOLDER_PAGINATION.ITEMS_FIELD,
        totalCountField: FOLDER_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: FOLDER_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: FOLDER_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: FOLDER_OFFSET_PARAMS.COUNT_PARAM
        }
      },
      // `take` / `skip` are not OData params — keep them unprefixed.
      excludeFromPrefix: Object.keys(options || {})
    }, options);
  }

  @track('Folders.GetByKey')
  async getByKey(key: string, options: FolderGetByKeyOptions = {}): Promise<FolderGetResponse> {
    const trimmedKey = key?.trim();
    if (!trimmedKey || !GUID_REGEX.test(trimmedKey)) {
      throw new ValidationError({ message: 'Folders.getByKey: key must be a GUID.' });
    }

    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, Object.keys(options));

    const response = await this.get<Record<string, unknown>>(
      FOLDER_ENDPOINTS.GET_BY_KEY(trimmedKey),
      { params: apiOptions },
    );

    const camelCased = pascalToCamelCaseKeys(response.data) as FolderGetResponse & { '@odata.context'?: string };
    const { '@odata.context': _odataContext, ...folder } = camelCased;
    return folder;
  }
}
