import { BaseService } from '../../base';
import {
  AgentTraceFilterOptions,
  AgentTraceErrorsTimelineOptions,
  AgentTraceErrorsTimelineResponse,
  AgentTraceLatencyTimelineOptions,
  AgentTraceLatencyTimelineResponse,
  AgentTraceUnitConsumptionOptions,
  AgentTraceUnitConsumptionResponse,
  SpanResponse,
  SpanGetByReferenceOptions,
} from '../../../models/agents/traces/traces.types';
import { AgentTracesServiceModel } from '../../../models/agents/traces/traces.models';
import { AGENT_TRACES_ENDPOINTS } from '../../../utils/constants/endpoints';
import {
  HTTP_METHODS,
  AGENTS_OFFSET_PARAMS,
  TRACEVIEW_SPANS_PAGINATION,
} from '../../../utils/constants/common';
import { track } from '../../../core/telemetry';
import { PaginationHelpers } from '../../../utils/pagination/helpers';
import { PaginationType } from '../../../utils/pagination/internal-types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../../utils/pagination/types';

/**
 * Service for retrieving UiPath Agent trace metrics.
 */
export class AgentTracesService extends BaseService implements AgentTracesServiceModel {
  /**
   * Retrieves a trace-level time-series of error counts grouped by error name.
   *
   * @param options - Optional window and filters
   * @returns Promise resolving to {@link AgentTraceErrorsTimelineResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/agent-traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get the errors timeline
   * const result = await trace.getErrorsTimeline();
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * import { AgentExecutionType } from '@uipath/uipath-typescript/agent-traces';
   *
   * // Get the errors timeline for an agent version within a time window
   * const filtered = await trace.getErrorsTimeline({
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   *   agentId: '<agentId>',
   *   agentVersion: '1.0.0',
   *   executionType: AgentExecutionType.Runtime,
   * });
   * ```
   */
  @track('AgentTraces.GetErrorsTimeline')
  async getErrorsTimeline(
    options?: AgentTraceErrorsTimelineOptions,
  ): Promise<AgentTraceErrorsTimelineResponse> {
    const response = await this.post<AgentTraceErrorsTimelineResponse>(
      AGENT_TRACES_ENDPOINTS.GET_ERRORS_TIMELINE,
      this.buildTraceFilterBody(options),
    );
    return response.data;
  }

  /**
   * Retrieves a trace-level time-series of latency.
   *
   * @param options - Optional window and filters
   * @returns Promise resolving to {@link AgentTraceLatencyTimelineResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/agent-traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get the latency timeline
   * const result = await trace.getLatencyTimeline();
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value}s`);
   * });
   * ```
   * @example
   * ```typescript
   * // Get the latency timeline within a time window
   * const windowed = await trace.getLatencyTimeline({
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   * });
   * ```
   */
  @track('AgentTraces.GetLatencyTimeline')
  async getLatencyTimeline(
    options?: AgentTraceLatencyTimelineOptions,
  ): Promise<AgentTraceLatencyTimelineResponse> {
    const response = await this.post<AgentTraceLatencyTimelineResponse>(
      AGENT_TRACES_ENDPOINTS.GET_LATENCY_TIMELINE,
      this.buildTraceFilterBody(options),
    );
    return response.data;
  }

  /**
   * Retrieves trace-level per-agent unit consumption totals.
   *
   * @param options - Optional window and filters
   * @returns Promise resolving to {@link AgentTraceUnitConsumptionResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/agent-traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get per-agent unit consumption
   * const result = await trace.getUnitConsumption();
   * result.data?.forEach((row) => {
   *   console.log(`${row.agentId}: ${row.agentUnitsConsumed} AGU, ${row.platformUnitsConsumed} PLTU`);
   * });
   * ```
   * @example
   * ```typescript
   * // Get per-agent unit consumption within a time window
   * const windowed = await trace.getUnitConsumption({
   *   startTime: new Date('2025-05-01T00:00:00Z'),
   *   endTime: new Date('2025-06-01T00:00:00Z'),
   * });
   * ```
   */
  @track('AgentTraces.GetUnitConsumption')
  async getUnitConsumption(
    options?: AgentTraceUnitConsumptionOptions,
  ): Promise<AgentTraceUnitConsumptionResponse> {
    const response = await this.post<AgentTraceUnitConsumptionResponse>(
      AGENT_TRACES_ENDPOINTS.GET_UNIT_CONSUMPTION,
      this.buildTraceFilterBody(options),
    );
    return response.data;
  }

  /**
   * Retrieves every span belonging to a single trace.
   *
   * @param traceId - Identifier of the trace whose spans should be returned
   * @returns Promise resolving to an array of {@link SpanResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/agent-traces';
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
  async getSpansByTraceId(traceId: string): Promise<SpanResponse[]> {
    const response = await this.get<SpanResponse[]>(AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_TRACE_ID(traceId));
    return response.data;
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
   * @returns Promise resolving to a paginated or non-paginated list of {@link SpanResponse}
   * @example
   * ```typescript
   * import { AgentTraces } from '@uipath/uipath-typescript/agent-traces';
   *
   * const trace = new AgentTraces(sdk);
   *
   * // Get spans by referenceId
   * const result = await trace.getSpansByReference('<referenceId>');
   * result.items.forEach((span) => console.log(span.name));
   * ```
   * @example
   * ```typescript
   * import { AgentExecutionType } from '@uipath/uipath-typescript/agent-traces';
   *
   * // Get spans by referenceId within a trace and time window
   * const page = await trace.getSpansByReference('<referenceId>', {
   *   traceId: '<traceId>',
   *   executionType: AgentExecutionType.Runtime,
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
  async getSpansByReference<T extends SpanGetByReferenceOptions = SpanGetByReferenceOptions>(
    referenceId: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<SpanResponse>
      : NonPaginatedResponse<SpanResponse>
  > {
    const { startTime, endTime, ...rest } = options ?? {};
    const apiOptions = {
      ...rest,
      ...(startTime !== undefined ? { startTime: startTime.toISOString() } : {}),
      ...(endTime !== undefined ? { endTime: endTime.toISOString() } : {}),
    };

    return PaginationHelpers.getAll<typeof apiOptions, SpanResponse>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENT_TRACES_ENDPOINTS.GET_SPANS_BY_REFERENCE(referenceId),
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
        ? PaginatedResponse<SpanResponse>
        : NonPaginatedResponse<SpanResponse>
    >;
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
