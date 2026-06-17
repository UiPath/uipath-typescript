/**
 * Agent Service Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

export const AGENTS_ENDPOINTS = {
  /** Paginated list of agents with consumption and health metadata. */
  GET_AGENTS: `${INSIGHTS_RTM_BASE}/Agents/agents`,
  /** Paginated list of agent incidents (errors) over the requested window. */
  GET_INCIDENTS: `${INSIGHTS_RTM_BASE}/Agents/incidents`,
  /** Time-series of error counts grouped by agent over the requested window. */
  GET_ERRORS_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/errors`,
  /** Time-series of AGU consumption over the requested window. */
  GET_CONSUMPTION_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/consumptionTimeline`,
  /** Time-series of agent latency (per-percentile) over the requested window. */
  GET_LATENCY_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/latencyTimeline`,
} as const;
