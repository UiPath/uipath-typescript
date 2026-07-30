/**
 * Identity/Authentication Endpoints
 */

import { IDENTITY_API_BASE, IDENTITY_BASE } from './base';

/**
 * Identity Service Endpoints
 */
export const IDENTITY_ENDPOINTS = {
  BASE_PATH: `${IDENTITY_BASE}/connect`,
  TOKEN: `${IDENTITY_BASE}/connect/token`,
  AUTHORIZE: `${IDENTITY_BASE}/connect/authorize`,
} as const;

/**
 * Identity Setting Endpoints
 *
 * URLs route at the **organization** level (no tenant segment); see {@link IDENTITY_API_BASE}.
 */
export const IDENTITY_SETTING_ENDPOINTS = {
  // Bulk read (GET) and bulk create/update (PUT) share this URL; the HTTP method
  // differentiates the operation at the call site.
  SETTINGS: `${IDENTITY_API_BASE}/api/Setting`,
} as const;
