import type {
  PolicyTrace,
  PolicyTraceGetAllOptions,
} from './governance.types';
import type {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../utils/pagination';

/**
 * Service for inspecting governance policy enforcement on the UiPath platform.
 *
 * All methods require the caller to be an organization administrator.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Governance } from '@uipath/uipath-typescript/governance';
 *
 * const governance = new Governance(sdk);
 * const traces = await governance.getPolicyTraces(new Date('2024-01-01'));
 * ```
 */
export interface GovernanceServiceModel {
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
  getPolicyTraces<T extends PolicyTraceGetAllOptions = PolicyTraceGetAllOptions>(
    startTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PolicyTrace>
      : NonPaginatedResponse<PolicyTrace>
  >;
}
