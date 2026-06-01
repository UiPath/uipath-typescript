/**
 * Agent Service Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

export const AGENTS_ENDPOINTS = {
  /** List distinct agent names. */
  GET_NAMES: `${INSIGHTS_RTM_BASE}/Agents/names`,
  /** Time-series of error counts grouped by agent over the requested window. */
  GET_ERRORS_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/errors`,
  /** Top-N agents by error count over the requested window. */
  GET_TOP_ERRORED_AGENTS: `${INSIGHTS_RTM_BASE}/Agents/topErroredAgents`,
  /** Paginated list of incidents grouped/ordered by the requested column. */
  GET_INCIDENTS: `${INSIGHTS_RTM_BASE}/Agents/incidents`,
  /** Top-N agents by unit consumption over the requested window. */
  GET_TOP_CONSUMING_AGENTS: `${INSIGHTS_RTM_BASE}/Agents/consumption`,
  /** Time-series of AGU consumption over the requested window. */
  GET_CONSUMPTION_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/consumptionTimeline`,
} as const;
