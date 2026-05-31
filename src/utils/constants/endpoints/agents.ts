/**
 * Agent Service Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

export const AGENTS_ENDPOINTS = {
  /** List distinct agent names. */
  GET_NAMES: `${INSIGHTS_RTM_BASE}/Agents/names`,
} as const;
