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
    GET_RECORD_BY_ID: (entityId: string, recordId: string) =>
      `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/read/${recordId}`,
    INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert`,
    BATCH_INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert-batch`,
    UPDATE_RECORD_BY_ID: (entityId: string, recordId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update/${recordId}`,
    UPDATE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update-batch`,
    DELETE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/delete-batch`,
    CREATE_ENTITY: `${DATAFABRIC_BASE}/api/Entity`,
    DELETE_ENTITY: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}/delete`,
    ADD_FIELD: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}/field`,
    UPDATE_FIELD: (entityId: string, fieldId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}/field/${fieldId}`,
    DELETE_FIELD: (entityId: string, fieldId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}/field/${fieldId}/delete`,
    UPDATE_ENTITY_METADATA: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}/metadata`,
    QUERY_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/query`,
    BULK_UPLOAD_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/bulk-upload`,
    DOWNLOAD_BULK_UPLOAD_ERRORS: (entityId: string, errorFileLink: string) =>
      `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/bulk-upload-errors/${errorFileLink}`,
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
