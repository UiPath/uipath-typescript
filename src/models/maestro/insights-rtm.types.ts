/**
 * Response item for top processes by run count
 */
export interface TopProcessByRunCountResponse {
  /** The package identifier for the process */
  packageId: string;
  /** The number of runs within the requested time range */
  runCount: number;
  /** The unique process key */
  processKey: string;
}

/**
 * Options for getting top processes by run count
 */
export interface TopByRunCountOptions {
  /** Timezone offset in minutes from UTC (e.g., 330 for IST, -300 for EST) */
  timezoneOffset?: number;
}
