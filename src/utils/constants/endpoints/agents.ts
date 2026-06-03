/**
 * Agent Service Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

export const AGENTS_ENDPOINTS = {
  /** Paginated list of agents with consumption and health metadata. */
  GET_AGENTS: `${INSIGHTS_RTM_BASE}/Agents/agents`,
} as const;
