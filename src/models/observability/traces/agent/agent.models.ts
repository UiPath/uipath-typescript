import {
  AgentTraceGetErrorsTimelineOptions,
  AgentTraceGetErrorsTimelineResponse,
  AgentTraceGetLatencyTimelineOptions,
  AgentTraceGetLatencyTimelineResponse,
  AgentTraceGetUnitConsumptionOptions,
  AgentTraceGetUnitConsumptionResponse,
  SpanResponse,
  AgentTraceGetSpansByReferenceOptions,
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
   *   console.log(`${row.agentId}: ${row.agentUnitsConsumed} AGU, ${row.platformUnitsConsumed} PLTU`);
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
   * @returns Promise resolving to an array of {@link SpanResponse}
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
  getSpansByTraceId(traceId: string): Promise<SpanResponse[]>;

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
      ? PaginatedResponse<SpanResponse>
      : NonPaginatedResponse<SpanResponse>
  >;
}
