import type { PaginationOptions } from '../../../../utils/pagination/types';

/**
 * Job execution mode filter — `Debug` (test runs) or `Runtime` (production runs).
 */
export enum AgentTraceExecutionType {
  Debug = 'Debug',
  Runtime = 'Runtime',
}

/**
 * Filter fields shared by the trace-level agent endpoints
 */
export interface AgentTraceFilterOptions {
  /** Inclusive lower bound for the query window. Omit to use the server default (1 year ago). */
  startTime?: Date;
  /** Exclusive upper bound for the query window. Omit to use the server default (now). */
  endTime?: Date;
  /** Folder keys to scope the query. Intersected with the user's accessible folders. */
  folderKeys?: string[];
  /** Filter to a single agent by ID. */
  agentId?: string;
  /** Filter to a specific agent version. */
  agentVersion?: string;
  /** Filter to a specific execution type. */
  executionType?: AgentTraceExecutionType;
}

/**
 * One point on the trace-level errors timeline — error count for a single
 * (error name, time bucket).
 */
export interface AgentTraceGetErrorsTimelineResponse {
  /** Error name / category for this time-slice. */
  name: string;
  /** Count of errors in this time bucket for this name. */
  value: number;
  /** Bucket timestamp. */
  date: string;
}

/**
 * Options for the trace-level errors timeline.
 */
export interface AgentTraceGetErrorsTimelineOptions extends AgentTraceFilterOptions {}

/**
 * One point on the trace-level latency timeline — a latency value for a single
 * (series, time bucket).
 */
export interface AgentTraceGetLatencyTimelineResponse {
  /** Series/grouping name for this latency point. */
  name: string;
  /** Latency value in decimal seconds for this series and time bucket. */
  value: number;
  /** Bucket timestamp. */
  date: string;
}

/**
 * Options for the trace-level latency timeline.
 */
export interface AgentTraceGetLatencyTimelineOptions extends AgentTraceFilterOptions {}

/**
 * Per-agent unit consumption totals over the requested window (trace-level) —
 * a flat per-(agent, version, folder) breakdown of AGU and PLTU consumed.
 */
export interface AgentTraceGetUnitConsumptionResponse {
  /** Agent ID these totals belong to. */
  agentId: string;
  /** Folder key (GUID) the consumption was recorded in. */
  folderKey: string;
  /** Agent version these totals belong to. */
  agentVersion: string;
  /** Agent units consumed over the window. */
  agentUnitsConsumed: number;
  /** Platform units consumed over the window. */
  platformUnitsConsumed: number;
}

/**
 * Options for the trace-level per-agent unit consumption.
 */
export interface AgentTraceGetUnitConsumptionOptions extends AgentTraceFilterOptions {}

/**
 * A single span record from the trace store.
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
  /** Span start time. */
  startTime: string;
  /** Span end time. `null` while the span is in progress. */
  endTime: string | null;
  /** Span attributes. */
  attributes: string;
  /** Span status. */
  status: string;
  /** Organization ID (GUID). */
  organizationId: string;
  /** Tenant ID (GUID). May be `null`. */
  tenantId: string | null;
  /** Span retention expiry time. May be `null`. */
  expiredTime: string | null;
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
  /** Record last-updated time. */
  updatedAt: string;
  /** Whether the span payload is stored as a large payload. */
  isLargePayload: boolean;
  /** Payload compression type. May be `null`. */
  compressionType: string | null;
  /** Agent version that produced the span. May be `null`. */
  agentVersion: string | null;
  /**
   * Raw span context as a JSON string.
   * May be `null`.
   */
  context: string | null;
}

/**
 * Options for the spans-by-reference query.
 *
 * Composes the optional hierarchy/time filters with pagination options.
 */
export type AgentTraceGetSpansByReferenceOptions = PaginationOptions & {
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
  /** Execution type filter */
  executionType?: AgentTraceExecutionType;
};
