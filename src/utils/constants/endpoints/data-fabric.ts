/**
 * Data Fabric Service Endpoints
 */

import { DATAFABRIC_BASE } from './base';

/**
 * Default folder key used for tenant-level Data Fabric entities.
 * Tenant-level entities are not scoped to a folder; this is the
 * conventional placeholder value the API expects.
 */
export const DATA_FABRIC_TENANT_FOLDER_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Data Fabric Entity Service Endpoints
 */
export const DATA_FABRIC_ENDPOINTS = {
  ENTITY: {
    GET_ALL: `${DATAFABRIC_BASE}/api/Entity`,
    GET_ENTITY_RECORDS: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/read`,
    GET_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}`,
    GET_RECORD_BY_ID: (entityId: string, recordId: string) =>
      `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/read/${recordId}`,
    INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert`,
    BATCH_INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert-batch`,
    UPDATE_RECORD_BY_ID: (entityId: string, recordId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update/${recordId}`,
    UPDATE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update-batch`,
    DELETE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/delete-batch`,
    UPSERT: `${DATAFABRIC_BASE}/api/Entity`,
    DELETE: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}/delete`,
    UPDATE_METADATA: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}/metadata`,
    QUERY_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/query`,
    BULK_UPLOAD_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/bulk-upload`,
    DOWNLOAD_ATTACHMENT: (entityId: string, recordId: string, fieldName: string) =>
      `${DATAFABRIC_BASE}/api/Attachment/entity/${entityId}/${recordId}/${fieldName}`,
    UPLOAD_ATTACHMENT: (entityId: string, recordId: string, fieldName: string) =>
      `${DATAFABRIC_BASE}/api/Attachment/entity/${entityId}/${recordId}/${fieldName}`,
    DELETE_ATTACHMENT: (entityId: string, recordId: string, fieldName: string) =>
      `${DATAFABRIC_BASE}/api/Attachment/entity/${entityId}/${recordId}/${fieldName}`,
  },
  CHOICESETS: {
    GET_ALL: `${DATAFABRIC_BASE}/api/Entity/choiceset`,
    GET_BY_ID: (choiceSetId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${choiceSetId}/query_expansion`,
  },
} as const;
