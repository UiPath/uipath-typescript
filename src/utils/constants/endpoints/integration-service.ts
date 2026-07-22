/**
 * Integration Service Endpoints
 *
 * Two service domains:
 * - `connections_` — connectors and connections (CONNECTOR_ENDPOINTS, CONNECTION_ENDPOINTS)
 * - `elements_/v3/element` — connector elements and metadata (ELEMENT_ENDPOINTS)
 */

import { CONNECTIONS_BASE, ELEMENTS_BASE } from './base';

export const CONNECTOR_ENDPOINTS = {
  GET_ALL: `${CONNECTIONS_BASE}/api/v1/Connectors`,
  GET_BY_ID: (keyOrId: string) => `${CONNECTIONS_BASE}/api/v1/Connectors/${encodeURIComponent(keyOrId)}`,
  GET_DEFAULT_CONNECTION: (keyOrId: string) => `${CONNECTIONS_BASE}/api/v1/Connectors/${encodeURIComponent(keyOrId)}/connection`,
  GET_CONNECTIONS: (keyOrId: string) => `${CONNECTIONS_BASE}/api/v1/Connectors/${encodeURIComponent(keyOrId)}/connections`,
} as const;

export const CONNECTION_ENDPOINTS = {
  GET_ALL: `${CONNECTIONS_BASE}/api/v1/Connections`,
  GET_BY_ID: (connectionId: string) => `${CONNECTIONS_BASE}/api/v1/Connections/${encodeURIComponent(connectionId)}`,
  PING: (connectionId: string) => `${CONNECTIONS_BASE}/api/v1/Connections/${encodeURIComponent(connectionId)}/ping`,
  REAUTHENTICATE: (connectionId: string) => `${CONNECTIONS_BASE}/api/v1/Connections/${encodeURIComponent(connectionId)}/auth`,
} as const;

export const ELEMENT_ENDPOINTS = {
  OBJECTS: {
    /** List objects (resources) exposed by a connector. */
    LIST: (elementKey: string) => `${ELEMENTS_BASE}/elements/${encodeURIComponent(elementKey)}/objects`,
    /** Get metadata for a single object. */
    METADATA: (elementKey: string, objectName: string) =>
      `${ELEMENTS_BASE}/elements/${encodeURIComponent(elementKey)}/objects/${encodeURIComponent(objectName)}/metadata`,
  },
  ACTIVITIES: {
    /** List curated activities exposed by a connector. */
    LIST: (elementKey: string) => `${ELEMENTS_BASE}/elements/${encodeURIComponent(elementKey)}/activities`,
  },
  EVENTS: {
    /** List event objects for a connector's event operation (trigger). */
    OBJECTS: (elementKey: string, operationName: string) =>
      `${ELEMENTS_BASE}/elements/${encodeURIComponent(elementKey)}/events/operations/${encodeURIComponent(operationName)}/objects`,
    /** Get metadata for a single event object. */
    METADATA: (elementKey: string, operationName: string, objectName: string) =>
      `${ELEMENTS_BASE}/elements/${encodeURIComponent(elementKey)}/events/operations/${encodeURIComponent(operationName)}/objects/${encodeURIComponent(objectName)}/metadata`,
  },
  INSTANCE: {
    OBJECTS: {
      /** List objects for a connection instance (includes custom fields). */
      LIST: (connectionId: string, elementKey: string) =>
        `${ELEMENTS_BASE}/instances/${encodeURIComponent(connectionId)}/elements/${encodeURIComponent(elementKey)}/objects`,
      /** Get instance-scoped metadata for a single object. */
      METADATA: (connectionId: string, elementKey: string, objectName: string) =>
        `${ELEMENTS_BASE}/instances/${encodeURIComponent(connectionId)}/elements/${encodeURIComponent(elementKey)}/objects/${encodeURIComponent(objectName)}/metadata`,
    },
    EVENTS: {
      /** List event objects for a connection instance. */
      OBJECTS: (connectionId: string, elementKey: string, operationName: string) =>
        `${ELEMENTS_BASE}/instances/${encodeURIComponent(connectionId)}/elements/${encodeURIComponent(elementKey)}/events/operations/${encodeURIComponent(operationName)}/objects`,
      /** Get instance-scoped metadata for a single event object. */
      METADATA: (connectionId: string, elementKey: string, operationName: string, objectName: string) =>
        `${ELEMENTS_BASE}/instances/${encodeURIComponent(connectionId)}/elements/${encodeURIComponent(elementKey)}/events/operations/${encodeURIComponent(operationName)}/objects/${encodeURIComponent(objectName)}/metadata`,
    },
    /**
     * Generic HTTP passthrough endpoint for executing a request against a connection instance.
     *
     * `objectName` may be a multi-segment path (e.g. `curated_get_issue/APPS-34728`).
     * Each segment is encoded independently so reserved characters within a segment are
     * escaped while the `/` separators that make up the path are preserved.
     */
    EXECUTE: (connectionId: string, objectName: string) =>
      `${ELEMENTS_BASE}/instances/${encodeURIComponent(connectionId)}/${objectName
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
  },
} as const;
