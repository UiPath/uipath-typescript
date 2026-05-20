/**
 * Insights Types
 * Shared types for Maestro insights analytics endpoints
 */

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
 * Time bucketing granularity for insights time-series queries.
 *
 * Controls how data points are grouped on the time axis.
 */
export enum TimeSliceUnit {
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
export interface MaestroInsightsOptions {
  /** Time bucketing granularity. Defaults to {@link TimeSliceUnit.Day} if not provided. */
  timeSliceUnit?: TimeSliceUnit;
}

/**
 * Terminal instance statuses returned by the instance status timeline endpoint.
 *
 * This is a subset of the full instance status set — the backend SQL query
 * filters to only these three terminal statuses.
 */
export enum InsightInstanceStatus {
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
  /** Start of the time bucket (e.g. `"5/8/2026 12:00:00 AM"`) */
  startTime: string;
  /** Instance status */
  status: InsightInstanceStatus;
  /** Number of instances with this status in the time bucket */
  count: number;
}
