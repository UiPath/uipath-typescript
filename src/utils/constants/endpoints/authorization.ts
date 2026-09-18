/**
 * Authorization Service Endpoints (platform roles and role assignments)
 */

import { AUTHORIZATION_BASE } from './base';

/**
 * Platform Role Endpoints
 *
 * Roles are served by the Authorization service, routed at the **organization**
 * level (no tenant segment); see {@link AUTHORIZATION_BASE}. The caller's
 * organization is resolved from the token — it does not travel in the URL.
 */
export const AUTHORIZATION_ENDPOINTS = {
  ROLE: {
    // Paged role listing (GET) and custom-role create-or-update (PUT) share
    // this URL; the HTTP method differentiates the operation at the call site.
    GET_ALL: `${AUTHORIZATION_BASE}/api/roles`,
    // Read (GET) and delete (DELETE) share this URL; the HTTP method
    // differentiates the operation at the call site.
    GET_BY_ID: (roleId: string) => `${AUTHORIZATION_BASE}/api/roles/${roleId}`,
  },
  ROLE_ASSIGNMENT: {
    // Paged assignment listing (GET) and atomic batch update (PATCH) share
    // this URL; the HTTP method differentiates the operation at the call site.
    GET_ALL: `${AUTHORIZATION_BASE}/api/userroleassignments`,
    /** CSV export of all direct role assignments */
    EXPORT: `${AUTHORIZATION_BASE}/api/userroleassignments/export`,
  },
  /** Effective access computation for a principal in a scope */
  EFFECTIVE_ACCESS: `${AUTHORIZATION_BASE}/api/geteffectiveaccess`,
  /** Permission (action) definitions catalog */
  ACTIONS: `${AUTHORIZATION_BASE}/api/actions`,
} as const;
