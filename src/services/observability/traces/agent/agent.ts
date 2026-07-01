import { BaseService } from '../../../base';
import {
  AgentTraceFilterOptions,
  AgentTraceGetErrorsTimelineOptions,
  AgentTraceGetErrorsTimelineResponse,
  AgentTraceGetLatencyTimelineOptions,
  AgentTraceGetLatencyTimelineResponse,
  AgentTraceGetUnitConsumptionOptions,
  AgentTraceGetUnitConsumptionResponse,
  AgentSpanGetResponse,
  AgentTraceGetSpansByReferenceOptions,
  AgentGovernanceCheckGetResponse,
  AgentGovernanceChecksOptions,
  AgentGovernanceGetSummaryResponse,
  AgentGovernanceSummaryOptions,
  AgentGovernanceMode,
  AgentGovernanceVerdict,
} from '../../../../models/observability/traces/agent/agent.types';
import { AgentTracesServiceModel } from '../../../../models/observability/traces/agent/agent.models';
import {
  RawAgentSpanGetResponse,
  RawAgentGovernanceCheckGetResponse,
} from '../../../../models/observability/traces/agent/agent.internal-types';
import { AGENT_TRACES_ENDPOINTS } from '../../../../utils/constants/endpoints';
import {
  HTTP_METHODS,
  AGENTS_OFFSET_PARAMS,
  TRACEVIEW_SPANS_PAGINATION,
  GOVERNANCE_CHECKS_PAGINATION,
} from '../../../../utils/constants/common';
import { track } from '../../../../core/telemetry';
import { ValidationError } from '../../../../core/errors';
import { PaginationHelpers } from '../../../../utils/pagination/helpers';
import { PaginationType } from '../../../../utils/pagination/internal-types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../../../utils/pagination/types';

/**
 * Maps a raw span record to a {@link AgentSpanGetResponse}
 */
const transformSpan = (span: RawAgentSpanGetResponse): AgentSpanGetResponse => {
  const { expiryTimeUtc, ...rest } = span;
  return { ...rest, expiredTime: expiryTimeUtc };
};

// Case-insensitive lookups from a raw API value → enum member (keys upper-cased).
const GOVERNANCE_MODE_BY_VALUE = new Map<string, AgentGovernanceMode>(
  Object.values(AgentGovernanceMode).map((mode) => [mode.toUpperCase(), mode]),
);
const GOVERNANCE_VERDICT_BY_VALUE = new Map<string, AgentGovernanceVerdict>(
  Object.values(AgentGovernanceVerdict).map((verdict) => [verdict.toUpperCase(), verdict]),
);

/** Maps a raw mode string to {@link AgentGovernanceMode}, case-insensitively; missing/unrecognized → `Unknown`. */
const toGovernanceMode = (raw: string | null): AgentGovernanceMode =>
  (raw != null ? GOVERNANCE_MODE_BY_VALUE.get(raw.toUpperCase()) : undefined) ?? AgentGovernanceMode.Unknown;

/** Maps a raw verdict string to {@link AgentGovernanceVerdict}, case-insensitively; missing/unrecognized → `Unknown`. */
const toGovernanceVerdict = (raw: string | null): AgentGovernanceVerdict =>
  (raw != null ? GOVERNANCE_VERDICT_BY_VALUE.get(raw.toUpperCase()) : undefined) ?? AgentGovernanceVerdict.Unknown;

/**
 * Normalizes a raw governance row, mapping the mode and verdict strings to
 * their enums while leaving the other fields untouched.
 */
const transformGovernanceCheck = (row: RawAgentGovernanceCheckGetResponse): AgentGovernanceCheckGetResponse => ({
  ...row,
  mode: toGovernanceMode(row.mode),
  evaluatorResult: toGovernanceVerdict(row.evaluatorResult),
});

/**
 * Service for retrieving UiPath Agent trace metrics.
 */
export class AgentTracesService extends BaseService implements AgentTracesServiceModel {
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
  @track('AgentTraces.GetErrorsTimeline')
  async getErrorsTimeline(
    options?: AgentTraceGetErrorsTimelineOptions,
  ): Promise<AgentTraceGetErrorsTimelineResponse[]> {
    const response = await this.post<{ data: AgentTraceGetErrorsTimelineResponse[] }>(
      AGENT_TRACES_ENDPOINTS.GET_ERRORS_TIMELINE,
      this.buildTraceFilterBody(options),
    );
    return response.data.data;
  }

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
  @track('AgentTraces.GetLatencyTimeline')
  async getLatencyTimeline(
    options?: AgentTraceGetLatencyTimelineOptions,
  ): Promise<AgentTraceGetLatencyTimelineResponse[]> {
    const response = await this.post<{ data: AgentTraceGetLatencyTimelineResponse[] }>(
      AGENT_TRACES_ENDPOINTS.GET_LATENCY_TIMELINE,
      this.buildTraceFilterBody(options),
    );
    return response.data.data;
  }

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
  @track('AgentTraces.GetUnitConsumption')
  async getUnitConsumption(
    options?: AgentTraceGetUnitConsumptionOptions,
  ): Promise<AgentTraceGetUnitConsumptionResponse[]> {
    const response = await this.post<{ data: AgentTraceGetUnitConsumptionResponse[] }>(
      AGENT_TRACES_ENDPOINTS.GET_UNIT_CONSUMPTION,
      this.buildTraceFilterBody(options),
    );
    return response.data.data;
  }

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
  @track('AgentTraces.GetSpansByTraceId')
  async getSpansByTraceId(traceId: string): Promise<AgentSpanGetResponse[]> {
    if (!traceId) throw new ValidationError({ message: 'traceId is required for getSpansByTraceId' });
    const response = await this.get<RawAgentSpanGetResponse[]>(AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_TRACE_ID(traceId));
    return (response.data ?? []).map(transformSpan);
  }

