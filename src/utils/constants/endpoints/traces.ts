import { LLMOPS_BASE } from './base';

/**
 * Traces Service Endpoints
 */
export const TRACES_ENDPOINTS = {
  /** GET spans for a trace (OTEL format). Query params: traceId, pageSize, agentId, includeExpiredSpans */
  GET_BY_TRACE_ID: `${LLMOPS_BASE}/api/Traces/v2/spans/otel`,

  /** POST specific spans by ID. traceId in query via params, spanIds array in body */
  POST_BY_IDS: `${LLMOPS_BASE}/api/Traces/v2/spans/otel/byIds`,

} as const;
