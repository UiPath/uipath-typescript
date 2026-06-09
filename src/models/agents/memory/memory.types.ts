/**
 * Types for the Agent Memory metrics service.
 */

/**
 * Execution kind to filter Agent Memory queries by. Omit to include both
 * Debug and Runtime executions.
 */
export enum ExecutionType {
  /** Executions produced during agent debugging sessions. */
  Debug = 'Debug',
  /** Executions produced during production runtime. */
  Runtime = 'Runtime',
}

/**
 * Common time-window and scope filters shared by Agent Memory queries.
 *
 * All fields are optional. When `startTime`/`endTime` are omitted, the query
 * defaults to the last 24 hours, with `endTime` defaulting to now.
 */
export interface MemoryFilterOptions {
  /** Inclusive lower bound for the query window. Defaults to 24 hours before `endTime` when omitted. */
  startTime?: Date;
  /** Exclusive upper bound for the query window. Defaults to now when omitted. */
  endTime?: Date;
  /** Filter to a single agent by ID. Obtain an `agentId` from the Agents service. */
  agentId?: string;
  /** Filter to a specific agent version. */
  agentVersion?: string;
  /** Folder keys to scope the query. Results are limited to folders you can access. */
  folderKeys?: string[];
  /** Filter to a specific execution kind. Omit to include both Debug and Runtime. */
  executionType?: ExecutionType;
}

/**
 * Options for retrieving the agent-memory state timeline.
 */
export interface MemoryGetTimelineOptions extends MemoryFilterOptions {}

/**
 * Options for retrieving the memory-calls timeline.
 */
export interface MemoryGetCallsTimelineOptions extends MemoryFilterOptions {}

/**
 * Options for retrieving the top memory spaces.
 */
export interface MemoryGetTopSpacesOptions extends MemoryFilterOptions {
  /** Maximum number of memory spaces to return, ranked by memory count. Defaults to 5 when omitted. */
  limit?: number;
}

/**
 * One point on the agent-memory state timeline — memory-state counts for a
 * single time bucket.
 */
export interface MemoryGetTimelineResponse {
  /** Bucket timestamp. */
  timeSlice: string;
  /** Count of memory entries that were in-memory in this bucket. */
  inMemoryCount: number;
  /** Count of memory entries that were not in-memory in this bucket. */
  notInMemoryCount: number;
  /** Total memory entries in this bucket. */
  totalCount: number;
  /** Count of enabled memory entries in this bucket. */
  enabledMemoryCount: number;
  /** Count of disabled memory entries in this bucket. */
  disabledMemoryCount: number;
}

/**
 * One point on the memory-calls timeline — the count of memory calls for a
 * single time bucket.
 */
export interface MemoryGetCallsTimelineResponse {
  /** Bucket timestamp. */
  timeSlice: string;
  /** Number of memory calls in this bucket. */
  memoryCallsCount: number;
}

/**
 * A single memory space with its enabled/disabled memory-entry breakdown.
 */
export interface MemoryGetTopSpacesResponse {
  /** Memory space identifier. */
  memorySpaceId: string;
  /** Memory space display name. */
  memorySpaceName: string;
  /** Total memory entries in this space over the requested window. */
  memoryCount: number;
  /** Count of enabled memory entries in this space. */
  enabledMemoryCount: number;
  /** Count of disabled memory entries in this space. */
  disabledMemoryCount: number;
}
