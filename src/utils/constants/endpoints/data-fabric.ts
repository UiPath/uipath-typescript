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
    // v3 listing of tenant-level and folder-level entities together.
    // Used by getAll when folderKey is set or includeFolderEntities is true.
    GET_ALL_V3: `${DATAFABRIC_BASE}/api/v3/entities`,
    GET_ENTITY_RECORDS: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/read`,
    GET_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/${entityId}`,
    // v3 single-record read. Returns the full record including complete MULTILINE_MAX
    // content, unlike list/query endpoints which project a size marker for those fields.
    GET_RECORD_BY_ID: (entityId: string, recordId: string) =>
      `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/read/${recordId}`,
    INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/insert`,
    BATCH_INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/insert-batch`,
    UPDATE_RECORD_BY_ID: (entityId: string, recordId: string) => `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/update/${recordId}`,
    UPDATE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/update-batch`,
    DELETE_RECORD_BY_ID: (entityId: string, recordId: string) => `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/delete/${recordId}`,
    DELETE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/entity/${entityId}/delete-batch`,
    // Same URL as GET_ALL_V3; the HTTP method (POST for create/upsert vs GET for list) is resolved at the call site.
    UPSERT: `${DATAFABRIC_BASE}/api/v3/entities`,
    // Same URL as GET_BY_ID; the HTTP method (DELETE vs GET) is resolved at the call site.
    DELETE: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/${entityId}`,
    UPDATE_METADATA: (entityId: string) => `${DATAFABRIC_BASE}/api/v3/entities/${entityId}/metadata`,
    // Kept on v1: the v3 query endpoint rejects multi-entity joins (req.Joins),
    // which queryRecordsById supports. v1 query supports joins.
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
    CREATE: `${DATAFABRIC_BASE}/api/Entity/choiceset`,
    UPDATE: (choiceSetId: string) => `${DATAFABRIC_BASE}/api/Entity/${choiceSetId}/metadata`,
    DELETE: (choiceSetId: string) => `${DATAFABRIC_BASE}/api/Entity/${choiceSetId}/delete`,
    INSERT_BY_NAME: (choiceSetName: string) => `${DATAFABRIC_BASE}/api/EntityService/${choiceSetName}/choiceset/insert`,
    UPDATE_BY_NAME: (choiceSetName: string, valueId: string) => `${DATAFABRIC_BASE}/api/EntityService/${choiceSetName}/choiceset/${valueId}/update`,
    DELETE_BY_ID: (choiceSetId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${choiceSetId}/choiceset/delete`,
  },
  ROLES: {
    GET_ALL: `${DATAFABRIC_BASE}/api/v2/Role`,
  },
  DIRECTORY: {
    GET_ALL: `${DATAFABRIC_BASE}/api/Directory`,
    ASSIGN_ROLES: `${DATAFABRIC_BASE}/api/Directory/Role`,
    REVOKE_ROLES: `${DATAFABRIC_BASE}/api/Directory/RevokeRole`,
  },
} as const;
