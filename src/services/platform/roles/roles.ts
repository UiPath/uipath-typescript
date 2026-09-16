/**
 * PlatformRoleService — manages roles, role assignments, and effective access
 * (Authorization service).
 */

import { track } from '../../../core/telemetry';
import { ValidationError } from '../../../core/errors';
import type { IUiPath } from '../../../core/types';
import { SDKInternalsRegistry } from '../../../core/internals';
import type { OrganizationIdResolver } from '../../../core/organization/organization-id-resolver';
import { BaseService } from '../../base';

import type {
  RawPlatformRoleGetResponse,
  PlatformRoleGetAllOptions,
  PlatformRoleUpsertOptions,
  PlatformRoleAssignmentGetAllOptions,
  PlatformPrincipalRoleAssignments,
  PlatformRoleAssignmentChanges,
  PlatformEffectiveAccessPrincipal,
  PlatformEffectiveAccessResponse,
  PlatformRoleAction,
  PlatformRoleActionGetAllOptions,
  PlatformEffectiveRole,
  PlatformEffectiveRoleAssignment,
} from '../../../models/platform/roles.types';
import type {
  RawPlatformRole,
  RawPlatformRoleAction,
  RawPlatformRoleListResponse,
  RawPlatformRoleUpsertResult,
  RawPlatformPrincipalRoleAssignments,
  RawPlatformRoleAssignmentListResponse,
  RawPlatformEffectiveAccessResponse,
  RawPlatformEffectiveRole,
  RawPlatformEffectiveRoleAssignment,
} from '../../../models/platform/roles.internal-types';
import type { PlatformRoleServiceModel } from '../../../models/platform/roles.models';
import { PlatformRoleGetResponse, createPlatformRoleWithMethods } from '../../../models/platform/roles.models';
import {
  PlatformRoleMap,
  PlatformRoleTypeMap,
  PlatformPrincipalRoleAssignmentsMap,
  PlatformRoleAssignmentChangesMap,
  PlatformRoleUpsertMap,
  PlatformEffectiveRoleMap,
} from '../../../models/platform/roles.constants';

import { AUTHORIZATION_ENDPOINTS } from '../../../utils/constants/endpoints';
import {
  AUTHORIZATION_PAGINATION,
  AUTHORIZATION_OFFSET_PARAMS,
  AUTHORIZATION_ROLES_MAX_PAGE_SIZE,
  AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE,
} from '../../../utils/constants/common';
import { RESPONSE_TYPES } from '../../../utils/constants/headers';
import { transformData, transformRequest, applyDataTransforms } from '../../../utils/transform';
import { createParams } from '../../../utils/http/params';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../../utils/pagination';

/** The only export format the assignments export endpoint serves. */
const EXPORT_OUTPUT_TYPE_CSV = 'Csv';
/** Effective access is always computed for a tenant scope. */
const EFFECTIVE_ACCESS_SCOPE_TYPE = 'Tenant';

/**
 * Service for managing the organization's roles and role assignments, and for
 * computing a principal's effective access.
 *
 * The organization is resolved by the SDK — no organization parameter travels in
 * these calls.
 */
export class PlatformRoleService extends BaseService implements PlatformRoleServiceModel {
  readonly #organizationIdResolver: OrganizationIdResolver;

