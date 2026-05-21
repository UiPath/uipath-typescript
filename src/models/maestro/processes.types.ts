/**
 * Maestro Process Types
 * Types and interfaces for Maestro process management
 */

import { GetTopRunCountResponse, GetTopDurationResponse, GetTopFaultedCountResponse } from './insights.types';

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
 * SDK response for top elements with failure.
 * Shared by both MaestroProcesses and Cases — no service-specific enrichment.
 */
export interface ElementGetTopFailureCountResponse {
  /** BPMN element name (falls back to element ID if name is empty) */
  elementName: string;
  /** BPMN element type (e.g. ServiceTask, ReceiveTask, IntermediateCatchEvent) */
  elementType: string;
  /** The unique process key this element belongs to */
  processKey: string;
  /** Number of failed executions of this element in the given time range */
  failureCount: number;
}

/**
 * Response for a single entry in top processes by duration
 */
export interface ProcessGetTopDurationResponse extends GetTopDurationResponse {
  /** Human-readable process name */
  name: string;
}
