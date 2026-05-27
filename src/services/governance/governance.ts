import { BaseService } from '../base';
import { ValidationError } from '../../core/errors';
import { GOVERNANCE_ENDPOINTS } from '../../utils/constants/endpoints';
import {
  HTTP_METHODS,
  GOVERNANCE_PAGINATION,
  GOVERNANCE_OFFSET_PARAMS,
} from '../../utils/constants/common';
import { track } from '../../core/telemetry';
import {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import { filterUndefined } from '../../utils/object';
import {
  GovernancePolicyTrace,
  GovernancePolicyTraceGetAllOptions,
  GovernanceFilterOptions,
  GovernanceOperationSummary,
} from '../../models/governance/governance.types';
import { GovernanceServiceModel } from '../../models/governance/governance.models';
import {
  RawGovernanceOperationSummaryResponse,
} from '../../models/governance/governance.internal-types';

/**
 * Service for inspecting governance policy enforcement on the UiPath platform.
 */
export class GovernanceService extends BaseService implements GovernanceServiceModel {
  /**
   * Gets per-policy enforcement decisions across the requested time range.
   *
   * Each result row represents one policy's verdict within a single governance enforcement event.
   * A single user action can produce multiple rows when multiple policies were consulted.
   * Results are ordered by event start time, descending.
   *
   * @param startTime - Inclusive lower bound on the trace start time.
   * @param options - Optional filters and pagination options
   * @returns Promise resolving to {@link NonPaginatedResponse} of {@link GovernancePolicyTrace}
   *          without pagination options, or {@link PaginatedResponse} of
   *          {@link GovernancePolicyTrace} when pagination options are used.
   *
   * @example
   * ```typescript
   * import { Governance, PolicyEvaluationResult } from '@uipath/uipath-typescript/governance';
   *
   * const governance = new Governance(sdk);
   *
   * // Get all policy traces from the specified start time
   * const recent = await governance.getPolicyTraces(new Date('2024-01-01'));
   * console.log(recent.items.length);
   *
   * // Get all denied decisions across the whole organization
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
  async getPolicyTraces<T extends GovernancePolicyTraceGetAllOptions = GovernancePolicyTraceGetAllOptions>(
    startTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<GovernancePolicyTrace>
      : NonPaginatedResponse<GovernancePolicyTrace>
  > {
    if (!startTime) {
      throw new ValidationError({ message: 'startTime is required for getPolicyTraces' });
    }

    const apiOptions = {
      ...options,
      startTime: startTime.toISOString(),
      endTime: options?.endTime?.toISOString(),
    };

    return PaginationHelpers.getAll<typeof apiOptions, GovernancePolicyTrace>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => GOVERNANCE_ENDPOINTS.POLICY.TRACES,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: GOVERNANCE_PAGINATION.ITEMS_FIELD,
        paginationParams: {
          pageSizeParam: GOVERNANCE_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: GOVERNANCE_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: GOVERNANCE_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
          zeroBased: true,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<GovernancePolicyTrace>
        : NonPaginatedResponse<GovernancePolicyTrace>
    >;
  }

  /**
   * Gets aggregate governance enforcement counts across the requested time range.
   *
   * Returns the total number of governance enforcement evaluations along with
   * how many resolved to `Allow`, `Deny`, or `NoOp`. Counts reflect one row per
   * AuthZ enforcement verdict, regardless of how many underlying policies fed
   * into each verdict.
   *
   * @param startTime - Inclusive lower bound on the evaluation time. Required.
   * @param options - Optional `endTime` upper bound and `fullOrganization` flag
   * @returns Promise resolving to {@link GovernanceOperationSummary}
   *
   * @example
   * ```typescript
   * import { Governance } from '@uipath/uipath-typescript/governance';
   *
   * const governance = new Governance(sdk);
   *
   * // Bare minimum — counts from the given start time onward
   * const summary = await governance.getOperationSummary(new Date('2024-01-01'));
   * console.log(summary.totalEvaluations, summary.allow, summary.deny, summary.noOp);
   *
   * // Bounded range across the whole organization
   * const ranged = await governance.getOperationSummary(
   *   new Date('2024-01-01'),
   *   { endTime: new Date(), fullOrganization: true },
   * );
   * ```
   */
  @track('Governance.GetOperationSummary')
  async getOperationSummary(
    startTime: Date,
    options?: GovernanceFilterOptions,
  ): Promise<GovernanceOperationSummary> {
    if (!startTime) {
      throw new ValidationError({ message: 'startTime is required for getOperationSummary' });
    }

    const body = filterUndefined({
      startTime: startTime.toISOString(),
      endTime: options?.endTime?.toISOString(),
      fullOrganization: options?.fullOrganization,
    });

    const response = await this.post<RawGovernanceOperationSummaryResponse>(
      GOVERNANCE_ENDPOINTS.OPERATION.SUMMARY,
      body,
    );

    // API returns camelCase keys directly. Error bodies (401/403/429) can omit
    // counts, so coalesce each to 0 for a stable numeric contract.
    const data = response.data;
    return {
      totalEvaluations: data?.totalEvaluations ?? 0,
      allow: data?.allow ?? 0,
      deny: data?.deny ?? 0,
      noOp: data?.noOp ?? 0,
    };
  }
}
