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
import {
  PolicyTrace,
  PolicyTraceGetAllOptions,
} from '../../models/governance/governance.types';
import { GovernanceServiceModel } from '../../models/governance/governance.models';

/**
 * Service for inspecting governance policy enforcement on the UiPath platform.
 */
export class GovernanceService extends BaseService implements GovernanceServiceModel {
  /**
   * Gets per-policy enforcement decisions across the requested time range.
   *
   * Returns the detailed audit log of every policy check — who did what, 
   * when it happened, which policy was applied, and whether that policy 
   * allowed or blocked the action.
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

    const apiOptions = {
      ...options,
      startTime: startTime.toISOString(),
      endTime: options?.endTime?.toISOString(),
    };

    return PaginationHelpers.getAll<typeof apiOptions, PolicyTrace>({
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
        ? PaginatedResponse<PolicyTrace>
        : NonPaginatedResponse<PolicyTrace>
    >;
  }
}
