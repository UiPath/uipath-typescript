/**
 * Response from {@link AgentMonitoringServiceModel.getNames}.
 */
export interface AgentNamesGetAllResponse {
  /** Distinct agent names visible to the caller */
  agents: string[];
}

/**
 * Options for {@link AgentMonitoringServiceModel.getNames}.
 */
export interface AgentNamesGetAllOptions {
  /** Optional folder keys (GUIDs) to scope the agent name lookup */
  folderKeys?: string[];
}
