import {
  AgentTraceGetErrorsTimelineOptions,
  AgentTraceGetErrorsTimelineResponse,
  AgentTraceGetLatencyTimelineOptions,
  AgentTraceGetLatencyTimelineResponse,
  AgentTraceGetUnitConsumptionOptions,
  AgentTraceGetUnitConsumptionResponse,
  AgentSpanGetResponse,
  AgentTraceGetSpansByReferenceOptions,
  AgentGovernanceDecisionGetResponse,
  AgentGovernanceDecisionsOptions,
  AgentGovernanceGetSummaryResponse,
  AgentGovernanceSummaryOptions,
} from './agent.types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../../../utils/pagination/types';

/**
 * Service for retrieving UiPath Agent trace metrics.
 */
export interface AgentTracesServiceModel {
  /**
   * Retrieves a trace-level time-series of error counts grouped by error name.
   *
   * @param options - Optional window and filters
   * @returns Promise resolving to an array of {@link AgentTraceGetErrorsTimelineResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get the errors timeline
   * const result = await trace.getErrorsTimeline();
   * result.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * import { AgentTraceExecutionType } from '@uipath/uipath-typescript/traces';
   *
   * // Get the errors timeline for an agent version within a time window
   * const filtered = await trace.getErrorsTimeline({
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   agentId: '<agentId>',
   *   agentVersion: '1.0.0',
   *   executionType: AgentTraceExecutionType.Runtime,
   * });
   * ```
   */
  getErrorsTimeline(
    options?: AgentTraceGetErrorsTimelineOptions,
  ): Promise<AgentTraceGetErrorsTimelineResponse[]>;

  /**
   * Retrieves a trace-level time-series of latency.
   *
   * @param options - Optional window and filters
   * @returns Promise resolving to an array of {@link AgentTraceGetLatencyTimelineResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get the latency timeline
   * const result = await trace.getLatencyTimeline();
   * result.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value}s`);
   * });
   * ```
   * @example
   * ```typescript
   * import { AgentTraceExecutionType } from '@uipath/uipath-typescript/traces';
   *
   * // Get the latency timeline for an agent version within a time window
   * const filtered = await trace.getLatencyTimeline({
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   agentId: '<agentId>',
   *   agentVersion: '1.0.0',
   *   executionType: AgentTraceExecutionType.Runtime,
   * });
   * ```
   */
  getLatencyTimeline(
    options?: AgentTraceGetLatencyTimelineOptions,
  ): Promise<AgentTraceGetLatencyTimelineResponse[]>;

  /**
   * Retrieves trace-level per-agent unit consumption totals.
   *
   * @param options - Optional window and filters
   * @returns Promise resolving to an array of {@link AgentTraceGetUnitConsumptionResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get per-agent unit consumption
   * const result = await trace.getUnitConsumption();
   * result.forEach((row) => {
   *   console.log(`${row.agentId}: ${row.agentUnitsConsumed} Agent Units, ${row.platformUnitsConsumed} Platform Units`);
   * });
   * ```
   * @example
   * ```typescript
   * import { AgentTraceExecutionType } from '@uipath/uipath-typescript/traces';
   *
   * // Get per-agent unit consumption for an agent version within a time window
   * const filtered = await trace.getUnitConsumption({
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   agentId: '<agentId>',
   *   agentVersion: '1.0.0',
   *   executionType: AgentTraceExecutionType.Runtime,
   * });
   * ```
   */
  getUnitConsumption(
    options?: AgentTraceGetUnitConsumptionOptions,
  ): Promise<AgentTraceGetUnitConsumptionResponse[]>;

  /**
   * Retrieves every span belonging to a single trace.
   *
   * @param traceId - Identifier of the trace whose spans should be returned
   * @returns Promise resolving to an array of {@link AgentSpanGetResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * const spans = await trace.getSpansByTraceId('<traceId>');
   * spans.forEach((span) => {
   *   console.log(`${span.name} (${span.startTime} → ${span.endTime ?? 'in progress'})`);
   * });
   * ```
   */
  getSpansByTraceId(traceId: string): Promise<AgentSpanGetResponse[]>;

