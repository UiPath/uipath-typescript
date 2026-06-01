/**
 * Types for the Agent Memory (Traceview) analytics service.
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
 * All fields are optional. When `startTime`/`endTime` are omitted, the server
 * applies default bounds (typically the last 24 hours, with `endTime`
 * defaulting to now).
 */
export interface MemoryFilterOptions {
  /** Inclusive lower bound for the query window (ISO 8601, UTC). Defaults server-side when omitted. */
  startTime?: string;
  /** Exclusive upper bound for the query window (ISO 8601, UTC). Defaults to now server-side when omitted. */
  endTime?: string;
  /** Filter to a single agent by ID. */
  agentId?: string;
  /** Filter to a specific agent version. */
  agentVersion?: string;
  /** Folder keys (GUIDs) to scope the query. Intersected with the caller's accessible folders. */
  folderKeys?: string[];
  /** Filter to a specific execution kind. Omit to include both Debug and Runtime. */
  executionType?: ExecutionType;
}

/**
 * Options for {@link MemoryServiceModel.getMemoryTimeline}.
 */
export interface MemoryTimelineGetOptions extends MemoryFilterOptions {}

/**
 * One point on the agent-memory state timeline — memory-state counts for a
 * single time bucket.
 */
export interface MemoryTimelinePoint {
  /** Bucket timestamp (ISO 8601, UTC). */
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
 * Response from {@link MemoryServiceModel.getMemoryTimeline}.
 */
export interface MemoryTimelineResponse {
  /** Time-series points, one per bucket. May be absent when no data matches. */
  data?: MemoryTimelinePoint[];
}
