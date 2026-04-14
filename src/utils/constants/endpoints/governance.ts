/**
 * Governance Service Endpoints
 */

import { GOVERNANCE_BASE } from './base';

/**
 * Governance (Automation Ops) Service Endpoints
 */
export const GOVERNANCE_ENDPOINTS = {
  POLICIES: {
    GET_ALL: `${GOVERNANCE_BASE}/api/Policy`,
    GET_SETTINGS: (policyId: string) => `${GOVERNANCE_BASE}/api/Policy/form-data/${policyId}`,
    CONFIGURE: `${GOVERNANCE_BASE}/api/Policy`,
    CREATE: `${GOVERNANCE_BASE}/api/Policy`,
    DEPLOY: {
      GROUP: `${GOVERNANCE_BASE}/api/Policy/Deploy/Group`,
      USER: `${GOVERNANCE_BASE}/api/Policy/Deploy/User`,
    },
  },
  TENANT: {
    /** GET all tenant policy slot assignments; PUT replaces the full assignment table */
    POLICIES: `${GOVERNANCE_BASE}/api/Tenant`,
  },
  PRODUCT: {
    GET_ALL: `${GOVERNANCE_BASE}/api/Product`,
    ENABLE_ROBOT_GOVERNANCE: `${GOVERNANCE_BASE}/api/Product/Robot/enable`,
  },
} as const;
