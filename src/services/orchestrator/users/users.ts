import { BaseService } from '../../base';
import type { IUiPath } from '../../../core/types';
import { UserServiceModel } from '../../../models/orchestrator/users.models';
import { UserGetAllOptions, UserGetByIdOptions, UserGetCurrentOptions, UserGetResponse } from '../../../models/orchestrator/users.types';
import { addPrefixToKeys, pascalToCamelCaseKeys, transformData } from '../../../utils/transform';
import { USERS_ENDPOINTS } from '../../../utils/constants/endpoints';
import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION, ODATA_PREFIX } from '../../../utils/constants/common';
import { HasPaginationOptions, NonPaginatedResponse, PaginatedResponse } from '../../../utils/pagination';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import { UserMap } from '../../../models/orchestrator/users.constants';
import { track } from '../../../core/telemetry';

/**
 * Service for interacting with UiPath Orchestrator Users API.
 */
export class UserService extends BaseService implements UserServiceModel {
  /**
   * Gets users with optional filtering and pagination.
   */
  @track('Users.GetAll')
  async getAll<T extends UserGetAllOptions = UserGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<UserGetResponse>
    : NonPaginatedResponse<UserGetResponse>
  > {
    const transformUserResponse = (user: any) =>
      transformData(pascalToCamelCaseKeys(user) as UserGetResponse, UserMap);

    // Filter out internal pagination keys so they do not get OData prefixed (e.g. $pageSize)
    const apiOptions = { ...options } as Record<string, any>;
    delete apiOptions.pageSize;
    delete apiOptions.cursor;
    delete apiOptions.jumpToPage;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => USERS_ENDPOINTS.GET_ALL,
      transformFn: transformUserResponse,
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

  /**
   * Gets a single user by ID.
   */
  @track('Users.GetById')
  async getById(id: number, options: UserGetByIdOptions = {}): Promise<UserGetResponse> {
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<UserGetResponse>(
      USERS_ENDPOINTS.GET_BY_ID(id),
      {
        params: apiOptions
      }
    );

    return transformData(pascalToCamelCaseKeys(response.data) as UserGetResponse, UserMap);
  }

  /**
   * Gets the current user from Orchestrator.
   */
  @track('Users.GetCurrent')
  async getCurrent(options: UserGetCurrentOptions = {}): Promise<UserGetResponse | undefined> {
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);

    const response = await this.get<UserGetResponse | undefined>(
      USERS_ENDPOINTS.GET_CURRENT,
      {
        params: apiOptions
      }
    );

    if (!response.data) {
      return undefined;
    }

    return transformData(pascalToCamelCaseKeys(response.data) as UserGetResponse, UserMap);
  }
}
