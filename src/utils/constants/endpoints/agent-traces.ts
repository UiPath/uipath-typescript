import { INSIGHTS_RTM_BASE, LLMOPS_BASE } from './base';

/**
 * Agent Traces Service Endpoints
 */
export const AGENT_TRACES_ENDPOINTS = {
  /** Trace-level time-series of error counts grouped by error name. */
  GET_ERRORS_TIMELINE: `${INSIGHTS_RTM_BASE}/Traceview/errorsTimeline`,
  /** Trace-level time-series of latency (decimal seconds per series). */
  GET_LATENCY_TIMELINE: `${INSIGHTS_RTM_BASE}/Traceview/latencyTimeline`,
  /** Trace-level per-agent Agent Units and Platform Units consumption totals. */
  GET_UNIT_CONSUMPTION: `${INSIGHTS_RTM_BASE}/Traceview/unitConsumption`,
  /** All spans for a single trace (flat array, not paginated). */
  GET_SPANS_BY_TRACE_ID: (traceId: string) => `${INSIGHTS_RTM_BASE}/Traceview/spans/${traceId}`,
  /** Paginated spans whose reference hierarchy contains the given reference id. */
  GET_SPANS_BY_REFERENCE: (referenceId: string) => `${INSIGHTS_RTM_BASE}/Traceview/spans/reference/${referenceId}`,
  /** Paginated raw governance decision rows. */
  GET_GOVERNANCE_DECISIONS: `${LLMOPS_BASE}/api/Governance/agentic/traces`,
  /** Aggregated governance posture (totals + top-N breakdowns). */
  GET_GOVERNANCE_SUMMARY: `${LLMOPS_BASE}/api/Governance/agentic/summary`,
} as const;
