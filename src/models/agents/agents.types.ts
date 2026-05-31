/**
 * Response from {@link AgentServiceModel.getNames}.
 */
export interface AgentNamesGetAllResponse {
  /** Distinct agent names. */
  agents: string[];
}

/**
 * Options for {@link AgentServiceModel.getNames}.
 */
export interface AgentNamesGetAllOptions {
  /** Optional folder keys (GUIDs) to scope the agent name lookup */
  folderKeys?: string[];
}
