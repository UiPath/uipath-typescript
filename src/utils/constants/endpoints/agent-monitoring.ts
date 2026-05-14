/**
 * Agent Monitoring Service Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

export const AGENT_MONITORING_ENDPOINTS = {
  /** List distinct agent names visible to the caller */
  GET_NAMES: `${INSIGHTS_RTM_BASE}/Agents/names`,
} as const;