  /**
   * Retrieves spans whose reference hierarchy contains the given reference id.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}.
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
  @track('AgentTraces.GetSpansByReference')
  async getSpansByReference<T extends AgentTraceGetSpansByReferenceOptions = AgentTraceGetSpansByReferenceOptions>(
    referenceId: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentSpanGetResponse>
      : NonPaginatedResponse<AgentSpanGetResponse>
  > {
    if (!referenceId) throw new ValidationError({ message: 'referenceId is required for getSpansByReference' });
    const { startTime, endTime, ...rest } = options ?? {};
    const apiOptions = {
      ...rest,
      ...(startTime !== undefined ? { startTime: startTime.toISOString() } : {}),
      ...(endTime !== undefined ? { endTime: endTime.toISOString() } : {}),
    };

    return PaginationHelpers.getAll<typeof apiOptions, RawAgentSpanGetResponse, AgentSpanGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_REFERENCE(referenceId),
      method: HTTP_METHODS.GET,
      transformFn: transformSpan,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: TRACEVIEW_SPANS_PAGINATION.ITEMS_FIELD,
        totalCountField: TRACEVIEW_SPANS_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AGENTS_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AGENTS_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AGENTS_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
          zeroBased: true,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<AgentSpanGetResponse>
        : NonPaginatedResponse<AgentSpanGetResponse>
    >;
  }

  /**
   * Retrieves runtime governance checks — per policy allow/deny decisions —
   * over the requested window.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}. The endpoint returns no total-count, so
   * `hasNextPage` is inferred from page fullness.
   *
   * @remarks Requires the caller to be an organization admin. Non-admin callers get a `403` and the SDK throws an {@link AuthorizationError}.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param options - Optional window end, filters, and pagination
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentGovernanceCheckGetResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Decision rows since a start time
   * const result = await trace.getGovernanceChecks(new Date('2025-05-01T00:00:00Z'));
   * result.items.forEach((row) => {
   *   console.log(`${row.hook} ${row.policyId}: ${row.evaluatorResult}`);
   * });
   * ```
   * @example
   * ```typescript
   * // Violations only, for one agent, paginated
   * const page = await trace.getGovernanceChecks(new Date('2025-05-01T00:00:00Z'), {
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   violationsOnly: true,
   *   agentId: '<agentProjectKey>',
   *   pageSize: 25,
   * });
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await trace.getGovernanceChecks(new Date('2025-05-01T00:00:00Z'), { cursor: page.nextCursor });
   * }
   * ```
   * @example
   * ```typescript
   * import { isAuthorizationError } from '@uipath/uipath-typescript/core';
   *
   * // Non-admin callers get a 403
   * try {
   *   await trace.getGovernanceChecks(new Date('2025-05-01T00:00:00Z'));
   * } catch (error) {
   *   if (isAuthorizationError(error)) {
   *     console.error('Governance data requires an organization admin.');
   *   }
   * }
   * ```
   */
  @track('AgentTraces.GetGovernanceChecks')
  async getGovernanceChecks<T extends AgentGovernanceChecksOptions = AgentGovernanceChecksOptions>(
    startTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentGovernanceCheckGetResponse>
      : NonPaginatedResponse<AgentGovernanceCheckGetResponse>
  > {
    const { endTime, ...rest } = options ?? {};
    const apiOptions = {
      ...rest,
      startTime: startTime.toISOString(),
      ...(endTime !== undefined ? { endTime: endTime.toISOString() } : {}),
    };

    return PaginationHelpers.getAll<typeof apiOptions, RawAgentGovernanceCheckGetResponse, AgentGovernanceCheckGetResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENT_TRACES_ENDPOINTS.GET_GOVERNANCE_CHECKS,
      method: HTTP_METHODS.POST,
      transformFn: transformGovernanceCheck,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: GOVERNANCE_CHECKS_PAGINATION.ITEMS_FIELD,
        totalCountField: GOVERNANCE_CHECKS_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AGENTS_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AGENTS_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AGENTS_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
          zeroBased: true,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<AgentGovernanceCheckGetResponse>
        : NonPaginatedResponse<AgentGovernanceCheckGetResponse>
    >;
  }

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
  @track('AgentTraces.GetGovernanceSummary')
  async getGovernanceSummary(
    startTime: Date,
    options?: AgentGovernanceSummaryOptions,
  ): Promise<AgentGovernanceGetSummaryResponse> {
    const body: Record<string, unknown> = { startTime: startTime.toISOString() };
    if (options?.endTime !== undefined) body.endTime = options.endTime.toISOString();
    if (options?.topN !== undefined) body.topN = options.topN;
    if (options?.packName !== undefined) body.packName = options.packName;
    if (options?.sections !== undefined) body.sections = options.sections;

    const response = await this.post<AgentGovernanceGetSummaryResponse>(
      AGENT_TRACES_ENDPOINTS.GET_GOVERNANCE_SUMMARY,
      body,
    );
    return response.data;
  }

  private buildTraceFilterBody(
    options?: AgentTraceFilterOptions,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (options?.startTime !== undefined) body.startTime = options.startTime.toISOString();
    if (options?.endTime !== undefined) body.endTime = options.endTime.toISOString();
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.agentVersion !== undefined) body.agentVersion = options.agentVersion;
    if (options?.executionType !== undefined) body.executionType = options.executionType;
    return body;
  }
}
