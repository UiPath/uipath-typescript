import { LLMOPS_BASE } from '../base';

const DECISIONS_BASE = `${LLMOPS_BASE}/api/Decisions`;

/** Decisions Service Endpoints */
export const DECISIONS_ENDPOINTS = {
  /** GET lists decisions (filtered by traceId, process, from/to, paged via skip/take); POST writes (upsert) decisions to a trace, traceId via query param. */
  ROOT: DECISIONS_BASE,
  /** POST a richer filter than the list endpoint. */
  QUERY: `${DECISIONS_BASE}/query`,
  /** GET a single decision by its decision ID. */
  GET_BY_ID: (decisionId: string) => `${DECISIONS_BASE}/${decisionId}`,
} as const;
