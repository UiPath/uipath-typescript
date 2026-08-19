/**
 * Platform Endpoints
 */

import { IDENTITY_API_BASE } from './base';

/**
 * Platform Setting Endpoints
 *
 * Settings are served by the `identity_` service, but URLs route at the **organization**
 * level (no tenant segment); see {@link IDENTITY_API_BASE}.
 */
export const PLATFORM_SETTING_ENDPOINTS = {
  // Bulk read (GET) and bulk create/update (PUT) share this URL; the HTTP method
  // differentiates the operation at the call site.
  SETTINGS: `${IDENTITY_API_BASE}/api/Setting`,
} as const;
