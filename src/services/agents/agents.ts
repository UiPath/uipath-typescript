import { BaseService } from '../base';
import {
  AgentError,
  AgentErrorsOptions,
  AgentListItem,
  AgentListOptions,
  AgentTraceErrorsTimelineOptions,
  AgentTraceErrorsTimelineResponse,
  AgentTraceFilterOptions,
  AgentTraceLatencyTimelineOptions,
  AgentTraceLatencyTimelineResponse,
  AgentTraceUnitConsumptionOptions,
  AgentTraceUnitConsumptionResponse,
  Span,
  SpanGetByReferenceOptions,
} from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import { AGENTS_ENDPOINTS } from '../../utils/constants/endpoints';
import {
  HTTP_METHODS,
  AGENTS_PAGINATION,
  AGENTS_INCIDENTS_PAGINATION,
  AGENTS_OFFSET_PARAMS,
  TRACEVIEW_SPANS_PAGINATION,
} from '../../utils/constants/common';
import { track } from '../../core/telemetry';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

/**
 * Service for interacting with the UiPath Agents API.
 */
export class AgentService extends BaseService implements AgentServiceModel {
  /**
   * Retrieves the list of agents on the tenant with consumption and health
   * metadata over the requested window.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional pagination, sort, and filters
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentListItem}
   * @example
   * ```typescript
   * import { Agents, AgentListSortColumn } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Non-paginated — returns the server default page
   * const result = await agents.getAll(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   * );
   * result.items.forEach((agent) => {
   *   console.log(`${agent.agentName} — ${agent.unitsQuantity} units, health=${agent.healthScore}`);
   * });
   *
   * // Paginated — sorted by health score descending
   * const page = await agents.getAll(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   *   {
   *     pageSize: 25,
   *     orderBy: { column: AgentListSortColumn.HealthScore, desc: true },
   *     folderKeys: ['<folderKey1>'],
   *   },
   * );
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await agents.getAll(
   *     new Date('2025-05-01T00:00:00Z'),
   *     new Date('2026-05-14T00:00:00Z'),
   *     { cursor: page.nextCursor },
   *   );
   * }
   * ```
   */
  @track('Agents.GetAll')
  async getAll<T extends AgentListOptions = AgentListOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentListItem>
      : NonPaginatedResponse<AgentListItem>
  > {
    const apiOptions = { ...options, startTime: startTime.toISOString(), endTime: endTime.toISOString() };

    return PaginationHelpers.getAll<typeof apiOptions, AgentListItem>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENTS_ENDPOINTS.GET_AGENTS,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AGENTS_PAGINATION.ITEMS_FIELD,
        totalCountField: AGENTS_PAGINATION.TOTAL_COUNT_FIELD,
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
        ? PaginatedResponse<AgentListItem>
        : NonPaginatedResponse<AgentListItem>
    >;
  }