  /**
   * Retrieves spans whose reference hierarchy contains the given reference id.
   *
   * @param referenceId - Reference id matched against each span's reference hierarchy
   * @param options - Optional pagination and hierarchy/time filters
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentSpanGetResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get spans by referenceId
   * const result = await trace.getSpansByReference('<referenceId>');
   * result.items.forEach((span) => console.log(span.name));
   * ```
   * @example
   * ```typescript
   * import { AgentTraceExecutionType } from '@uipath/uipath-typescript/traces';
   *
   * // Get spans by referenceId within a trace and time window
   * const page = await trace.getSpansByReference('<referenceId>', {
   *   traceId: '<traceId>',
   *   executionType: AgentTraceExecutionType.Runtime,
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   pageSize: 25,
   * });
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await trace.getSpansByReference('<referenceId>', { cursor: page.nextCursor });
   * }
   * ```
   */
  getSpansByReference<T extends AgentTraceGetSpansByReferenceOptions = AgentTraceGetSpansByReferenceOptions>(
    referenceId: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentSpanGetResponse>
      : NonPaginatedResponse<AgentSpanGetResponse>
  >;

  /**
   * Retrieves runtime governance decisions — each policy's allow/deny result —
   * over the requested window.
   *
   * @remarks Requires the caller to be an organization admin. Non-admin callers get a `403` and the SDK throws an {@link AuthorizationError}.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param options - Optional window end, filters, and pagination
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentGovernanceDecisionGetResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Decision rows since a start time
   * const result = await trace.getGovernanceDecisions(new Date('2025-05-01T00:00:00Z'));
   * result.items.forEach((row) => {
   *   console.log(`${row.hook} ${row.policyId}: ${row.evaluatorResult}`);
   * });
   * ```
   * @example
   * ```typescript
   * // Violations only, for one agent, paginated
   * const page = await trace.getGovernanceDecisions(new Date('2025-05-01T00:00:00Z'), {
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   violationsOnly: true,
   *   agentId: '<agentProjectKey>',
   *   pageSize: 25,
   * });
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await trace.getGovernanceDecisions(new Date('2025-05-01T00:00:00Z'), { cursor: page.nextCursor });
   * }
   * ```
   * @example
   * ```typescript
   * import { isAuthorizationError } from '@uipath/uipath-typescript/core';
   *
   * // Non-admin callers get a 403
   * try {
   *   await trace.getGovernanceDecisions(new Date('2025-05-01T00:00:00Z'));
   * } catch (error) {
   *   if (isAuthorizationError(error)) {
   *     console.error('Governance data requires an organization admin.');
   *   }
   * }
   * ```
   */
  getGovernanceDecisions<T extends AgentGovernanceDecisionsOptions = AgentGovernanceDecisionsOptions>(
    startTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentGovernanceDecisionGetResponse>
      : NonPaginatedResponse<AgentGovernanceDecisionGetResponse>
  >;

  /**
   * Retrieves a governance summary over the requested window — total and
   * violation counts plus top-N breakdowns by hook, agent, policy, and pack.
   *
   * @remarks Requires the caller to be an organization admin. Non-admin callers get a `403` and the SDK throws an {@link AuthorizationError}.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param options - Optional window end, top-N, pack scope, and sections
   * @returns Promise resolving to {@link AgentGovernanceGetSummaryResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Default posture since a start time
   * const summary = await trace.getGovernanceSummary(new Date('2025-05-01T00:00:00Z'));
   * console.log(`${summary.violations} / ${summary.total} violations`);
   * summary.byPolicy.forEach((p) => console.log(`${p.key}: ${p.violationCount}`));
   * ```
   * @example
   * ```typescript
   * import { AgentGovernanceSection } from '@uipath/uipath-typescript/traces';
   *
   * // Top 5 per breakdown, scoped to a pack, including the opt-in action/mode sections
   * const summary = await trace.getGovernanceSummary(new Date('2025-05-01T00:00:00Z'), {
   *   topN: 5,
   *   packName: 'ISO/IEC 42001:2023 Runtime',
   *   sections: [AgentGovernanceSection.Action, AgentGovernanceSection.Mode],
   * });
   * ```
   * @example
   * ```typescript
   * import { isAuthorizationError } from '@uipath/uipath-typescript/core';
   *
   * // Non-admin callers get a 403
   * try {
   *   await trace.getGovernanceSummary(new Date('2025-05-01T00:00:00Z'));
   * } catch (error) {
   *   if (isAuthorizationError(error)) {
   *     console.error('Governance data requires an organization admin.');
   *   }
   * }
   * ```
   */
  getGovernanceSummary(
    startTime: Date,
    options?: AgentGovernanceSummaryOptions,
  ): Promise<AgentGovernanceGetSummaryResponse>;
}
