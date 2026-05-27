import { BaseService } from '../base';
import { ValidationError } from '../../core/errors';
import { GOVERNANCE_ENDPOINTS } from '../../utils/constants/endpoints';
import { filterUndefined } from '../../utils/object';
import { track } from '../../core/telemetry';
import {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationManager } from '../../utils/pagination/pagination-manager';
import { PaginationType } from '../../utils/pagination/internal-types';
import { getLimitedPageSize } from '../../utils/pagination/constants';
import {
  PolicyTrace,
  PolicyTraceGetAllOptions,
} from '../../models/governance/governance.types';
import { GovernanceServiceModel } from '../../models/governance/governance.models';
import { RawPolicyTracesResponse } from '../../models/governance/governance.internal-types';

/**
 * Service for inspecting governance policy enforcement on the UiPath platform.
 */
export class GovernanceService extends BaseService implements GovernanceServiceModel {
  /**
   * Gets per-policy enforcement decisions across the requested time range.
   *
   * Returns one row per policy evaluated within each governance enforcement
   * event. Results are ordered by `startTime` descending; pagination is
   * page-number based with no server-provided total count, so `hasNextPage`
   * is inferred from whether the current page is full.
   *
   * @param startTime - Inclusive lower bound on the trace start time. Required.
   * @param options - Optional filters and pagination options
   * @returns Promise resolving to {@link NonPaginatedResponse} of {@link PolicyTrace}
   *          without pagination options, or {@link PaginatedResponse} of
   *          {@link PolicyTrace} when pagination options are used.
   *
   * @example
   * ```typescript
   * import { Governance, PolicyEvaluationResult } from '@uipath/uipath-typescript/governance';
   *
   * const governance = new Governance(sdk);
   *
   * // Bare minimum — fetch using only the required start time
   * const recent = await governance.getPolicyTraces(new Date('2024-01-01'));
   * console.log(recent.items.length);
   *
   * // Filter denied decisions across the whole organization, paginated
   * const page1 = await governance.getPolicyTraces(
   *   new Date('2024-01-01'),
   *   {
   *     endTime: new Date(),
   *     evaluationResult: [PolicyEvaluationResult.Deny, PolicyEvaluationResult.SimulatedDeny],
   *     fullOrganization: true,
   *     pageSize: 25,
   *   },
   * );
   *
   * if (page1.hasNextPage) {
   *   const page2 = await governance.getPolicyTraces(
   *     new Date('2024-01-01'),
   *     { cursor: page1.nextCursor },
   *   );
   * }
   * ```
   */
  @track('Governance.GetPolicyTraces')
  async getPolicyTraces<T extends PolicyTraceGetAllOptions = PolicyTraceGetAllOptions>(
    startTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PolicyTrace>
      : NonPaginatedResponse<PolicyTrace>
  > {
    if (!startTime) {
      throw new ValidationError({ message: 'startTime is required for getPolicyTraces' });
    }

    const isPaginated = !!(options?.cursor || options?.pageSize !== undefined || options?.jumpToPage !== undefined);

    let currentPage = 1;
    let pageSize: number | undefined = options?.pageSize;

    if (options?.cursor) {
      const cursorData = PaginationHelpers.parseCursor(options.cursor.value);
      if (cursorData.type !== PaginationType.OFFSET) {
        throw new ValidationError({
          message: `Pagination type mismatch: cursor is for ${cursorData.type} but service uses ${PaginationType.OFFSET}`,
        });
      }
      currentPage = cursorData.pageNumber ?? 1;
      pageSize = cursorData.pageSize ?? pageSize;
    } else if (options?.jumpToPage !== undefined) {
      if (options.jumpToPage <= 0) {
        throw new ValidationError({ message: 'jumpToPage must be a positive number' });
      }
      currentPage = options.jumpToPage;
    }

    if (pageSize !== undefined && pageSize <= 0) {
      throw new ValidationError({ message: 'pageSize must be a positive number' });
    }

    const limitedPageSize = isPaginated ? getLimitedPageSize(pageSize) : undefined;

    const body = filterUndefined({
      startTime: startTime.toISOString(),
      endTime: options?.endTime?.toISOString(),
      evaluationResult: options?.evaluationResult,
      policyId: options?.policyId,
      actorProcessId: options?.actorProcessId,
      actorProcessType: options?.actorProcessType,
      actorIdentityId: options?.actorIdentityId,
      resourceId: options?.resourceId,
      resourceType: options?.resourceType,
      traceId: options?.traceId,
      fullOrganization: options?.fullOrganization,
      pageNumber: isPaginated ? currentPage - 1 : undefined,
      pageSize: limitedPageSize,
    });

    const response = await this.post<RawPolicyTracesResponse>(
      GOVERNANCE_ENDPOINTS.POLICY.TRACES,
      body,
    );

    // API returns camelCase keys directly — no case transform needed.
    const items = (response.data?.items ?? []) as PolicyTrace[];

    if (!isPaginated) {
      return { items } as T extends HasPaginationOptions<T>
        ? PaginatedResponse<PolicyTrace>
        : NonPaginatedResponse<PolicyTrace>;
    }

    // The API does not return a total count or continuation token. A full page
    // implies more rows may exist; a partial page is definitely the last page.
    const hasMore = limitedPageSize !== undefined && items.length === limitedPageSize;

    return PaginationManager.createPaginatedResponse<PolicyTrace>(
      {
        pageInfo: {
          hasMore,
          currentPage,
          pageSize: limitedPageSize,
        },
        type: PaginationType.OFFSET,
      },
      items,
    ) as T extends HasPaginationOptions<T>
      ? PaginatedResponse<PolicyTrace>
      : NonPaginatedResponse<PolicyTrace>;
  }
}
