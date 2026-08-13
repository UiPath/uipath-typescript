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

/**
 * Identity Group Endpoints
 *
 * Groups are served by the `identity_` service, routed at the **organization**
 * level (no tenant segment); see {@link IDENTITY_API_BASE}.
 */
export const IDENTITY_GROUP_ENDPOINTS = {
  /** Group listing for an organization (the API calls it a "partition") */
  GET_ALL: (organizationId: string) => `${IDENTITY_API_BASE}/api/Group/${organizationId}`,
  /** Group creation — the organization travels in the body, not the URL */
  CREATE: `${IDENTITY_API_BASE}/api/Group`,
  // Read (GET) and delete (DELETE) share this URL; the HTTP method
  // differentiates the operation at the call site.
  GET_BY_ID: (organizationId: string, groupId: string) =>
    `${IDENTITY_API_BASE}/api/Group/${organizationId}/${groupId}`,
  /** Group update — the organization travels in the body, not the URL */
  UPDATE: (groupId: string) => `${IDENTITY_API_BASE}/api/Group/${groupId}`,
  /** Paged local members listing of a group */
  MEMBERS: (organizationId: string, groupId: string) =>
    `${IDENTITY_API_BASE}/api/Group/${organizationId}/${groupId}/Members`,
} as const;

/**
 * Identity Directory Endpoints
 *
 * Principal lookups served by the `identity_` service, routed at the
 * **organization** level (no tenant segment); see {@link IDENTITY_API_BASE}.
 */
export const IDENTITY_DIRECTORY_ENDPOINTS = {
  /** Principal search across users, groups, and applications */
  SEARCH: (organizationId: string) => `${IDENTITY_API_BASE}/api/Directory/Search/${organizationId}`,
  /** Membership check: which of the given groups a user belongs to */
  GROUP_MEMBERSHIP: (organizationId: string) =>
    `${IDENTITY_API_BASE}/api/Directory/GroupMembership/${organizationId}`,
} as const;
