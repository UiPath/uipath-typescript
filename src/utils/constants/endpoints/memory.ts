import { INSIGHTS_RTM_BASE } from './base';

/**
 * Agent Memory Service Endpoints
 */
export const MEMORY_ENDPOINTS = {
  /** Time-series of agent-memory state counts bucketed across the requested window. */
  GET_TIMELINE: `${INSIGHTS_RTM_BASE}/Traceview/memoryTimeline`,
  /** Time-series of memory-call counts bucketed across the requested window. */
  GET_CALLS_TIMELINE: `${INSIGHTS_RTM_BASE}/Traceview/memoryCallsTimeline`,
  /** Top-N memory spaces ranked by memory count over the requested window. */
  GET_TOP_SPACES: `${INSIGHTS_RTM_BASE}/Traceview/topMemorySpaces`,
} as const;
