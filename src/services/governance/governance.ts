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

    const data = response.data;
    return {
      totalEvaluations: data.totalEvaluations ?? 0,
      allowedCount: data.allow ?? 0,
      deniedCount: data.deny ?? 0,
      noOpCount: data.noOp ?? 0,
    };
  }
}
