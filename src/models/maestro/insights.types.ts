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
  /** Time bucketing granularity. If omitted, the API defaults to daily buckets. */
  timeSliceUnit?: TimeSliceUnit;
}

/**
 * A single data point from the InstanceStatusByDate insights query.
 *
 * Each entry represents the count of instances with a given status
 * within a specific time bucket.
 */
export interface InstanceStatusByDateResponse {
  /** Start of the time bucket (formatted date string) */
  startTime: string;
  /** Instance status (e.g., "Completed", "Faulted", "Cancelled") */
  status: string;
  /** Number of instances with this status in the time bucket */
  count: number;
}
