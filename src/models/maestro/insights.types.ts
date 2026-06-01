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
 * Response for the top duration Insights endpoint
 */
export interface GetTopDurationResponse extends GetTopBaseResponse {
  /** Total execution duration in milliseconds */
  duration: number;
}

/**
 * Instance count aggregated by status for a process or case within a time range.
 */
export interface InstanceCountByStatusResponse {
  /** Total number of instances across all statuses */
  countOfAllInstances: number;
  /** Number of currently running instances */
  countOfRunning: number;
  /** Number of instances in transitioning state */
  countOfTransitioning: number;
  /** Number of paused instances */
  countOfPaused: number;
  /** Number of faulted instances */
  countOfFaulted: number;
  /** Number of completed instances */
  countOfCompleted: number;
  /** Number of cancelled instances */
  countOfCancelled: number;
  /** Number of deleted instances */
  countOfDeleted: number;
  /** Average execution duration in milliseconds */
  avgDurationInMs: number;
}

/**
 * Element count by status for a BPMN element within a process or case
 */
export interface ElementStats {
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

