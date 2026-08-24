/**
 * Identity/Authentication Endpoints
 */

import { IDENTITY_BASE, IDENTITY_API_BASE } from './base';

/**
 * Identity Service Endpoints
 */
export const IDENTITY_ENDPOINTS = {
  BASE_PATH: `${IDENTITY_BASE}/connect`,
  TOKEN: `${IDENTITY_BASE}/connect/token`,
  AUTHORIZE: `${IDENTITY_BASE}/connect/authorize`,
  END_SESSION: `${IDENTITY_BASE}/connect/endsession`,
} as const;

/**
 * Identity User Endpoints
 *
 * Users are served by the `identity_` service, routed at the **organization**
 * level (no tenant segment); see {@link IDENTITY_API_BASE}.
 */
export const IDENTITY_USER_ENDPOINTS = {
  /** Paged user listing for an organization (the API calls it a "partition") */
  GET_ALL: (organizationId: string) => `${IDENTITY_API_BASE}/api/User/users/${organizationId}`,
  // Read (GET) and update (PUT) share this URL; the HTTP method
  // differentiates the operation at the call site.
  GET_BY_ID: (userId: string) => `${IDENTITY_API_BASE}/api/User/${userId}`,
} as const;
