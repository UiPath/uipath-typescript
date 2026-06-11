import type { PaginationOptions } from '../../../utils/pagination/types';

/**
 * Job execution mode filter — `Debug` (test runs) or `Runtime` (production runs).
 */
export enum AgentExecutionType {
  Debug = 'Debug',
  Runtime = 'Runtime',
}

/**
 * Filter fields shared by the trace-level agent endpoints
 */
export interface AgentTraceFilterOptions {
  /** Inclusive lower bound for the query window. Omit to use the server default range. */
  startTime?: Date;
  /** Exclusive upper bound for the query window. Omit to use the server default range. */
  endTime?: Date;
  /** Folder keys to scope the query. Intersected with the user's accessible folders. */
  folderKeys?: string[];
  /** Filter to a single agent by ID. */
  agentId?: string;
  /** Filter to a specific agent version. */
  agentVersion?: string;
  /** Filter to a specific execution type. */
  executionType?: AgentExecutionType;
}

/**
 * One point on the trace-level errors timeline — error count for a single
 * (error name, time bucket).
 */
export interface AgentTraceErrorsTimelinePoint {
  /** Error name / category for this time-slice. */
  name: string;
  /** Count of errors in this time bucket for this name. */
  value: number;
  /** Bucket timestamp (ISO 8601, UTC). */
  date: string;
}

/**
 * Response from the trace-level errors timeline.
 */
export interface AgentTraceErrorsTimelineResponse {
  /** Time-series points, one per (error name, time bucket). May be absent when no data matches. */
  data?: AgentTraceErrorsTimelinePoint[];
}

/**
 * Options for the trace-level errors timeline.
 */
export interface AgentTraceErrorsTimelineOptions extends AgentTraceFilterOptions {}

/**
 * One point on the trace-level latency timeline — a latency value for a single
 * (series, time bucket).
 */
export interface AgentTraceLatencyTimelinePoint {
  /** Series/grouping name for this latency point — e.g. a percentile label such as `P50` or `P95`. */
  name: string;
  /** Latency value in decimal seconds for this series and time bucket. */
  value: number;
  /** Bucket timestamp (ISO 8601, UTC). */
  date: string;
}

/**
 * Response from the trace-level latency timeline.
 */
export interface AgentTraceLatencyTimelineResponse {
  /** Time-series points, one per (series, time bucket). May be absent when no data matches. */
  data?: AgentTraceLatencyTimelinePoint[];
}

/**
 * Options for the trace-level latency timeline.
 */
export interface AgentTraceLatencyTimelineOptions extends AgentTraceFilterOptions {}

/**
 * Per-agent unit consumption totals over the requested window (trace-level) —
 * a flat per-(agent, version, folder) breakdown of AGU and PLTU consumed.
 */
export interface AgentTraceUnitConsumption {
  /** Agent ID these totals belong to. */
  agentId: string;
  /** Folder key (GUID) the consumption was recorded in. */
  folderKey: string;
  /** Agent version these totals belong to. */
  agentVersion: string;
  /** Agent units (AGU) consumed over the window. */
  agentUnitsConsumed: number;
  /** Platform units (PLTU) consumed over the window. */
  platformUnitsConsumed: number;
}

/**
 * Response from the trace-level per-agent unit consumption.
 */
export interface AgentTraceUnitConsumptionResponse {
  /** Per-agent consumption totals. May be absent when no data matches. */
  data?: AgentTraceUnitConsumption[];
}

/**
 * Options for the trace-level per-agent unit consumption.
 */
export interface AgentTraceUnitConsumptionOptions extends AgentTraceFilterOptions {}

/**
 * A single span record from the trace store.
 *
 * `attributes` and `context` are raw JSON strings — parse them with
 * `JSON.parse()`. `status`, `source`, `spanType`, `verbosityLevel`, and
 * `compressionType` are returned as strings (the API parses them to enums
 * internally; no fixed value set is exposed).
 */
export interface SpanResponse {
  /** Span ID. */
  id: string;
  /** ID of the trace this span belongs to. */
  traceId: string;
  /** Parent span ID. `null` for a root span. */
  parentId: string | null;
  /** Span name. */
  name: string;
  /** Span start time (ISO 8601, UTC). */
  startTime: string;
  /** Span end time (ISO 8601, UTC). `null` while the span is in progress. */
  endTime: string | null;
  /** Span attributes as a JSON string — parse with `JSON.parse()`. */
  attributes: string;
  /** Span status. */
  status: string;
  /** Organization ID (GUID). */
  organizationId: string;
  /** Tenant ID (GUID). May be `null`. */
  tenantId: string | null;
  /** Span retention expiry time (ISO 8601, UTC). May be `null`. */
  expiryTimeUtc: string | null;
  /** Folder key (GUID) the span was recorded in. May be `null`. */
  folderKey: string | null;
  /** Span source. May be `null`. */
  source: string | null;
  /** Span type. May be `null`. */
  spanType: string | null;
  /** Process key (GUID). May be `null`. */
  processKey: string | null;
  /** Job key (GUID). May be `null`. */
  jobKey: string | null;
  /** Reference ID (GUID). May be `null`. */
  referenceId: string | null;
  /** Verbosity level. May be `null`. */
  verbosityLevel: string | null;
  /** Record last-updated time (ISO 8601, UTC). */
  updatedAt: string;
  /** Whether the span payload is stored as a large (offloaded) payload. */
  isLargePayload: boolean;
  /** Payload compression type. May be `null`. */
  compressionType: string | null;
  /** Agent version that produced the span. May be `null`. */
  agentVersion: string | null;
  /**
   * Raw span context as a JSON string — parse with `JSON.parse()`. Includes the
   * `ReferenceHierarchy` array matched by the spans-by-reference query.
   * May be `null`.
   */
  context: string | null;
}

/**
 * Options for the spans-by-reference query.
 *
 * Composes the optional hierarchy/time filters with pagination options.
 */
export type SpanGetByReferenceOptions = PaginationOptions & {
  /** Optional trace scope — narrows the scan to a single trace. */
  traceId?: string;
  /** Restrict matches to hierarchy entries with this service type. */
  serviceType?: string;
  /** Restrict matches to hierarchy entries with this version. */
  version?: string;
  /** Inclusive lower bound on span start time. */
  startTime?: Date;
  /** Exclusive upper bound on span end time. */
  endTime?: Date;
  /** Execution type filter — `Debug` (test runs) or `Runtime` (production runs). */
  executionType?: AgentExecutionType;
};
