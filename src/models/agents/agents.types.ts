import type { PaginationOptions } from '../../utils/pagination/types';

/**
 * Filter fields shared by agent insights endpoints that accept a
 * folder/agent/project scope (`/Agents/agents`, `/Agents/errors`, etc.).
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
