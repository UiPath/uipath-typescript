/**
 * Insights Types
 * Shared types for Maestro insights analytics endpoints
 */

/**
 * Common fields returned by all Insights "top" endpoints
 */
export interface InsightsGetTopBaseResponse {
  /** The package identifier */
  packageId: string;
  /** The unique process key */
  processKey: string;
}

/**
 * Response for the top run count Insights endpoint
 */
export interface InsightsGetTopRunCountResponse extends InsightsGetTopBaseResponse {
  /** Number of times the process was run in the given time range */
  runCount: number;
}
