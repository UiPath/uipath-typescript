/**
 * PlatformGroupService — manages an organization's local and built-in groups.
 */

import { track } from '../../core/telemetry';
import { ValidationError } from '../../core/errors';
import { BaseService } from '../base';

import type {
  RawPlatformGroupGetResponse,
  PlatformGroupCreateOptions,
  PlatformGroupMembershipOptions,
  PlatformGroupMember,
} from '../../models/platform/groups.types';
import type {
  RawPlatformGroup,
  RawPlatformGroupMember,
  RawPlatformGroupMembersResponse,
} from '../../models/platform/groups.internal-types';
import type { PlatformGroupServiceModel } from '../../models/platform/groups.models';
import { PlatformGroupGetResponse, createPlatformGroupWithMethods } from '../../models/platform/groups.models';
import {
  PlatformGroupMap,
  PlatformGroupCreateMap,
  PlatformGroupUpdateMap,
  PlatformGroupTypeMap,
} from '../../models/platform/groups.constants';
import { PlatformUserTypeMap } from '../../models/platform/users.constants';

import { IDENTITY_GROUP_ENDPOINTS } from '../../utils/constants/endpoints';
import { IDENTITY_PAGINATION, IDENTITY_OFFSET_PARAMS, IDENTITY_MAX_PAGE_SIZE } from '../../utils/constants/common';
import { transformData, transformRequest, applyDataTransforms } from '../../utils/transform';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
  PaginationOptions,
} from '../../utils/pagination';

/**
 * Service for managing an organization's groups.
 *
 * Groups are organization-scoped containers of users. Together with users they form
 * the basis of access management: put users in groups, then grant roles to the groups.
 */
export class PlatformGroupService extends BaseService implements PlatformGroupServiceModel {
  @track('PlatformGroups.GetAll')
  async getAll(organizationId: string): Promise<PlatformGroupGetResponse[]> {
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for getAll' });
    }

