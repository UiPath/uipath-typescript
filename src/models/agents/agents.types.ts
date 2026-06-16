import type { PaginationOptions } from '../../utils/pagination/types';

/**
 * Filter fields shared by agent endpoints that accept a
 * folder/agent/project scope (`/Agents/agents`, `/Agents/errors`, etc.).
 */
export interface AgentFilterOptions {
  /** Optional folder keys to scope the lookup. Intersected with the user's accessible folders. */
  folderKeys?: string[];
  /** Filter to specific agent names. */
  agentNames?: string[];
  /** Filter to specific project keys. */
  projectKeys?: string[];
  /** Filter to a single agent by ID. */
  agentId?: string;
  /** Filter to a specific process version. */
  processVersion?: string;
}

/**
 * Columns available for ordering results.
 */
export enum AgentListSortColumn {
  AgentName = 'AgentName',
  ParentProcess = 'ParentProcess',
  LastRun = 'LastRun',
  HealthScore = 'HealthScore',
  LastIncident = 'LastIncident',
  FolderName = 'FolderName',
  /** Quantity of AGU (Agent Units) consumed */
  QuantityAGU = 'QuantityAGU',
  /** Quantity of PLTU (Platform Units) consumed */
  QuantityPLTU = 'QuantityPLTU',
  FolderPath = 'FolderPath',
}

/**
 * Ordering directive for the agents list.
 */
export interface AgentListOrderBy {
  /** Column to sort by */
  column: AgentListSortColumn;
  /** Sort descending. Defaults to false. */
  desc?: boolean;
}

/**
 * One row in the agents list - agent identity plus consumption and health metadata aggregated over the
 * requested time window.
 */
export interface AgentListItem {
  /** Agent ID */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Parent process name. May be `null` or `""` for jobs not bound to a parent process. */
  parentProcess: string | null;
  /** Folder key of the folder the agent runs in. May be `null` or `""`. */
  folderKey: string | null;
  /** Folder display name. May be `null` or `""`. */
  folderName: string | null;
  /** Fully qualified folder path. May be `null` or `""`. */
  folderPath: string | null;
  /** Last run timestamp */
  lastRun: string;
  /** Process key. May be `null` or `""` for ad-hoc jobs. */
  processKey: string | null;
  /** Process version. May be `null` or `""`. */
  processVersion: string | null;
  /** Health score (0-100) */
  healthScore: number;
  /** Last incident type label. May be `null` or `""`. */
  lastIncidentType: string | null;
  /** Total units consumed by this agent in the window */
  unitsQuantity: number;
  /** Display name of the units (if any). May be `null` or `""`. */
  unitsName: string | null;
  /** Quantity of AGU (Agent Units) consumed by this agent */
  quantityAGU: number;
  /** Quantity of PLTU (Platform Units) consumed by this agent */
  quantityPLTU: number;
}

/**
 * Options for getting the list of agents.
 *
 * Composes filter, pagination, and sort options.
 */
export type AgentGetAllOptions = AgentFilterOptions & PaginationOptions & {
  /** Sort order for the result set. */
  orderBy?: AgentListOrderBy;
};

/**
 * Summary information about a single job execution — included on every
 * error entry to anchor the window.
 */
export interface AgentJobInfo {
  /** Job key */
  jobKey: string;
  /** Folder key the job ran in */
  folderKey: string;
  /** Display name of the folder */
  folderName: string;
  /** Fully qualified folder path */
  folderPath: string;
  /** Job start time */
  startTime: string;
  /** Job end time. `null` while the job is still running. */
  endTime: string | null;
  /** Process key the job was launched from. `null` for ad-hoc jobs. */
  processKey: string | null;
}

/**
 * Columns available for ordering / grouping the agent errors list.
 */
export enum AgentErrorSortColumn {
  AgentId = 'AgentId',
  AgentName = 'AgentName',
  ParentProcessName = 'ParentProcessName',
  ErrorTitle = 'ErrorTitle',
  FirstSeenStartTime = 'FirstSeenStartTime',
  ExecutionCount = 'ExecutionCount',
  Type = 'Type',
  FirstSeenFolderName = 'FirstSeenFolderName',
  FirstSeenFolderPath = 'FirstSeenFolderPath',
  LastSeenStartTime = 'LastSeenStartTime',
  LastSeenFolderName = 'LastSeenFolderName',
  LastSeenFolderPath = 'LastSeenFolderPath',
}

/**
 * Ordering directive for the agent errors list.
 */
export interface AgentErrorOrderBy {
  /** Column to sort by */
  column: AgentErrorSortColumn;
  /** Sort descending. Defaults to false (ascending) server-side. */
  desc?: boolean;
}

/**
 * One error in the agent errors list — an error/error-class observed
 * for an agent over the requested window.
 */
export interface AgentError {
  /** Error type */
  type: string;
  /** Error description */
  description: string;
  /** Agent ID */
  agentId: string;
  /** Agent display name. `null` if the agent has no display name set. */
  agentName: string | null;
  /** Job key where the error was first seen */
  jobKey: string;
  /** Parent process name. `null` for jobs not bound to a parent process. */
  parentProcess: string | null;
  /** First-seen timestamp */
  firstSeen: string;
  /** Folder key where the error was first observed */
  folderKey: string;
  /** Folder display name */
  folderName: string;
  /** Fully qualified folder path */
  folderPath: string;
  /** Number of error executions counted for this error */
  count: number;
  /** First job in the window where this error was observed */
  firstSeenJob: AgentJobInfo;
  /** Last job in the window where this error was observed */
  lastSeenJob: AgentJobInfo;
}

/**
 * Options for the agent errors list.
 *
 * Composes filter, pagination, and sort/group options.
 */
export type AgentGetErrorsOptions = AgentFilterOptions & PaginationOptions & {
  /** Sort order for the result set. */
  orderBy?: AgentErrorOrderBy;
  /** Group results by one or more columns. */
  groupBy?: AgentErrorSortColumn[];
};

/**
 * A single point on the agent errors timeline
 */
export interface AgentGetErrorsTimelineResponse {
  /** Agent name */
  name: string;
  /** Error count in this time bucket */
  value: number;
  /** Bucket timestamp (ISO 8601, UTC) */
  date: string;
}

/**
 * Options for getting the agent errors timeline.
 */
export interface AgentGetErrorsTimelineOptions extends AgentFilterOptions {
  /** Max number of agents to return. Defaults to 10 server-side. */
  limit?: number;
}

/**
 * A single point on the agent consumption timeline
 */
export interface AgentGetConsumptionTimelineResponse {
  /** Bucket timestamp (ISO 8601, UTC) */
  timeSlice: string;
  /** AGU quantity consumed in this time bucket */
  aguConsumption: number;
}

/**
 * Options for getting the agent consumption timeline.
 */
export interface AgentGetConsumptionTimelineOptions extends AgentFilterOptions {}

/**
 * A single point on the agent latency timeline
 */
export interface AgentGetLatencyTimelineResponse {
  /**
   * Percentile label for this point — observed values: `"P50"`, `"P95"`.
   */
  name: string;
  /** Latency value in milliseconds. */
  value: number;
  /** Bucket timestamp (ISO 8601, UTC) */
  date: string;
}

/**
 * Options for getting the agent latency timeline.
 */
export interface AgentGetLatencyTimelineOptions extends AgentFilterOptions {}
