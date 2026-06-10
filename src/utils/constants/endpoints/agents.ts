/**
 * Agent Service Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

export const AGENTS_ENDPOINTS = {
  /** Paginated list of agents with consumption and health metadata. */
  GET_AGENTS: `${INSIGHTS_RTM_BASE}/Agents/agents`,
  /** Trace-level time-series of error counts grouped by error name. */
  GET_TRACE_ERRORS_TIMELINE: `${INSIGHTS_RTM_BASE}/Traceview/errorsTimeline`,
  /** Trace-level time-series of latency (decimal seconds per series). */
  GET_TRACE_LATENCY_TIMELINE: `${INSIGHTS_RTM_BASE}/Traceview/latencyTimeline`,
  /** Trace-level per-agent AGU/PLTU consumption totals. */
  GET_TRACE_UNIT_CONSUMPTION: `${INSIGHTS_RTM_BASE}/Traceview/unitConsumption`,
} as const;
