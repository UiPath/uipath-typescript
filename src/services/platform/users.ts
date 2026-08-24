/**
 * PlatformUserService — lists, reads, and updates an organization's users.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';

import type {
  RawPlatformUserGetResponse,
  PlatformUserGetAllOptions,
  PlatformUserUpdateOptions,
  PlatformUserUpdateResponse,
} from '../../models/platform/users.types';
import { PlatformUserSortField } from '../../models/platform/users.types';
import type {
  RawPlatformUser,
  RawPlatformUserListResponse,
  RawPlatformUserUpdateResult,
} from '../../models/platform/users.internal-types';
import type { PlatformUserServiceModel } from '../../models/platform/users.models';
import { PlatformUserGetResponse, createPlatformUserWithMethods } from '../../models/platform/users.models';
import {
  PlatformUserMap,
  PlatformUserTypeMap,
  PlatformUserCategoryMap,
} from '../../models/platform/users.constants';

import { IDENTITY_USER_ENDPOINTS } from '../../utils/constants/endpoints';
import { IDENTITY_PAGINATION, IDENTITY_OFFSET_PARAMS, IDENTITY_MAX_PAGE_SIZE } from '../../utils/constants/common';
import { transformData, transformRequest, applyDataTransforms } from '../../utils/transform';
import { createParams } from '../../utils/http/params';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../utils/pagination';

/**
 * Service for managing an organization's users.
 *
 * Users are organization-scoped accounts. Together with groups they form the basis of
 * access management: put users in groups, then grant roles to the groups. Group
 * membership is edited through {@link PlatformUserService.updateById} via
 * `groupIdsToAdd` / `groupIdsToRemove`.
 */
export class PlatformUserService extends BaseService implements PlatformUserServiceModel {
  @track('PlatformUsers.GetAll')
  async getAll<T extends PlatformUserGetAllOptions = PlatformUserGetAllOptions>(
    organizationId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformUserGetResponse>
      : NonPaginatedResponse<PlatformUserGetResponse>
  > {
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for getAll' });
    }
    const opts = options ?? ({} as T);

    // The API always pages (default page size 10, max 1000), so without pagination
    // options every page is fetched — a single request would silently truncate.
    const hasPaginationOptions =
      opts.pageSize !== undefined || opts.cursor !== undefined || opts.jumpToPage !== undefined;
    if (!hasPaginationOptions) {
      return this.getAllPages(organizationId, opts) as Promise<
        T extends HasPaginationOptions<T>
          ? PaginatedResponse<PlatformUserGetResponse>
          : NonPaginatedResponse<PlatformUserGetResponse>
      >;
    }

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => IDENTITY_USER_ENDPOINTS.GET_ALL(organizationId),
      transformFn: (item: RawPlatformUser) => this.toUser(item),
      excludeFromPrefix: Object.keys(opts),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: IDENTITY_PAGINATION.ITEMS_FIELD,
        totalCountField: IDENTITY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: IDENTITY_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: IDENTITY_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: IDENTITY_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
    }, opts) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<PlatformUserGetResponse>
        : NonPaginatedResponse<PlatformUserGetResponse>
    >;
  }

  @track('PlatformUsers.GetById')
  async getById(userId: string): Promise<PlatformUserGetResponse> {
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for getById' });
    }

    const response = await this.get<RawPlatformUser>(IDENTITY_USER_ENDPOINTS.GET_BY_ID(userId));
    return this.toUser(response.data);
  }

  @track('PlatformUsers.UpdateById')
  async updateById(userId: string, update: PlatformUserUpdateOptions): Promise<PlatformUserUpdateResponse> {
    if (!userId) {
      throw new ValidationError({ message: 'userId is required for updateById' });
    }
    if (Object.keys(update).length === 0) {
      throw new ValidationError({ message: 'update must contain at least one field to change' });
    }

    const body = transformRequest(update, PlatformUserMap);
    const response = await this.put<RawPlatformUserUpdateResult>(
      IDENTITY_USER_ENDPOINTS.GET_BY_ID(userId),
      body
    );
    return { success: response.data.succeeded, errors: response.data.errors ?? [] };
  }

  /**
   * Fetches every page of the user listing and returns the combined result.
   */
  private async getAllPages(
    organizationId: string,
    opts: PlatformUserGetAllOptions
  ): Promise<NonPaginatedResponse<PlatformUserGetResponse>> {
    const { searchTerm, sortOrder } = opts;
    // Stable sort keeps record offsets consistent across pages so users are not skipped or duplicated.
    const sortBy = opts.sortBy ?? PlatformUserSortField.Id;
    const usersById = new Map<string, PlatformUserGetResponse>();
    let totalCount = 0;
    let skip = 0;

    for (;;) {
      const response = await this.get<RawPlatformUserListResponse>(
        IDENTITY_USER_ENDPOINTS.GET_ALL(organizationId),
        { params: createParams({ searchTerm, sortBy, sortOrder, top: IDENTITY_MAX_PAGE_SIZE, skip }) }
      );
      const { results, totalCount: reportedTotal } = response.data;
      totalCount = reportedTotal;
      for (const raw of results) {
        const user = this.toUser(raw);
        // Dedupe by id — a record straddling a page boundary must not count twice or hide a real user.
        usersById.set(user.id, user);
      }

      // A short page is terminal for a record offset; the count check stops a full final page early.
      if (results.length < IDENTITY_MAX_PAGE_SIZE || usersById.size >= totalCount) {
        break;
      }
      skip += IDENTITY_MAX_PAGE_SIZE;
    }

    return { items: [...usersById.values()], totalCount };
  }

  /**
   * Transforms a wire user into the public SDK shape: drops internal fields,
   * applies semantic renames, maps numeric type/category codes to enums, and
   * attaches entity methods.
   */
  private toUser(raw: RawPlatformUser): PlatformUserGetResponse {
    const wire: Record<string, unknown> = { ...raw };
    delete wire.legacyId;
    delete wire.bypassBasicAuthRestriction;

    let data = transformData(wire, PlatformUserMap) as Record<string, unknown>;
    data = applyDataTransforms(data, { field: 'type', valueMap: PlatformUserTypeMap });
    data = applyDataTransforms(data, { field: 'category', valueMap: PlatformUserCategoryMap });
    // The API sends null for a user in no groups — normalize so callers always get an array.
    data.groupIds = data.groupIds ?? [];

    return createPlatformUserWithMethods(data as unknown as RawPlatformUserGetResponse, this);
  }
}
