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
  /** All spans for a single trace (flat array, not paginated). */
  GET_SPANS_BY_TRACE_ID: (traceId: string) => `${INSIGHTS_RTM_BASE}/Traceview/spans/${traceId}`,
  /** Paginated spans whose reference hierarchy contains the given reference id. */
  GET_SPANS_BY_REFERENCE: (referenceId: string) => `${INSIGHTS_RTM_BASE}/Traceview/spans/reference/${referenceId}`,
} as const;
