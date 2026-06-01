import type { PaginationOptions } from '../../utils/pagination/types';

/**
 * Response from {@link AgentServiceModel.getNames}.
 */
export interface AgentNamesGetAllResponse {
  /** Distinct agent names on the given tenant. */
  agents: string[];
}

/**
 * Options for {@link AgentServiceModel.getNames}.
 */
export interface AgentNamesGetAllOptions {
  /** Optional folder keys (GUIDs) to scope the agent name lookup */
  folderKeys?: string[];
}

/**
 * Filter fields shared by agent insights endpoints that accept a
 * folder/agent/project scope (`/Agents/errors`, `/Agents/topErroredAgents`, etc.).
 */
export interface AgentFilterOptions {
  /** Optional folder keys (GUIDs) to scope the lookup. Intersected with the caller's accessible folders. */
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
 * One point on an agent's errors timeline — error count for a single time bucket.
 */
export interface AgentErrorsTimelinePoint {
  /** Agent name */
  name: string;
  /** Error count in this time bucket */
  value: number;
  /** Bucket timestamp (ISO 8601, UTC) */
  date: string;
}

/**
 * Response from {@link AgentServiceModel.getErrorsTimeline}.
 */
export interface AgentErrorsTimelineResponse {
  /** Time-series points, one per (agent, time bucket). May be absent when no data matches. */
  data?: AgentErrorsTimelinePoint[];
}

/**
 * Options for {@link AgentServiceModel.getErrorsTimeline}.
 */
export interface AgentErrorsTimelineOptions extends AgentFilterOptions {
  /** Max number of agents to return. Defaults to 10 server-side. */
  limit?: number;
}

/**
 * Summary information about a single job execution — included on every
 * top-errored agent and incident entry to anchor the window.
 */
export interface AgentJobInfo {
  /** Job key (GUID) */
  jobKey: string;
  /** Folder key (GUID) the job ran in */
  folderKey: string;
  /** Display name of the folder */
  folderName: string;
  /** Fully qualified folder path */
  folderPath: string;
  /** Job start time (ISO 8601, UTC) */
  startTime: string;
  /** Job end time (ISO 8601, UTC). `null` while the job is still running. */
  endTime: string | null;
  /** Process key (GUID) the job was launched from. `null` for ad-hoc jobs. */
  processKey: string | null;
}

/**
 * One entry in the top-errored agents list — one agent with its error count
 * and first/last observed failing jobs.
 */
export interface AgentTopErroredAgent {
  /** Agent name */
  name: string;
  /** Error count for this agent over the requested window */
  count: number;
  /** Agent ID (GUID) */
  agentId: string;
  /** First job in the window where this agent reported errors */
  firstSeenJob: AgentJobInfo;
  /** Last job in the window where this agent reported errors */
  lastSeenJob: AgentJobInfo;
}

/**
 * Response from {@link AgentServiceModel.getTopErroredAgents}.
 */
export interface AgentTopErroredAgentsResponse {
  /** Total error count across all agents in the window. */
  totalErrors?: number;
  /** Top-N agents ranked by error count. May be absent when no data matches. */
  data?: AgentTopErroredAgent[];
}

/**
 * Options for {@link AgentServiceModel.getTopErroredAgents}.
 */
export interface AgentTopErroredAgentsOptions extends AgentFilterOptions {
  /** Max number of agents to return. Defaults to 10 server-side. */
  limit?: number;
}

/**
 * Columns available for ordering / grouping {@link AgentServiceModel.getIncidents} results.
 */
export enum AgentIncidentSortColumn {
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
 * Ordering directive for {@link AgentServiceModel.getIncidents}.
 */
export interface AgentIncidentOrderBy {
  /** Column to sort by */
  column: AgentIncidentSortColumn;
  /** Sort descending. Defaults to false (ascending) server-side. */
  desc?: boolean;
}

/**
 * One incident in the agent incidents list — an error/error-class observed
 * for an agent over the requested window.
 */
export interface AgentIncident {
  /** Incident type (e.g., "Error") */
  type: string;
  /** Human-readable error description */
  description: string;
  /** Agent ID (GUID) */
  agentId: string;
  /** Agent display name. `null` if the agent has no friendly name set. */
  agentName: string | null;
  /** Job key (GUID) where the incident was first seen */
  jobKey: string;
  /** Parent process name. `null` for jobs not bound to a parent process. */
  parentProcess: string | null;
  /** First-seen timestamp (ISO 8601, UTC) */
  firstSeen: string;
  /** Folder key (GUID) where the incident was first observed */
  folderKey: string;
  /** Folder display name */
  folderName: string;
  /** Fully qualified folder path */
  folderPath: string;
  /** Number of error executions counted for this incident */
  count: number;
  /** First job in the window where this incident was observed */
  firstSeenJob: AgentJobInfo;
  /** Last job in the window where this incident was observed */
  lastSeenJob: AgentJobInfo;
}

/**
 * Extra envelope field returned by {@link AgentServiceModel.getIncidents} on top
 * of the standard paginated response — the sum of error counts across all
 * matching incidents, independent of pagination.
 */
export interface AgentIncidentsTotals {
  /** Total error count across all incidents in the window (independent of pagination) */
  totalErrorCount?: number;
}

/**
 * Options for {@link AgentServiceModel.getIncidents}.
 *
 * Composes filter, pagination, and sort/group options.
 */
export type AgentIncidentsOptions = AgentFilterOptions & PaginationOptions & {
  /** Sort order for the result set. */
  orderBy?: AgentIncidentOrderBy;
  /** Group results by one or more columns. */
  groupBy?: AgentIncidentSortColumn[];
};

/**
 * Agent type filter. The API accepts one or more values combined into a
 * comma-separated string; the SDK accepts an array and serializes it for you.
 */
export enum AgentType {
  Autonomous = 'Autonomous',
  Conversational = 'Conversational',
  Coded = 'Coded',
}

/**
 * Per-agent consumption entry returned by {@link AgentServiceModel.getTopConsumingAgents}.
 */
export interface AgentConsumption {
  /** Agent ID (GUID) */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Total quantity consumed by this agent. `null` if no consumption is recorded. */
  consumedQuantity: number | null;
  /** AGU quantity consumed. `null` if no consumption is recorded. */
  consumedAGUQuantity: number | null;
  /** PLTU quantity consumed. `null` if no consumption is recorded. */
  consumedPLTUQuantity: number | null;
  /** First job in the window where this agent recorded consumption */
  firstSeenJob: AgentJobInfo;
  /** Last job in the window where this agent recorded consumption */
  lastSeenJob: AgentJobInfo;
}

/**
 * Response from {@link AgentServiceModel.getTopConsumingAgents}.
 *
 * The API wraps this payload in a `data` envelope; the SDK unwraps it so the
 * fields below are returned directly.
 */
export interface AgentTopConsumingAgentsResponse {
  /**
   * Window start date as the API returned it.
   *
   * Format: .NET default `M/d/yyyy h:mm:ss tt` (e.g., `"5/1/2025 12:00:00 AM"`)
   * — NOT ISO 8601. Use `new Date(value)` to parse into a Date.
   */
  startDate?: string;
  /** Window end date. Same format as `startDate`. */
  endDate?: string;
  /** Total quantity consumed across all matching agents in the window. */
  totalConsumed?: number;
  /** Total AGU quantity consumed. */
  totalAGUConsumed?: number;
  /** Total PLTU quantity consumed. */
  totalPLTUConsumed?: number;
  /** Limit applied (echoed from the request). */
  limit?: number;
  /** Top-N agents ranked by consumption. May be absent when no data matches. */
  agents?: AgentConsumption[];
}

/**
 * Options for {@link AgentServiceModel.getTopConsumingAgents}.
 */
export interface AgentTopConsumingAgentsOptions extends AgentFilterOptions {
  /** Max number of agents to return. Defaults to 10 server-side. */
  limit?: number;
  /**
   * Health-based filter. `true` returns only healthy agents, `false` only
   * unhealthy. Omit to include both.
   */
  healthy?: boolean;
  /**
   * Health-score cutoff used when `healthy` is set. Defaults to 75.0
   * server-side.
   */
  healthThreshold?: number;
  /**
   * Filter to specific agent types. Multiple types are combined with `OR` and
   * sent to the API as a comma-separated string.
   */
  agentTypes?: AgentType[];
}

/**
 * One point on an agent's consumption timeline — AGU consumption for a single
 * time bucket.
 */
export interface AgentConsumptionTimelinePoint {
  /** Bucket timestamp (ISO 8601, UTC) */
  timeSlice: string;
  /** AGU quantity consumed in this time bucket */
  aguConsumption: number;
}

/**
 * Response from {@link AgentServiceModel.getConsumptionTimeline}.
 */
export interface AgentConsumptionTimelineResponse {
  /** Time-series points, one per bucket. May be absent when no data matches. */
  data?: AgentConsumptionTimelinePoint[];
}

/**
 * Options for {@link AgentServiceModel.getConsumptionTimeline}.
 *
 * Currently identical to {@link AgentFilterOptions}; named distinctly so that
 * future per-method filters can be added without a breaking change.
 */
export interface AgentConsumptionTimelineOptions extends AgentFilterOptions {}

/**
 * One point on an agent's latency timeline — a single (percentile, time bucket)
 * combination. The API emits one row per percentile per bucket, so a typical
 * response includes two points per bucket (one each for P50 and P95).
 */
export interface AgentLatencyTimelinePoint {
  /**
   * Percentile label for this point — observed values: `"P50"`, `"P95"`.
   * The SDK leaves this as a plain string because the API does not publish a
   * closed set of percentiles.
   */
  name: string;
  /** Latency value in milliseconds. */
  value: number;
  /** Bucket timestamp (ISO 8601, UTC) */
  date: string;
}

/**
 * Response from {@link AgentServiceModel.getLatencyTimeline}.
 */
export interface AgentLatencyTimelineResponse {
  /**
   * Time-series points, two per bucket (one per percentile). May be absent
   * when no data matches.
   */
  data?: AgentLatencyTimelinePoint[];
}

/**
 * Options for {@link AgentServiceModel.getLatencyTimeline}.
 *
 * Currently identical to {@link AgentFilterOptions}; named distinctly so that
 * future per-method filters can be added without a breaking change.
 */
export interface AgentLatencyTimelineOptions extends AgentFilterOptions {}
