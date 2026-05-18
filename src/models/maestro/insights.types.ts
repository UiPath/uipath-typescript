/**
 * Insights Types
 * Shared types for Maestro insights analytics endpoints
 */

/**
 * Raw API response for a single entry in top processes by run count
 */
export interface RawGetTopResponse {
  /** The package identifier of the process */
  packageId: string;
  /** Number of times the process was run in the given time range */
  runCount: number;
  /** The unique process key */
  processKey: string;
}

/**
 * Response for a single entry in top processes by run count
 */
export interface ProcessGetTopResponse extends RawGetTopResponse {
  /** Human-readable process name */
  name: string;
}

/** Response for a single entry in top cases by run count */
export interface CaseGetTopResponse {
  /** Human-readable case name */
  name: string;
  /** The package identifier of the case process */
  packageId: string;
  /** Number of times the case was run in the given time range */
  runCount: number;
  /** The unique process key */
  processKey: string;
}
