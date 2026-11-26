/**
 * Agent Service Endpoints
 */

import { INSIGHTS_RTM_BASE, LLMOPS_BASE } from '../base';

export const AGENTS_ENDPOINTS = {
  /** Paginated list of agents with consumption and health metadata. */
  GET_AGENTS: `${INSIGHTS_RTM_BASE}/Agents/agents`,
  /** Paginated list of agent incidents (errors) over the requested window. */
  GET_INCIDENTS: `${INSIGHTS_RTM_BASE}/Agents/incidents`,
  /** Time-series of error counts grouped by agent over the requested window. */
  GET_ERRORS_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/errors`,
  /** Time-series of Agent Units consumption over the requested window. */
  GET_CONSUMPTION_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/consumptionTimeline`,
  /** Time-series of agent latency (per-percentile) over the requested window. */
  GET_LATENCY_TIMELINE: `${INSIGHTS_RTM_BASE}/Agents/latencyTimeline`,
  /** Top-N agents by error count over the requested window. */
  GET_TOP_ERROR_COUNT: `${INSIGHTS_RTM_BASE}/Agents/topErroredAgents`,
  /** Top-N agents by unit consumption over the requested window. */
  GET_TOP_CONSUMPTION: `${INSIGHTS_RTM_BASE}/Agents/consumption`,
  /** Distribution of incidents across types (errors, escalations, policy). */
  GET_INCIDENT_DISTRIBUTION: `${INSIGHTS_RTM_BASE}/Agents/incidentDistribution`,
  /** Aggregate per-agent and overall job/success/duration summary over the requested window. */
  GET_SUMMARY: `${INSIGHTS_RTM_BASE}/Agents/summary`,
  /** Aggregate Agent Units and Platform Units consumption per agent over the requested window. */
  GET_UNIT_CONSUMPTION_SUMMARY: `${INSIGHTS_RTM_BASE}/Agents/summary/unit-consumption`,
  /** Agent job counts, error rate and durations over the requested window, optionally bucketed by hour or day. */
  GET_RUNS_TIMELINE: `${LLMOPS_BASE}/api/AgentSummary/runs-timeline`,
} as const;
