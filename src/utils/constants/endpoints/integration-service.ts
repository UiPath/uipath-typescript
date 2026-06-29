/**
 * Integration Service Endpoints
 *
 * `connections_` domain — connectors and connections (CONNECTOR_ENDPOINTS, CONNECTION_ENDPOINTS).
 */

import { CONNECTIONS_BASE } from './base';

export const CONNECTION_ENDPOINTS = {
  GET_ALL: `${CONNECTIONS_BASE}/api/v1/Connections`,
  GET_BY_ID: (connectionId: string) => `${CONNECTIONS_BASE}/api/v1/Connections/${encodeURIComponent(connectionId)}`,
  PING: (connectionId: string) => `${CONNECTIONS_BASE}/api/v1/Connections/${encodeURIComponent(connectionId)}/ping`,
  REAUTHENTICATE: (connectionId: string) => `${CONNECTIONS_BASE}/api/v1/Connections/${encodeURIComponent(connectionId)}/auth`,
} as const;
