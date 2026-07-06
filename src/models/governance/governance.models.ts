import type {
  GovernancePolicyTrace,
  GovernancePolicyTraceGetAllOptions,
  GovernanceFilterOptions,
  GovernanceOperationSummary,
} from './governance.types';
import type {
  PaginatedResponse,
  NonPaginatedResponse,
  HasPaginationOptions,
} from '../../utils/pagination';

/**
 *
 * @experimental
 *
 * /// warning
 * Preview: This service is experimental and may change or be removed in future releases.
 * ///
 *
 * Service for inspecting governance policy enforcement on the UiPath platform.
 *
 * See [Define governance policies](https://docs.uipath.com/automation-ops/automation-cloud/latest/user-guide/define-governance-policies)
 * for how governance policies are configured in Automation Ops.
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
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
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
  getPolicyTraces<T extends GovernancePolicyTraceGetAllOptions = GovernancePolicyTraceGetAllOptions>(
    startTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<GovernancePolicyTrace>
      : NonPaginatedResponse<GovernancePolicyTrace>
  >;

  /**
   *
   * @experimental
   *
   * /// warning
   * Preview: This method is experimental and may change or be removed in future releases.
   * ///
   *
   * Gets aggregate governance enforcement counts across the requested time range.
   *
   * Returns the total number of evaluations along with how many resolved to
   * `Allow`, `Deny`, or `NoOp`.
   *
   * @param startTime - Inclusive lower bound on the evaluation time.
   * @param options - Optional `endTime` upper bound and `fullOrganization` flag
   * @returns Promise resolving to {@link GovernanceOperationSummary}
   *
   * @example
   * ```typescript
   * import { Governance } from '@uipath/uipath-typescript/governance';
   *
   * const governance = new Governance(sdk);
   *
   * // Get operation summary from the specified start time to right now
   * const summary = await governance.getOperationSummary(new Date('2024-01-01'));
   * console.log(summary.totalEvaluations, summary.allowedCount, summary.deniedCount, summary.noOpCount);
   *
   * // Bounded range across the whole organization
   * const ranged = await governance.getOperationSummary(
   *   new Date('2024-01-01'),
   *   { endTime: new Date(), fullOrganization: true },
   * );
   * ```
   */
  getOperationSummary(
    startTime: Date,
    options?: GovernanceFilterOptions,
  ): Promise<GovernanceOperationSummary>;
}