  /**
   * Creates an instance of the Roles service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    // The role write body needs the organization GUID; resolved once per SDK instance and shared
    this.#organizationIdResolver = SDKInternalsRegistry.getOrganizationIdResolver(instance);
  }

  @track('PlatformRoles.GetAll')
  async getAll<T extends PlatformRoleGetAllOptions = PlatformRoleGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformRoleGetResponse>
      : NonPaginatedResponse<PlatformRoleGetResponse>
  > {
    const opts = options ?? ({} as T);

    // The API always pages (max top=1000), so without pagination options every
    // page is fetched — a single request would silently truncate.
    if (!PaginationHelpers.hasPaginationParameters(opts)) {
      return this.getAllRolePages(opts) as Promise<
        T extends HasPaginationOptions<T>
          ? PaginatedResponse<PlatformRoleGetResponse>
          : NonPaginatedResponse<PlatformRoleGetResponse>
      >;
    }

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AUTHORIZATION_ENDPOINTS.ROLE.GET_ALL,
      transformFn: (item: RawPlatformRole) => this.toRole(item),
      excludeFromPrefix: Object.keys(opts),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AUTHORIZATION_PAGINATION.ITEMS_FIELD,
        totalCountField: AUTHORIZATION_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AUTHORIZATION_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AUTHORIZATION_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AUTHORIZATION_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
    }, opts) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<PlatformRoleGetResponse>
        : NonPaginatedResponse<PlatformRoleGetResponse>
    >;
  }

  @track('PlatformRoles.GetById')
  async getById(roleId: string): Promise<PlatformRoleGetResponse> {
    if (!roleId) {
      throw new ValidationError({ message: 'roleId is required for getById' });
    }

    return this.fetchRole(roleId);
  }

  @track('PlatformRoles.Upsert')
  async upsert(
    name: string,
    scopeType: string,
    description: string,
    options?: PlatformRoleUpsertOptions
  ): Promise<PlatformRoleGetResponse> {
    if (!name) {
      throw new ValidationError({ message: 'name is required for upsert' });
    }
    if (!scopeType) {
      throw new ValidationError({ message: 'scopeType is required for upsert' });
    }
    if (!description) {
      throw new ValidationError({ message: 'description is required for upsert' });
    }

    const organizationId = await this.#organizationIdResolver.resolve();
    // The write returns only the role ID — follow up with a read so callers
    // get the stored role
    const response = await this.put<RawPlatformRoleUpsertResult>(AUTHORIZATION_ENDPOINTS.ROLE.GET_ALL, {
      ...transformRequest({ name, scopeType, description, ...options }, PlatformRoleUpsertMap),
      organizationId,
    });
    return this.fetchRole(response.data.createdRoleId);
  }

  @track('PlatformRoles.DeleteById')
  async deleteById(roleId: string): Promise<void> {
    if (!roleId) {
      throw new ValidationError({ message: 'roleId is required for deleteById' });
    }

    await this.delete<void>(AUTHORIZATION_ENDPOINTS.ROLE.GET_BY_ID(roleId));
  }

  @track('PlatformRoles.GetAssignments')
  async getAssignments<T extends PlatformRoleAssignmentGetAllOptions = PlatformRoleAssignmentGetAllOptions>(
    scope: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformPrincipalRoleAssignments>
      : NonPaginatedResponse<PlatformPrincipalRoleAssignments>
  > {
    if (!scope) {
      throw new ValidationError({ message: "scope is required for getAssignments — use '/' for the whole organization" });
    }
    const opts = options ?? ({} as T);

    // The API always pages (and rejects top above 10 on this endpoint), so
    // without pagination options every page is fetched — a single request
    // would silently truncate.
    if (!PaginationHelpers.hasPaginationParameters(opts)) {
      return this.getAllAssignmentPages(scope, opts) as Promise<
        T extends HasPaginationOptions<T>
          ? PaginatedResponse<PlatformPrincipalRoleAssignments>
          : NonPaginatedResponse<PlatformPrincipalRoleAssignments>
      >;
    }

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AUTHORIZATION_ENDPOINTS.ROLE_ASSIGNMENT.GET_ALL,
      transformFn: (item: RawPlatformPrincipalRoleAssignments) => this.toPrincipalAssignments(item),
      excludeFromPrefix: [...Object.keys(opts), 'scope'],
      queryParams: createParams({ scope }),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AUTHORIZATION_PAGINATION.ITEMS_FIELD,
        totalCountField: AUTHORIZATION_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AUTHORIZATION_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AUTHORIZATION_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AUTHORIZATION_OFFSET_PARAMS.COUNT_PARAM,
        },
      },
    }, opts) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<PlatformPrincipalRoleAssignments>
        : NonPaginatedResponse<PlatformPrincipalRoleAssignments>
    >;
  }

  @track('PlatformRoles.UpdateAssignments')
  async updateAssignments(changes: PlatformRoleAssignmentChanges): Promise<void> {
    if (!changes || (!changes.toAdd?.length && !changes.toDelete?.length)) {
      throw new ValidationError({ message: 'changes must contain at least one assignment to add or delete' });
    }

    // The API requires both arrays even when one side is empty
    const body = transformRequest(
      { toAdd: changes.toAdd ?? [], toDelete: changes.toDelete ?? [] },
      PlatformRoleAssignmentChangesMap
    );
    await this.patch<void>(AUTHORIZATION_ENDPOINTS.ROLE_ASSIGNMENT.GET_ALL, body);
  }

  @track('PlatformRoles.ExportAssignments')
  async exportAssignments(): Promise<string> {
    // The endpoint streams CSV — request it as a blob so the client does not
    // attempt JSON parsing
    const response = await this.get<Blob>(AUTHORIZATION_ENDPOINTS.ROLE_ASSIGNMENT.EXPORT, {
      params: { exportOutputType: EXPORT_OUTPUT_TYPE_CSV },
      responseType: RESPONSE_TYPES.BLOB,
    });
    return response.data.text();
  }

  @track('PlatformRoles.GetEffectiveAccess')
  async getEffectiveAccess(
    tenantId: string,
    principal: PlatformEffectiveAccessPrincipal
  ): Promise<PlatformEffectiveAccessResponse> {
    if (!tenantId) {
      throw new ValidationError({ message: 'tenantId is required for getEffectiveAccess' });
    }
    if (!principal?.userId && !principal?.groupId) {
      throw new ValidationError({ message: 'one of userId or groupId is required for getEffectiveAccess' });
    }
    if (principal.userId && principal.groupId) {
      throw new ValidationError({ message: 'provide only one of userId or groupId for getEffectiveAccess' });
    }

    const body = {
      scopeIdentifier: {
        scopeType: EFFECTIVE_ACCESS_SCOPE_TYPE,
        value: { id: tenantId, tenantId },
      },
      ...(principal.userId !== undefined && { userId: principal.userId }),
      ...(principal.groupId !== undefined && { groupId: principal.groupId }),
    };
    const response = await this.post<RawPlatformEffectiveAccessResponse>(
      AUTHORIZATION_ENDPOINTS.EFFECTIVE_ACCESS,
      body
    );

    const { roleAssignments, grantedServicesMetadata, grantedRolesMetadata } = response.data;
    return {
      roles: (roleAssignments?.results ?? []).map(role => this.toEffectiveRole(role)),
      totalCount: roleAssignments?.totalCount ?? 0,
      grantedServices: grantedServicesMetadata ?? [],
      grantedRoles: grantedRolesMetadata ?? [],
    };
  }

  @track('PlatformRoles.GetActions')
  async getActions(options?: PlatformRoleActionGetAllOptions): Promise<PlatformRoleAction[]> {
    const response = await this.get<RawPlatformRoleAction[]>(AUTHORIZATION_ENDPOINTS.ACTIONS, {
      params: createParams({ serviceName: options?.serviceName, scopeType: options?.scopeType }),
    });
    return response.data.map(action => this.toAction(action));
  }

  /**
   * Fetches one role and transforms it — shared by `getById` and `upsert` so
   * both stay singly tracked.
   */
  private async fetchRole(roleId: string): Promise<PlatformRoleGetResponse> {
    const response = await this.get<RawPlatformRole>(AUTHORIZATION_ENDPOINTS.ROLE.GET_BY_ID(roleId));
    return this.toRole(response.data);
  }