    const response = await this.get<RawPlatformGroup[]>(IDENTITY_GROUP_ENDPOINTS.GET_ALL(organizationId));
    return response.data.map(group => this.toGroup(group, organizationId));
  }

  @track('PlatformGroups.GetById')
  async getById(groupId: string, organizationId: string): Promise<PlatformGroupGetResponse> {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for getById' });
    }
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for getById' });
    }

    const response = await this.get<RawPlatformGroup>(
      IDENTITY_GROUP_ENDPOINTS.GET_BY_ID(organizationId, groupId)
    );
    return this.toGroup(response.data, organizationId);
  }

  @track('PlatformGroups.Create')
  async create(
    name: string,
    organizationId: string,
    options?: PlatformGroupCreateOptions
  ): Promise<PlatformGroupGetResponse> {
    if (!name) {
      throw new ValidationError({ message: 'name is required for create' });
    }
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for create' });
    }

    const body = {
      partitionGlobalId: organizationId,
      // The API rejects requests without a client-generated group ID
      id: crypto.randomUUID(),
      name,
      ...transformRequest(options ?? {}, PlatformGroupCreateMap),
    };
    const response = await this.post<RawPlatformGroup>(IDENTITY_GROUP_ENDPOINTS.CREATE, body);
    return this.toGroup(response.data, organizationId);
  }

  @track('PlatformGroups.UpdateById')
  async updateById(
    groupId: string,
    organizationId: string,
    name: string,
    options?: PlatformGroupMembershipOptions
  ): Promise<PlatformGroupGetResponse> {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for updateById' });
    }
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for updateById' });
    }
    // The API rejects updates without a name — it is required even for pure membership edits
    if (!name) {
      throw new ValidationError({ message: 'name is required for updateById' });
    }

    const body = {
      partitionGlobalId: organizationId,
      name,
      ...transformRequest(options ?? {}, PlatformGroupUpdateMap),
    };
    const response = await this.put<RawPlatformGroup>(IDENTITY_GROUP_ENDPOINTS.UPDATE(groupId), body);
    return this.toGroup(response.data, organizationId);
  }

  @track('PlatformGroups.DeleteById')
  async deleteById(groupId: string, organizationId: string): Promise<void> {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for deleteById' });
    }
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for deleteById' });
    }

    await this.delete<void>(IDENTITY_GROUP_ENDPOINTS.GET_BY_ID(organizationId, groupId));
  }

  @track('PlatformGroups.GetMembers')
  async getMembers<T extends PaginationOptions = PaginationOptions>(
    groupId: string,
    organizationId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformGroupMember>
      : NonPaginatedResponse<PlatformGroupMember>
  > {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for getMembers' });
    }
    if (!organizationId) {
      throw new ValidationError({ message: 'organizationId is required for getMembers' });
    }
    const opts = options ?? ({} as T);

    // The API always pages (default page size 10, max 1000), so without pagination
    // options every page is fetched — a single request would silently truncate.
    const hasPaginationOptions =
      opts.pageSize !== undefined || opts.cursor !== undefined || opts.jumpToPage !== undefined;
    if (!hasPaginationOptions) {
      return this.getAllMemberPages(groupId, organizationId) as Promise<
        T extends HasPaginationOptions<T>
          ? PaginatedResponse<PlatformGroupMember>
          : NonPaginatedResponse<PlatformGroupMember>
      >;
    }

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => IDENTITY_GROUP_ENDPOINTS.MEMBERS(organizationId, groupId),
      transformFn: (item: RawPlatformGroupMember) => this.toMember(item),
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
        ? PaginatedResponse<PlatformGroupMember>
        : NonPaginatedResponse<PlatformGroupMember>
    >;
  }

  /**
   * Fetches every page of the group members listing and returns the combined result.
   */
  private async getAllMemberPages(
    groupId: string,
    organizationId: string
  ): Promise<NonPaginatedResponse<PlatformGroupMember>> {
    const items: PlatformGroupMember[] = [];
    let totalCount = 0;
    let skip = 0;

    for (;;) {
      const response = await this.get<RawPlatformGroupMembersResponse>(
        IDENTITY_GROUP_ENDPOINTS.MEMBERS(organizationId, groupId),
        { params: { top: IDENTITY_MAX_PAGE_SIZE, skip } }
      );
      const { results, totalCount: reportedTotal } = response.data;
      totalCount = reportedTotal;
      items.push(...results.map(member => this.toMember(member)));

      if (results.length === 0 || items.length >= totalCount) {
        break;
      }
      // Advance by what was actually returned — a short non-final page must not skip records
      skip += results.length;
    }

    return { items, totalCount };
  }

  /**
   * Transforms a wire group into the public SDK shape: drops internal fields,
   * applies semantic renames, maps numeric type codes to the enum, adds the
   * organization scope, and attaches entity methods.
   */
  private toGroup(raw: RawPlatformGroup, organizationId: string): PlatformGroupGetResponse {
    const wire: Record<string, unknown> = { ...raw };
    // `members` is present but always empty — membership is served by getMembers();
    // `mappedRole`/`scope` are undocumented internals.
    delete wire.members;
    delete wire.mappedRole;
    delete wire.scope;

    let data = transformData(wire, PlatformGroupMap) as Record<string, unknown>;
    data = applyDataTransforms(data, { field: 'type', valueMap: PlatformGroupTypeMap });
    data.organizationId = organizationId;

    return createPlatformGroupWithMethods(data as unknown as RawPlatformGroupGetResponse, this);
  }

  /**
   * Transforms a wire member reference: maps the numeric account type code to
   * the {@link PlatformUserType} enum.
   */
  private toMember(raw: RawPlatformGroupMember): PlatformGroupMember {
    const wire: Record<string, unknown> = { ...raw };
    const data = applyDataTransforms(wire, { field: 'type', valueMap: PlatformUserTypeMap });
    // Same rationale as the transformData() pipeline exception: applyDataTransforms
    // operates on an untyped record, and unknown codes pass through untouched.
    return data as unknown as PlatformGroupMember;
  }
}
