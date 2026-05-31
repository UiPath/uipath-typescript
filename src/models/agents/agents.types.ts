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
 * top-errored agent entry to anchor the error window.
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
  /** Job end time (ISO 8601, UTC). May be absent if the job is still running. */
  endTime?: string;
  /** Process key (GUID) the job was launched from. May be absent for ad-hoc jobs. */
  processKey?: string;
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
