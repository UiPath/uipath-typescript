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
 * Response from getting the top-errored agents.
 */
export interface AgentGetTopErroredAgentsResponse {
  /** Total error count across all agents in the window. */
  totalErrors?: number;
  /** Top-N agents ranked by error count. May be absent when no data matches. */
  data?: AgentTopErroredAgent[];
}

/**
 * Options for getting the top-errored agents.
 */
export interface AgentGetTopErroredAgentsOptions extends AgentFilterOptions {
  /** Max number of agents to return. Defaults to 10 server-side. */
  limit?: number;
}

/**
 * Agent type, used to filter consumption results.
 *
 * Wire format is the string name, per the API's `StringEnumConverter` serialization.
 */
export enum AgentType {
  Autonomous = 'Autonomous',
  Conversational = 'Conversational',
  Coded = 'Coded',
}

/**
 * Per-agent consumption entry returned by getting the top-consuming agents.
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
 * Response from getting the top-consuming agents.
 *
 * The API wraps this payload in a `data` envelope; the SDK unwraps it so the
 * fields below are returned directly.
 */
export interface AgentGetTopConsumingAgentsResponse {
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
 * Options for getting the top-consuming agents.
 */
export interface AgentGetTopConsumingAgentsOptions extends AgentFilterOptions {
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
 * Distribution of incidents across types over the requested window.
 *
 * The API wraps this payload in a `data` envelope (and emits a vestigial
 * `pagination` object alongside it that carries no useful information on this
 * non-paginated endpoint); the SDK unwraps the `data` and drops `pagination`
 * so the fields below are returned directly.
 */
export interface AgentGetIncidentDistributionResponse {
  /** Number of error-type incidents in the window */
  errorCount?: number;
  /** Number of escalation-type incidents in the window */
  escalationCount?: number;
  /** Number of policy-type incidents in the window */
  policyCount?: number;
}

/**
 * Options for getting the incident distribution.
 *
 * Currently identical to {@link AgentFilterOptions}; named distinctly so that
 * future per-method filters can be added without a breaking change.
 */
export interface AgentGetIncidentDistributionOptions extends AgentFilterOptions {}

/**
 * Per-agent (process + folder) stats within an {@link AgentSummaryPeriod}.
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
 * Aggregate stats for a single period within an {@link AgentGetSummaryResponse}
 * — covers the requested window for either the current period or an optional
 * lookback period.
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
 * Response from getting the agent summary.
 *
 * The API wraps this payload in a `data` envelope; the SDK unwraps it so the
 * period summaries are returned directly. `lookbackPeriodSummary` is only
 * present when the request set `lookbackPeriodAnalysis: true` (the API uses
 * Newtonsoft `NullValueHandling.Ignore` and omits the key otherwise).
 */
export interface AgentGetSummaryResponse {
  /** Aggregate stats for the requested window */
  currentPeriodSummary?: AgentSummaryPeriod;
  /** Aggregate stats for the prior window of equal length. Only present when `lookbackPeriodAnalysis: true` was sent. */
  lookbackPeriodSummary?: AgentSummaryPeriod;
}

/**
 * Job execution mode filter accepted by the summary endpoints.
 *
 * Wire format is the string name (`"Debug"` / `"Runtime"`), per the API's
 * `StringEnumConverter` serialization.
 */
export enum AgentExecutionType {
  /** Test runs */
  Debug = 'Debug',
  /** Production runs */
  Runtime = 'Runtime',
}

/**
 * Options for getting the agent summary.
 */
export interface AgentGetSummaryOptions extends AgentFilterOptions {
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

/**
 * Job-type breakdown of unit consumption — completed jobs vs jobs still in
 * progress at query time.
 */
export interface AgentJobConsumptionSummary {
  /** Units consumed by jobs that have completed in the period */
  completeJobs: number;
  /** Units consumed by jobs still in progress at query time */
  incompleteJobs: number;
}

/**
 * Per-agent (process + folder) unit consumption entry within an
 * {@link AgentUnitConsumptionPeriod}.
 *
 * Note: `firstJobFinished` and `lastJobFinished` come back as
 * `"0001-01-01T00:00:00"` (.NET `DateTime.MinValue` sentinel) when the period
 * had no completed jobs for this agent — treat that value as "no completion".
 */
export interface AgentUnitConsumptionEntry {
  /** Folder key (GUID) the agent ran in */
  folderKey: string;
  /** Process key (GUID) */
  processKey: string;
  /** Process version */
  processVersion: string;
  /** First job completion timestamp (ISO 8601). `"0001-01-01T00:00:00"` if no completion in the period. */
  firstJobFinished: string;
  /** Last job completion timestamp (ISO 8601). `"0001-01-01T00:00:00"` if no completion in the period. */
  lastJobFinished: string;
  /** AGU consumption for this agent, split by job completion status */
  agentUnitConsumption: AgentJobConsumptionSummary;
  /** Platform unit (PLTU) consumption for this agent, split by job completion status */
  platformUnitConsumption: AgentJobConsumptionSummary;
}

/**
 * Aggregate AGU/PLTU consumption for a single period within an
 * {@link AgentGetUnitConsumptionSummaryResponse} — covers the requested window
 * for either the current period or an optional lookback period.
 */
export interface AgentUnitConsumptionPeriod {
  /** Total AGU consumed across all agents in the period, split by job completion */
  totalAgentUnitConsumption: AgentJobConsumptionSummary;
  /** Total platform units (PLTU) consumed across all agents in the period, split by job completion */
  totalPlatformUnitConsumption: AgentJobConsumptionSummary;
  /** Period start time (ISO 8601, UTC) */
  startTime: string;
  /** Period end time (ISO 8601, UTC) */
  endTime: string;
  /** Per-agent consumption breakdown */
  agentConsumption: AgentUnitConsumptionEntry[];
}

/**
 * Response from getting the agent unit consumption summary.
 *
 * The API wraps this payload in a `data` envelope; the SDK unwraps it so the
 * period summaries are returned directly. `lookbackPeriodSummary` is only
 * present when the request set `lookbackPeriodAnalysis: true` (the API uses
 * Newtonsoft `NullValueHandling.Ignore` and omits the key otherwise).
 */
export interface AgentGetUnitConsumptionSummaryResponse {
  /** Aggregate consumption for the requested window */
  currentPeriodSummary?: AgentUnitConsumptionPeriod;
  /** Aggregate consumption for the prior window of equal length. Only present when `lookbackPeriodAnalysis: true` was sent. */
  lookbackPeriodSummary?: AgentUnitConsumptionPeriod;
}

/**
 * Options for getting the agent unit consumption summary.
 *
 * Currently identical to {@link AgentGetSummaryOptions} (the API uses the same
 * `AgentsSummaryRequest` schema for both endpoints); named distinctly so that
 * future per-method filters can be added without a breaking change.
 */
export interface AgentGetUnitConsumptionSummaryOptions extends AgentGetSummaryOptions {}
