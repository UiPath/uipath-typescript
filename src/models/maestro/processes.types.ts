/**
 * Maestro Process Types
 * Types and interfaces for Maestro process management
 */

/**
 * Options for looking up a single Maestro process by name.
 *
 * Maestro's `/processes/summary` endpoint only sends `folderKey` on the wire,
 * but the SDK accepts `folderPath` and matches it client-side against the
 * `folderName` field returned by `getAll()` for API parity with Orchestrator
 * services. When neither is supplied, the SDK falls back to the init-time
 * folderKey (e.g. from the `uipath:folder-key` meta tag in coded-app
 * deployments).
 */
export interface MaestroProcessGetByNameOptions {
  /**
   * Folder path that scopes the lookup. Matched client-side against the
   * `folderName` field returned by Maestro.
   */
  folderPath?: string;
  /** Folder key (GUID) that scopes the lookup. */
  folderKey?: string;
}

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

