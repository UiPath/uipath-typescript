/**
 * Insights Types
 * Shared types for Maestro insights analytics endpoints
 */

/**
 * Response for a single entry in top processes by run count
 */
export interface ProcessGetTopResponse {
  /** The package identifier of the process */
  packageId: string;
  /** Number of times the process was run in the given time range */
  runCount: number;
  /** The unique process key */
  processKey: string;
}
