/**
 * Identity/Authentication Endpoints
 */

import { IDENTITY_BASE, IDENTITY_ORG_BASE } from './base';

/**
 * Identity Service Endpoints
 */
export const IDENTITY_ENDPOINTS = {
  BASE_PATH: `${IDENTITY_BASE}/connect`,
  TOKEN: `${IDENTITY_BASE}/connect/token`,
  AUTHORIZE: `${IDENTITY_BASE}/connect/authorize`,
} as const;

const USER_API_BASE = `${IDENTITY_ORG_BASE}/api/User`;

/**
 * User management endpoints.
 *
 * URLs route at the **organization** level (no tenant segment); see {@link IDENTITY_ORG_BASE}.
 */
export const IDENTITY_USER_ENDPOINTS = {
  BY_ID: (userId: string) => `${USER_API_BASE}/${userId}`,
} as const;
