import { LLMOPS_BASE } from './base';

/**
 * Traces Service Endpoints
 */
export const TRACES_ENDPOINTS = {
  /** GET spans for a trace (OTEL format). Query params: traceId, pageSize, agentId, isHistorical */
  GET_BY_TRACE_ID: `${LLMOPS_BASE}/api/Traces/v2/spans/otel`,

  /** POST specific spans by ID. traceId in query via params, spanIds array in body */
  POST_BY_IDS: `${LLMOPS_BASE}/api/Traces/v2/spans/otel/byIds`,

  /** GET execution-level spans for an agent with page-number pagination */
  GET_BY_AGENT_ID: (agentId: string) =>
    `${LLMOPS_BASE}/api/Traces/spans/agent/${agentId}`,

  /** GET spans for a reference entity with page-number pagination */
  GET_BY_REFERENCE_ID: (referenceId: string) =>
    `${LLMOPS_BASE}/api/Traces/spans/reference/${referenceId}`,
} as const;
