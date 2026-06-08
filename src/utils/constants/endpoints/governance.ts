/**
 * Governance Service Endpoints
 */

import { INSIGHTS_RTM_BASE } from './base';

/**
 * Governance Service Endpoints
 * Endpoints require an organization-admin caller
 */
export const GOVERNANCE_ENDPOINTS = {
  POLICY: {
    /** Policy evaluation traces (paginated). */
    TRACES: `${INSIGHTS_RTM_BASE}/Governance/policy/traces`,
  },
  OPERATION: {
    /** Aggregate governed-operation enforcement counts. */
    SUMMARY: `${INSIGHTS_RTM_BASE}/Governance/operation/summary`,
  },
} as const;