  /**
   * Fetches every page of the role listing and returns the combined result.
   */
  private async getAllRolePages(
    opts: PlatformRoleGetAllOptions
  ): Promise<NonPaginatedResponse<PlatformRoleGetResponse>> {
    const { scopeType, serviceName, contains, tenantId, roleType } = opts;
    const items: PlatformRoleGetResponse[] = [];
    let totalCount = 0;
    let skip = 0;

    for (;;) {
      const response = await this.get<RawPlatformRoleListResponse>(AUTHORIZATION_ENDPOINTS.ROLE.GET_ALL, {
        params: createParams({ scopeType, serviceName, contains, tenantId, roleType, top: AUTHORIZATION_ROLES_MAX_PAGE_SIZE, skip }),
      });
      const { results, totalCount: reportedTotal } = response.data;
      totalCount = reportedTotal;
      items.push(...results.map(role => this.toRole(role)));

      if (results.length === 0 || items.length >= totalCount) {
        break;
      }
      // Advance by what was actually returned — a short non-final page must not skip records
      skip += results.length;
    }

    return { items, totalCount };
  }

  /**
   * Fetches every page of the assignments listing and returns the combined result.
   */
  private async getAllAssignmentPages(
    scope: string,
    opts: PlatformRoleAssignmentGetAllOptions
  ): Promise<NonPaginatedResponse<PlatformPrincipalRoleAssignments>> {
    const { serviceName, securityPrincipalId, noInheritance } = opts;
    const items: PlatformPrincipalRoleAssignments[] = [];
    let totalCount = 0;
    let skip = 0;

    for (;;) {
      const response = await this.get<RawPlatformRoleAssignmentListResponse>(
        AUTHORIZATION_ENDPOINTS.ROLE_ASSIGNMENT.GET_ALL,
        {
          params: {
            ...createParams({ scope, serviceName, securityPrincipalId, noInheritance, top: AUTHORIZATION_ASSIGNMENTS_MAX_PAGE_SIZE, skip }),
            ...(opts.roleIds !== undefined && { roleIds: opts.roleIds }),
          },
        }
      );
      const { results, totalCount: reportedTotal } = response.data;
      totalCount = reportedTotal;
      items.push(...results.map(group => this.toPrincipalAssignments(group)));

      if (results.length === 0 || items.length >= totalCount) {
        break;
      }
      // Advance by what was actually returned — a short non-final page must not skip records
      skip += results.length;
    }

    return { items, totalCount };
  }

