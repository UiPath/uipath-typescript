/**
 * Identity/Authentication Endpoints
 */

import { IDENTITY_BASE } from './base';

/**
 * Identity Service Endpoints
 */
export const IDENTITY_ENDPOINTS = {
  BASE_PATH: `${IDENTITY_BASE}/connect`,
  TOKEN: `${IDENTITY_BASE}/connect/token`,
  AUTHORIZE: `${IDENTITY_BASE}/connect/authorize`,
} as const;
