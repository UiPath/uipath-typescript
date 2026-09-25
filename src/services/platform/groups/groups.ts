/**
 * PlatformGroupService — manages an organization's local and built-in groups.
 */

import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import type { IUiPath } from '../../../core/types';
import { SDKInternalsRegistry } from '../../../core/internals';
import type { OrganizationIdResolver } from '../../../core/organization/organization-id-resolver';
import { BaseService } from '../../base';

import type {
  RawPlatformGroupGetResponse,
  PlatformGroupCreateOptions,
  PlatformGroupUpdateOptions,
  PlatformGroupMember,
} from '../../../models/platform/groups.types';
import type {
  RawPlatformGroup,
  RawPlatformGroupMember,
  RawPlatformGroupMembersResponse,
} from '../../../models/platform/groups.internal-types';
import type { PlatformGroupServiceModel } from '../../../models/platform/groups.models';
import { PlatformGroupGetResponse, createPlatformGroupWithMethods } from '../../../models/platform/groups.models';
import {
  PlatformGroupMap,
  PlatformGroupTypeMap,
} from '../../../models/platform/groups.constants';
import { PlatformUserTypeMap } from '../../../models/platform/users.constants';

import { IDENTITY_GROUP_ENDPOINTS } from '../../../utils/constants/endpoints';
import { IDENTITY_PAGINATION, IDENTITY_OFFSET_PARAMS, IDENTITY_MAX_PAGE_SIZE } from '../../../utils/constants/common';
import { transformData, transformRequest, applyDataTransforms } from '../../../utils/transform';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
  PaginationOptions,
} from '../../../utils/pagination';

/**
 * Service for managing an organization's groups.
 *
 * Groups are organization-scoped containers of users. Together with users they form
 * the basis of access management: put users in groups, then grant roles to the groups.
 */
export class PlatformGroupService extends BaseService implements PlatformGroupServiceModel {
  readonly #organizationIdResolver: OrganizationIdResolver;

  /**
   * Creates an instance of the Groups service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    // Identity keys on the organization GUID; resolved once per SDK instance and shared
    this.#organizationIdResolver = SDKInternalsRegistry.getOrganizationIdResolver(instance);
  }

  @track('PlatformGroups.GetAll')
  async getAll(): Promise<PlatformGroupGetResponse[]> {
    const organizationId = await this.#organizationIdResolver.resolve();

    const response = await this.get<RawPlatformGroup[]>(IDENTITY_GROUP_ENDPOINTS.GET_ALL(organizationId));
    return response.data.map(group => this.toGroup(group));
  }

  @track('PlatformGroups.GetById')
  async getById(groupId: string): Promise<PlatformGroupGetResponse> {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for getById' });
    }
    const organizationId = await this.#organizationIdResolver.resolve();

    return this.fetchGroup(organizationId, groupId);
  }

  @track('PlatformGroups.Create')
  async create(name: string, options?: PlatformGroupCreateOptions): Promise<PlatformGroupGetResponse> {
    if (!name) {
      throw new ValidationError({ message: 'name is required for create' });
    }
    const organizationId = await this.#organizationIdResolver.resolve();

    const body = {
      partitionGlobalId: organizationId,
      // The API rejects requests without a client-generated group ID
      id: crypto.randomUUID(),
      name,
      ...transformRequest(options ?? {}, PlatformGroupMap),
    };
    const response = await this.post<RawPlatformGroup>(IDENTITY_GROUP_ENDPOINTS.CREATE, body);
    return this.toGroup(response.data);
  }

  @track('PlatformGroups.UpdateById')
  async updateById(groupId: string, update: PlatformGroupUpdateOptions): Promise<PlatformGroupGetResponse> {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for updateById' });
    }
    if (!update || Object.keys(update).length === 0) {
      throw new ValidationError({ message: 'update must contain at least one field to change' });
    }
    const organizationId = await this.#organizationIdResolver.resolve();

    // The API requires the name on every update, even for pure membership edits —
    // read the current group so callers can omit it
    const { name, ...membership } = update;
    const current = name === undefined ? await this.fetchGroup(organizationId, groupId) : undefined;
    const body = {
      partitionGlobalId: organizationId,
      name: name ?? current?.name,
      ...transformRequest(membership, PlatformGroupMap),
    };
    const response = await this.put<RawPlatformGroup>(IDENTITY_GROUP_ENDPOINTS.UPDATE(groupId), body);
    return this.toGroup(response.data);
  }

  @track('PlatformGroups.DeleteById')
  async deleteById(groupId: string): Promise<void> {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for deleteById' });
    }
    const organizationId = await this.#organizationIdResolver.resolve();

    await this.delete<void>(IDENTITY_GROUP_ENDPOINTS.GET_BY_ID(organizationId, groupId));
  }

  @track('PlatformGroups.GetMembers')
  async getMembers<T extends PaginationOptions = PaginationOptions>(
    groupId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformGroupMember>
      : NonPaginatedResponse<PlatformGroupMember>
  > {
    if (!groupId) {
      throw new ValidationError({ message: 'groupId is required for getMembers' });
    }
    const organizationId = await this.#organizationIdResolver.resolve();
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
   * Fetches one group and transforms it — shared by `getById` and `updateById`.
   */
  private async fetchGroup(organizationId: string, groupId: string): Promise<PlatformGroupGetResponse> {
    const response = await this.get<RawPlatformGroup>(IDENTITY_GROUP_ENDPOINTS.GET_BY_ID(organizationId, groupId));
    return this.toGroup(response.data);
  }

  /**
   * Fetches every page of the group members listing and returns the combined result.
   */
  private async getAllMemberPages(
    groupId: string,
    organizationId: string
  ): Promise<NonPaginatedResponse<PlatformGroupMember>> {
    const membersById = new Map<string, PlatformGroupMember>();
    let totalCount = 0;
    let skip = 0;

    for (;;) {
      const response = await this.get<RawPlatformGroupMembersResponse>(
        IDENTITY_GROUP_ENDPOINTS.MEMBERS(organizationId, groupId),
        { params: { top: IDENTITY_MAX_PAGE_SIZE, skip } }
      );
      const { results, totalCount: reportedTotal } = response.data;
      totalCount = reportedTotal;
      for (const raw of results) {
        const member = this.toMember(raw);
        // Dedupe by id — a record straddling a page boundary must not count twice or hide a real member.
        membersById.set(member.id, member);
      }

      // A short page is terminal for a record offset; the count check stops a full final page early.
      if (results.length < IDENTITY_MAX_PAGE_SIZE || membersById.size >= totalCount) {
        break;
      }
      skip += IDENTITY_MAX_PAGE_SIZE;
    }

    return { items: [...membersById.values()], totalCount };
  }

  /**
   * Transforms a wire group into the public SDK shape: drops internal fields,
   * applies semantic renames, maps numeric type codes to the enum, and attaches
   * entity methods.
   */
  private toGroup(raw: RawPlatformGroup): PlatformGroupGetResponse {
    const wire: Record<string, unknown> = { ...raw };
    // `members` is present but always empty — membership is served by getMembers();
    // `mappedRole`/`scope` are undocumented internals.
    delete wire.members;
    delete wire.mappedRole;
    delete wire.scope;

    let data = transformData(wire, PlatformGroupMap) as Record<string, unknown>;
    data = applyDataTransforms(data, { field: 'type', valueMap: PlatformGroupTypeMap });

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