  /**
   * Transforms a wire role: applies the `createdOn` → `createdTime` rename,
   * drops internal action fields, and attaches entity methods.
   */
  private toRole(raw: RawPlatformRole): PlatformRoleGetResponse {
    const wire: Record<string, unknown> = {
      ...raw,
      actionDetails: (raw.actionDetails ?? []).map(action => this.toAction(action)),
    };

    const typed = transformData(wire, PlatformRoleMap) as unknown as RawPlatformRoleGetResponse;
    const data = applyDataTransforms(typed, { field: 'type', valueMap: PlatformRoleTypeMap });

    return createPlatformRoleWithMethods(data, this);
  }

  /**
   * Transforms a wire action definition: drops the internal
   * `originalResourceAction` field.
   */
  private toAction(raw: RawPlatformRoleAction): PlatformRoleAction {
    const { originalResourceAction: _originalResourceAction, ...action } = raw;
    return action;
  }

  /**
   * Transforms one principal's wire assignment group: renames
   * `roleAssignmentDtos` to `roleAssignments`, applies the timestamp rename to
   * each assignment, and normalizes both type fields to the enum.
   */
  private toPrincipalAssignments(raw: RawPlatformPrincipalRoleAssignments): PlatformPrincipalRoleAssignments {
    const wire: Record<string, unknown> = {
      ...raw,
      roleAssignmentDtos: (raw.roleAssignmentDtos ?? []).map(assignment => {
        const renamed = transformData({ ...assignment }, PlatformRoleMap);
        const withRoleType = applyDataTransforms(renamed, { field: 'roleType', valueMap: PlatformRoleTypeMap });
        return applyDataTransforms(withRoleType, { field: 'type', valueMap: PlatformRoleTypeMap });
      }),
    };

    return transformData(wire, PlatformPrincipalRoleAssignmentsMap) as unknown as PlatformPrincipalRoleAssignments;
  }

  /**
   * Transforms one wire effective-role group: normalizes the role type, renames
   * the nested assignment list to `assignments`, and transforms each entry.
   */
  private toEffectiveRole(raw: RawPlatformEffectiveRole): PlatformEffectiveRole {
    const wire: Record<string, unknown> = {
      ...applyDataTransforms({ ...raw }, { field: 'roleType', valueMap: PlatformRoleTypeMap }),
      roleAssignments: (raw.roleAssignments ?? []).map(assignment => this.toEffectiveAssignment(assignment)),
    };
    return transformData(wire, PlatformEffectiveRoleMap) as unknown as PlatformEffectiveRole;
  }

  /**
   * Transforms one wire effective-access assignment: normalizes the role type
   * and applies the timestamp rename.
   */
  private toEffectiveAssignment(raw: RawPlatformEffectiveRoleAssignment): PlatformEffectiveRoleAssignment {
    const normalized = applyDataTransforms({ ...raw }, { field: 'roleType', valueMap: PlatformRoleTypeMap });
    return transformData(normalized, PlatformRoleMap) as unknown as PlatformEffectiveRoleAssignment;
  }
}
