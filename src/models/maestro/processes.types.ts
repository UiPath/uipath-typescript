/**
 * Maestro Process Types
 * Types and interfaces for Maestro process management
 */

import { GetTopRunCountResponse, GetTopDurationResponse, GetTopFaultedCountResponse } from './insights.types';

/**
 * Optional filters for {@link MaestroProcessesServiceModel.getAll}.
 * All fields are optional — pass any combination to narrow the returned processes.
 */
export interface MaestroProcessGetAllOptions {
  /** Filter by process key */
  processKey?: string;
  /** Filter by package identifier */
  packageId?: string;
  /** Only include processes with instances started at or after this time */
  startTime?: Date;
  /** Only include processes with instances started at or before this time */
  endTime?: Date;
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

/**
 * Response for a single entry in top processes by run count
 */
export interface ProcessGetTopRunCountResponse extends GetTopRunCountResponse {
  /** Human-readable process name */
  name: string;
}

/**
 * Response for a single entry in top processes by failure count
 */
export interface ProcessGetTopFaultedCountResponse extends GetTopFaultedCountResponse {
  /** Human-readable process name */
  name: string;
}

/**
 * Response for a single entry in top processes by duration
 */
export interface ProcessGetTopDurationResponse extends GetTopDurationResponse {
  /** Human-readable process name */
  name: string;
}
