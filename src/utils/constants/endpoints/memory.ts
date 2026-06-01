import { INSIGHTS_RTM_BASE } from './base';

/**
 * Agent Memory (Traceview) Service Endpoints
 */
export const MEMORY_ENDPOINTS = {
  /** Time-series of agent-memory state counts bucketed across the requested window. */
  GET_MEMORY_TIMELINE: `${INSIGHTS_RTM_BASE}/Traceview/memoryTimeline`,
} as const;
