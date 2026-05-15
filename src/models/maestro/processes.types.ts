/**
 * Maestro Process Types
 * Types and interfaces for Maestro process management
 */

/**
 * Process information with instance statistics
 */
export interface RawMaestroProcessGetAllResponse {
  /** Unique key identifying the process */
  processKey: string;
  /** Package identifier */
  packageId: string;
  /** Process name */
  name: string;
  /** Folder key where process is located */
  folderKey: string;
  /** Folder name */
  folderName: string;
  /** Available package versions */
  packageVersions: string[];
  /** Total number of versions */
  versionCount: number;
  /** Process instance count - pending */
  pendingCount: number;
  /** Process instance count - running */
  runningCount: number;
  /** Process instance count - completed */
  completedCount: number;
  /** Process instance count - paused */
  pausedCount: number;
  /** Process instance count - cancelled */
  cancelledCount: number;
  /** Process instance count - faulted */
  faultedCount: number;
  /** Process instance count - retrying */
  retryingCount: number;
  /** Process instance count - resuming */
  resumingCount: number;
  /** Process instance count - pausing */
  pausingCount: number;
  /** Process instance count - canceling */
  cancelingCount: number;
}

/**
 * Response for a single entry in top processes by run count
 */
export interface TopProcessesResponse {
  /** The package identifier of the process */
  packageId: string;
  /** Number of times the process was run in the given time range */
  runCount: number;
  /** The unique process key */
  processKey: string;
}

