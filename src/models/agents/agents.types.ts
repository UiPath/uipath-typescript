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

/**
 * Response from {@link AgentServiceModel.getIncidentDistribution}.
 *
 * The API wraps this payload in a `data` envelope (and emits a vestigial
 * `pagination` object alongside it that carries no useful information on this
 * non-paginated endpoint); the SDK unwraps the `data` and drops `pagination`
 * so the fields below are returned directly.
 */
export interface AgentIncidentDistributionResponse {
  /** Number of error-type incidents in the window */
  errorCount?: number;
  /** Number of escalation-type incidents in the window */
  escalationCount?: number;
  /** Number of policy-type incidents in the window */
  policyCount?: number;
}

/**
 * Options for {@link AgentServiceModel.getIncidentDistribution}.
 *
 * Currently identical to {@link AgentFilterOptions}; named distinctly so that
 * future per-method filters can be added without a breaking change.
 */
export interface AgentIncidentDistributionOptions extends AgentFilterOptions {}

/**
 * Columns available for ordering {@link AgentServiceModel.getAll} results.
 */
export enum AgentListSortColumn {
  AgentName = 'AgentName',
  ParentProcess = 'ParentProcess',
  LastRun = 'LastRun',
  HealthScore = 'HealthScore',
  LastIncident = 'LastIncident',
  ConsumedUnits = 'ConsumedUnits',
  FolderName = 'FolderName',
  QuantityAGU = 'QuantityAGU',
  QuantityPLTU = 'QuantityPLTU',
  FolderPath = 'FolderPath',
}

/**
 * Ordering directive for {@link AgentServiceModel.getAll}.
 */
export interface AgentListOrderBy {
  /** Column to sort by */
  column: AgentListSortColumn;
  /** Sort descending. Defaults to false (ascending) server-side. */
  desc?: boolean;
}

/**
 * One row in the agents list returned by {@link AgentServiceModel.getAll} —
 * agent identity plus consumption and health metadata aggregated over the
 * requested time window.
 *
 * Note: nullable string fields sometimes come back as the empty string (`""`)
 * rather than `null` (a .NET serialization quirk). The type is `string | null`
 * per the OpenAPI spec; consumers may want to treat `""` as "absent" the same
 * way as `null`.
 */
export interface AgentListItem {
  /** Agent ID (GUID) */
  agentId: string;
  /** Agent display name */
  agentName: string;
  /** Parent process name. May be `null` or `""` for jobs not bound to a parent process. */
  parentProcess: string | null;
  /** Folder key (GUID) of the folder the agent runs in. May be `null` or `""`. */
  folderKey: string | null;
  /** Folder display name. May be `null` or `""`. */
  folderName: string | null;
  /** Fully qualified folder path. May be `null` or `""`. */
  folderPath: string | null;
  /** Last run timestamp (ISO 8601, UTC) */
  lastRun: string;
  /** Process key (GUID). May be `null` or `""` for ad-hoc jobs. */
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
  /** AGU quantity consumed by this agent */
  quantityAGU: number;
  /** PLTU quantity consumed by this agent */
  quantityPLTU: number;
}

/**
 * Extra envelope fields returned by {@link AgentServiceModel.getAll} on top of
 * the standard paginated response — aggregate consumption totals across all
 * matching agents (independent of the current page).
 */
export interface AgentListTotals {
  /** Total units consumed across all matching agents in the window */
  totalUnitsConsumed?: number;
  /** Total AGU consumed across all matching agents in the window */
  totalAGUnitsConsumed?: number;
  /** Total PLTU consumed across all matching agents in the window */
  totalPLTUnitsConsumed?: number;
}

/**
 * Options for {@link AgentServiceModel.getAll}.
 *
 * Composes filter, pagination, and sort options.
 */
export type AgentListOptions = AgentFilterOptions & PaginationOptions & {
  /** Sort order for the result set. */
  orderBy?: AgentListOrderBy;
};

/**
 * Per-agent (process + folder) stats within a {@link AgentSummaryPeriod}.
 */
export interface AgentSummaryEntry {
  /** Process key (GUID) */
  processKey: string;
  /** Folder key (GUID) the agent ran in */
  folderKey: string;
  /** Process version */
  processVersion: string;
  /** Total job runs in the period */
  totalJobs: number;
  /** Number of successful runs in the period */
  successfulJobs: number;
  /** Success rate as a percentage (0-100) */
  successRate: number;
  /** Average run duration in seconds */
  averageDurationSeconds: number;
  /** First job completion timestamp (ISO 8601, UTC) */
  firstJobFinished: string;
  /** Last job completion timestamp (ISO 8601, UTC) */
  lastJobFinished: string;
  /** Status of the most recent run (e.g., "Success", "Faulted", "Running") */
  lastJobStatus: string;
}

/**
 * Aggregate stats for a single period within an
 * {@link AgentSummaryResponse} — covers the requested window for either the
 * current period or an optional lookback period.
 */
export interface AgentSummaryPeriod {
  /** Total job runs across all agents in the period */
  totalJobs: number;
  /** Number of successful runs across all agents in the period */
  successfulJobs: number;
  /** Overall success rate as a percentage (0-100) */
  successRate: number;
  /** Average run duration in seconds across all agents in the period */
  averageDurationSeconds: number;
  /** Period start time (ISO 8601, UTC) */
  startTime: string;
  /** Period end time (ISO 8601, UTC) */
  endTime: string;
  /** Per-agent breakdown */
  agents: AgentSummaryEntry[];
}

/**
 * Response from {@link AgentServiceModel.getSummary}.
 *
 * The API wraps this payload in a `data` envelope; the SDK unwraps it so the
 * period summaries are returned directly. `lookbackPeriodSummary` is only
 * present when the request set `lookbackPeriodAnalysis: true` (the API uses
 * Newtonsoft `NullValueHandling.Ignore` and omits the key otherwise).
 */
export interface AgentSummaryResponse {
  /** Aggregate stats for the requested window */
  currentPeriodSummary?: AgentSummaryPeriod;
  /** Aggregate stats for the prior window of equal length. Only present when `lookbackPeriodAnalysis: true` was sent. */
  lookbackPeriodSummary?: AgentSummaryPeriod;
}

/**
 * Job execution mode filter accepted by {@link AgentServiceModel.getSummary}.
 *
 * Wire format is the string name (`"Debug"` / `"Runtime"`), per the API's
 * `StringEnumConverter` serialization.
 */
export enum AgentExecutionType {
  Debug = 'Debug',
  Runtime = 'Runtime',
}

/**
 * Options for {@link AgentServiceModel.getSummary}.
 */
export interface AgentSummaryOptions extends AgentFilterOptions {
  /**
   * When `true`, the API also computes a `lookbackPeriodSummary` for the
   * prior window of equal length. Defaults to `false` server-side.
   */
  lookbackPeriodAnalysis?: boolean;
  /** Filter to a specific process by key (GUID). */
  processKey?: string;
  /**
   * Filter to a specific folder by key (GUID).
   *
   * Note: this is a distinct field from the inherited {@link AgentFilterOptions.folderKeys}
   * (plural array). The summary endpoint accepts both — `folderKey` selects a
   * single folder, `folderKeys` filters the lookup to a list of folders.
   */
  folderKey?: string;
  /**
   * Filter to a specific execution type — `Debug` (test runs) or
   * `Runtime` (production runs).
   */
  executionType?: AgentExecutionType;
}
