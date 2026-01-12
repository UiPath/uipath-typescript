/**
 * Data Fabric Service Endpoints
 */

import { DATAFABRIC_BASE } from './base';

/**
 * Data Fabric Entity Service Endpoints
 */
export const DATA_FABRIC_ENDPOINTS = {
  ENTITY: {
    GET_ALL: `${DATAFABRIC_BASE}/api/Entity`,
    GET_ENTITY_RECORDS: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/read`,
    GET_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}`,
    INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert-batch`,
    UPDATE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update-batch`,
    DELETE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/delete-batch`,
  },
} as const;
