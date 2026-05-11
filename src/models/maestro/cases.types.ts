/**
 * Maestro Cases Types
 * Types and interfaces for Maestro case management
 */

/**
 * Options for looking up a single case process by name.
 *
 * Maestro's `/processes/summary` endpoint only sends `folderKey` on the wire,
 * but the SDK accepts `folderPath` and matches it client-side against the
 * `folderName` field returned by `getAll()` for API parity with Orchestrator
 * services. When neither is supplied, the SDK falls back to the init-time
 * folderKey (e.g. from the `uipath:folder-key` meta tag in coded-app
 * deployments).
 */
export interface CaseGetByNameOptions {
  /**
   * Folder path that scopes the lookup. Matched client-side against the
   * `folderName` field returned by Maestro.
   */
  folderPath?: string;
  /** Folder key (GUID) that scopes the lookup. */
  folderKey?: string;
}

/**
 * Case information with instance statistics
 */
export interface CaseGetAllResponse {
  /** Unique key identifying the case process */
  processKey: string;
  /** Package identifier */
  packageId: string;
  /** Case name */
  name: string;
  /** Folder key of the folder where case process is located */
  folderKey: string;
  /** Name of the folder where case process is located */
  folderName: string;
  /** Available package versions */
  packageVersions: string[];
  /** Total number of versions */
  versionCount: number;
  /** Case instance count - pending */
  pendingCount: number;
  /** Case instance count - running */
  runningCount: number;
  /** Case instance count - completed */
  completedCount: number;
  /** Case instance count - paused */
  pausedCount: number;
  /** Case instance count - cancelled */
  cancelledCount: number;
  /** Case instance count - faulted */
  faultedCount: number;
  /** Case instance count - retrying */
  retryingCount: number;
  /** Case instance count - resuming */
  resumingCount: number;
  /** Case instance count - pausing */
  pausingCount: number;
  /** Case instance count - canceling */
  cancelingCount: number;
}