  /**
   * Retrieves a trace-level time-series of error counts grouped by error name
   * over the requested window.
   *
   * Counts errors observed in traces (distinct from agent-run errors). Returns
   * one data point per (error name, time bucket); bucket size is chosen
   * server-side based on the window length. Optionally filter by folder, agent,
   * agent version, or execution type.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters {@link AgentTraceErrorsTimelineOptions}
   * @returns Promise resolving to {@link AgentTraceErrorsTimelineResponse}
   * @example
   * ```typescript
   * import { Agents, AgentExecutionType } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * const result = await agents.getTraceErrorsTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} errors`);
   * });
   *
   * // Scope to one agent version, runtime executions only
   * const filtered = await agents.getTraceErrorsTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   { agentId: '<agentId>', agentVersion: '1.0.0', executionType: AgentExecutionType.Runtime },
   * );
   * ```
   */
  @track('Agents.GetTraceErrorsTimeline')
  async getTraceErrorsTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentTraceErrorsTimelineOptions,
  ): Promise<AgentTraceErrorsTimelineResponse> {
    const response = await this.post<AgentTraceErrorsTimelineResponse>(
      AGENTS_ENDPOINTS.GET_TRACE_ERRORS_TIMELINE,
      this.buildTraceFilterBody(startTime, endTime, options),
    );
    return response.data;
  }

  /**
   * Retrieves a trace-level time-series of latency over the requested window.
   *
   * Reports latency observed in traces (distinct from agent-run latency). The
   * API emits one point per (series, time bucket) — typically a `P50` and a
   * `P95` series per bucket — with `value` in decimal seconds. Bucket size is
   * chosen server-side based on the window length. Optionally filter by folder,
   * agent, agent version, or execution type.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters {@link AgentTraceLatencyTimelineOptions}
   * @returns Promise resolving to {@link AgentTraceLatencyTimelineResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * const result = await agents.getTraceLatencyTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value}s`);
   * });
   * ```
   */
  @track('Agents.GetTraceLatencyTimeline')
  async getTraceLatencyTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentTraceLatencyTimelineOptions,
  ): Promise<AgentTraceLatencyTimelineResponse> {
    const response = await this.post<AgentTraceLatencyTimelineResponse>(
      AGENTS_ENDPOINTS.GET_TRACE_LATENCY_TIMELINE,
      this.buildTraceFilterBody(startTime, endTime, options),
    );
    return response.data;
  }

  /**
   * Retrieves trace-level per-agent unit consumption totals over the requested
   * window.
   *
   * Returns a flat per-agent breakdown of agent units (AGU) and platform units
   * (PLTU) consumed, one entry per (agent, version, folder) — distinct from the
   * aggregate unit-consumption summary. Optionally filter by folder, agent,
   * agent version, or execution type.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters {@link AgentTraceUnitConsumptionOptions}
   * @returns Promise resolving to {@link AgentTraceUnitConsumptionResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * const result = await agents.getTraceUnitConsumption(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.data?.forEach((row) => {
   *   console.log(`${row.agentId}: ${row.agentUnitsConsumed} AGU, ${row.platformUnitsConsumed} PLTU`);
   * });
   * ```
   */
  @track('Agents.GetTraceUnitConsumption')
  async getTraceUnitConsumption(
    startTime: Date,
    endTime: Date,
    options?: AgentTraceUnitConsumptionOptions,
  ): Promise<AgentTraceUnitConsumptionResponse> {
    const response = await this.post<AgentTraceUnitConsumptionResponse>(
      AGENTS_ENDPOINTS.GET_TRACE_UNIT_CONSUMPTION,
      this.buildTraceFilterBody(startTime, endTime, options),
    );
    return response.data;
  }

  /**
   * Retrieves every span belonging to a single trace.
   *
   * Returns a flat array of {@link Span} (not paginated), scoped to the caller's
   * tenant and filtered to the folders the caller can access. `attributes` and
   * `context` on each span are raw JSON strings — parse them with `JSON.parse()`.
   *
   * @param traceId - Identifier of the trace whose spans should be returned
   * @returns Promise resolving to an array of {@link Span}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * const spans = await agents.getSpansByTraceId('<traceId>');
   * spans.forEach((span) => {
   *   console.log(`${span.name} (${span.startTime} → ${span.endTime ?? 'in progress'})`);
   * });
   * ```
   */
  @track('Agents.GetSpansByTraceId')
  async getSpansByTraceId(traceId: string): Promise<Span[]> {
    const response = await this.get<Span[]>(AGENTS_ENDPOINTS.GET_SPANS_BY_TRACE_ID(traceId));
    return response.data;
  }

  /**
   * Retrieves spans whose reference hierarchy contains the given reference id.
   *
   * Matches spans where an entry in the span's `context.ReferenceHierarchy`
   * array has a `ReferenceId` equal to `referenceId`. Optionally narrow the scan
   * with `traceId`, restrict the hierarchy match with `serviceType` / `version`,
   * bound the window with `startTime` / `endTime`, or filter by `executionType`.
   * Omitting `traceId` scans the full tenant and can be slow on large tenants.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}.
   *
   * @param referenceId - Reference id matched against each span's `ReferenceHierarchy`
   * @param options - Optional pagination and hierarchy/time filters {@link SpanGetByReferenceOptions}
   * @returns Promise resolving to a paginated or non-paginated list of {@link Span}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Bare minimum — server default page
   * const result = await agents.getSpansByReference('<referenceId>');
   * result.items.forEach((span) => console.log(span.name));
   *
   * // Scoped to one trace, runtime executions only, paginated
   * import { AgentExecutionType } from '@uipath/uipath-typescript/agents';
   *
   * const page = await agents.getSpansByReference('<referenceId>', {
   *   traceId: '<traceId>',
   *   executionType: AgentExecutionType.Runtime,
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   pageSize: 25,
   * });
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await agents.getSpansByReference('<referenceId>', { cursor: page.nextCursor });
   * }
   * ```
   */
  @track('Agents.GetSpansByReference')
  async getSpansByReference<T extends SpanGetByReferenceOptions = SpanGetByReferenceOptions>(
    referenceId: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<Span>
      : NonPaginatedResponse<Span>
  > {
    const { startTime, endTime, ...rest } = options ?? {};
    const apiOptions = {
      ...rest,
      ...(startTime !== undefined ? { startTime: startTime.toISOString() } : {}),
      ...(endTime !== undefined ? { endTime: endTime.toISOString() } : {}),
    };

    return PaginationHelpers.getAll<typeof apiOptions, Span>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENTS_ENDPOINTS.GET_SPANS_BY_REFERENCE(referenceId),
      method: HTTP_METHODS.GET,
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
        ? PaginatedResponse<Span>
        : NonPaginatedResponse<Span>
    >;
  }

  /**
   * Retrieves agent errors (error-classes observed for agents) over the
   * requested window.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional pagination, sort/group, and filters
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentError}
   * @example
   * ```typescript
   * import { Agents, AgentErrorSortColumn } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Non-paginated — errors in the window
   * const result = await agents.getErrors(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   * );
   * result.items.forEach((error) => {
   *   console.log(`${error.type}: ${error.description} (count=${error.count})`);
   * });
   *
   * // Paginated — sorted by execution count descending
   * const page = await agents.getErrors(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   *   {
   *     pageSize: 25,
   *     orderBy: { column: AgentErrorSortColumn.ExecutionCount, desc: true },
   *   },
   * );
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await agents.getErrors(
   *     new Date('2025-05-01T00:00:00Z'),
   *     new Date('2026-05-14T00:00:00Z'),
   *     { cursor: page.nextCursor },
   *   );
   * }
   * ```
   */
  @track('Agents.GetErrors')
  async getErrors<T extends AgentErrorsOptions = AgentErrorsOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentError>
      : NonPaginatedResponse<AgentError>
  > {
    const apiOptions = { ...options, startTime: startTime.toISOString(), endTime: endTime.toISOString() };

    return PaginationHelpers.getAll<typeof apiOptions, AgentError>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENTS_ENDPOINTS.GET_INCIDENTS,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AGENTS_INCIDENTS_PAGINATION.ITEMS_FIELD,
        totalCountField: AGENTS_INCIDENTS_PAGINATION.TOTAL_COUNT_FIELD,
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
        ? PaginatedResponse<AgentError>
        : NonPaginatedResponse<AgentError>
    >;
  }

  private buildTraceFilterBody(
    startTime: Date,
    endTime: Date,
    options?: AgentTraceFilterOptions,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.agentVersion !== undefined) body.agentVersion = options.agentVersion;
    if (options?.executionType !== undefined) body.executionType = options.executionType;
    return body;
  }
}
