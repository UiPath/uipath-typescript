/**
 * Insights Types
 * Shared types for Maestro insights analytics endpoints
 */

/**
 * Optional filters for Insights "top" endpoint queries.
 * All fields are optional — pass any combination to narrow results.
 */
export interface TopQueryOptions {
  /** Filter by package identifier */
  packageId?: string;
  /** Filter by process key */
  processKey?: string;
  /** Filter by package version */
  version?: string;
}

/**
 * Common fields returned by all Insights "top" endpoints
 */
export interface GetTopBaseResponse {
  /** The package identifier */
  packageId: string;
  /** The unique process key */
  processKey: string;
}

/**
 * Response for the top run count Insights endpoint
 */
export interface GetTopRunCountResponse extends GetTopBaseResponse {
  /** Number of times the process was run in the given time range */
  runCount: number;
}

/**
 * Response for the top failure count Insights endpoint
 */
export interface GetTopFaultedCountResponse extends GetTopBaseResponse {
  /** Number of faulted instances in the given time range */
  faultedCount: number;
}

/**
 * SDK response for top elements with failure.
 * Shared by both MaestroProcesses and Cases — no service-specific enrichment.
 */
export interface ElementGetTopFailedCountResponse {
  /** BPMN element name (falls back to element ID if name is empty) */
  elementName: string;
  /** BPMN element type (e.g. ServiceTask, ReceiveTask, IntermediateCatchEvent) */
  elementType: string;
  /** The unique process key this element belongs to */
  processKey: string;
  /** Number of failed executions of this element in the given time range */
  failedCount: number;
}

/**
 * Time bucketing granularity for insights time-series queries.
 *
 * Controls how data points are grouped on the time axis.
 */
export enum TimeInterval {
  /** Group data points by hour */
  Hour = 'HOUR',
  /** Group data points by day */
  Day = 'DAY',
  /** Group data points by week */
  Week = 'WEEK',
}

/**
 * Options for insights time-series queries.
 */
export interface TimelineOptions {
  /**
   * How to group data points on the time axis.
   * @default TimeInterval.Day
   */
  groupBy?: TimeInterval;
}

/**
 * Final instance statuses returned by the instance status timeline endpoint.
 *
 * Only includes statuses where the instance has finished execution — Completed, Faulted, or Cancelled.
 * Active statuses like Running or Paused are not included.
 */
export enum InstanceFinalStatus {
  /** Instance completed successfully */
  Completed = 'Completed',
  /** Instance encountered an error */
  Faulted = 'Faulted',
  /** Instance was cancelled */
  Cancelled = 'Cancelled',
}

/**
 * Instance count for a process with a given status
 * within a specific time bucket.
 */
export interface InstanceStatusTimelineResponse {
  /** Start of the time bucket in local timezone (e.g. `"5/8/2026 12:00:00 AM"`) */
  startTime: string;
  /** Instance status */
  status: InstanceFinalStatus;
  /** Number of instances with this status in the time bucket */
  count: number;
}

/**
 * Incident count within a specific time bucket.
 */
export interface IncidentTimelinePoint {
  /** Start of the time bucket (ISO timestamp, e.g. `"2026-05-04T00:00:00"`) */
  startTime: string;
  /** End of the time bucket (ISO timestamp, e.g. `"2026-05-11T00:00:00"`) */
  endTime: string;
  /** Number of incidents that occurred within this time bucket */
  count: number;
}

/**
 * Response for the top duration Insights endpoint
 */
export interface GetTopDurationResponse extends GetTopBaseResponse {
  /** Total execution duration in milliseconds */
  duration: number;
}

/**
 * Duration percentile stats shared by Insights aggregate endpoints (per-element and per-process/case).
 *
 * For instance-level stats, durations are computed over terminal instances only
 * (Completed, Cancelled, Deleted) and default to `0` when no terminal instances exist.
 */
export interface DurationStats {
  /** Minimum duration in milliseconds */
  minDurationMs: number;
  /** Maximum duration in milliseconds */
  maxDurationMs: number;
  /** Average duration in milliseconds */
  avgDurationMs: number;
  /** 50th percentile (median) duration in milliseconds */
  p50DurationMs: number;
  /** 95th percentile duration in milliseconds */
  p95DurationMs: number;
  /** 99th percentile duration in milliseconds */
  p99DurationMs: number;
}

/**
 * Instance count and duration stats aggregated by status for a process or case within a time range.
 *
 * Duration fields are computed over terminal instances only (Completed, Cancelled, Deleted)
 * and default to `0` when no terminal instances exist in the time range.
 */
export interface InstanceStats extends DurationStats {
  /** Total number of instances across all statuses */
  totalCount: number;
  /** Number of currently running instances */
  runningCount: number;
  /** Number of instances in transitioning state */
  transitioningCount: number;
  /** Number of paused instances */
  pausedCount: number;
  /** Number of faulted instances */
  faultedCount: number;
  /** Number of completed instances */
  completedCount: number;
  /** Number of cancelled instances */
  cancelledCount: number;
  /** Number of deleted instances */
  deletedCount: number;
}

/**
 * Required request parameters for process-scoped insights stats endpoints
 * (`getElementStats`, `getInstanceStats`).
 *
 * Identifies a single process+package+version and the time range to aggregate over.
 */
export interface MaestroProcessStatsRequest {
  /** Process key to filter by */
  processKey: string;
  /** Package identifier */
  packageId: string;
  /** Package version to filter by */
  packageVersion: string;
  /** Start of the time range to query */
  startTime: Date;
  /** End of the time range to query */
  endTime: Date;
}

/**
 * Per-element execution counts and duration percentiles for a BPMN element within a process or case.
 */
export interface ElementStats extends DurationStats {
  /** BPMN element identifier */
  elementId: string;
  /** Number of successful executions */
  successCount: number;
  /** Number of failed executions */
  failCount: number;
  /** Number of terminated executions */
  terminatedCount: number;
  /** Number of paused executions */
  pausedCount: number;
  /** Number of in-progress executions */
  inProgressCount: number;
}

