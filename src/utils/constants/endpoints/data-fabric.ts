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
    // Lists tenant-level and folder-level entities together.
    // Used by getAll when includeFolderEntities is true.
    GET_ALL_V2: `${DATAFABRIC_BASE}/api/v2/Entity`,
    GET_ENTITY_RECORDS: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/read`,
    GET_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}`,
    // v2 single-record read. Returns the full record including complete MULTILINE_MAX
    // content, unlike list/query endpoints which project a size marker for those fields.
    GET_RECORD_BY_ID: (entityId: string, recordId: string) =>
      `${DATAFABRIC_BASE}/api/v2/EntityService/entity/${entityId}/read/${recordId}`,
    INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert`,
    BATCH_INSERT_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/insert-batch`,
    UPDATE_RECORD_BY_ID: (entityId: string, recordId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update/${recordId}`,
    UPDATE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/update-batch`,
    DELETE_RECORD_BY_ID: (entityId: string, recordId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/delete/${recordId}`,
    DELETE_BY_ID: (entityId: string) => `${DATAFABRIC_BASE}/api/EntityService/entity/${entityId}/delete-batch`,
    UPSERT: `${DATAFABRIC_BASE}/api/Entity`,
    DELETE: (entityId: string) => `${DATAFABRIC_BASE}/api/Entity/${entityId}`,
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

/** Base path for all v3 Entity API routes. */
const V3_BASE = `${DATAFABRIC_BASE}/api/v3/entities`;

/**
 * Data Fabric Entity Service v3 Endpoints.
 *
 * The v3 API adds composite-entity support (entities backed by multiple related
 * "member" tables) on top of the v1/v2 surface. Data operations are addressed by
 * entity **name**; schema operations are addressed by entity **id** (GUID).
 */
export const DATA_FABRIC_V3_ENDPOINTS = {
  ENTITY: {
    // Schema / listing
    LIST: V3_BASE,
    LIST_ALL: `${V3_BASE}/all`,
    FOLDER_ENTITIES: `${V3_BASE}/folder-entities`,
    CREATE: V3_BASE,
    GET_BY_ID: (entityId: string) => `${V3_BASE}/${entityId}`,
    DELETE_BY_ID: (entityId: string) => `${V3_BASE}/${entityId}`,
    GET_METADATA: (entityName: string) => `${V3_BASE}/${entityName}/metadata`,
    UPDATE_METADATA: (entityId: string) => `${V3_BASE}/${entityId}/metadata`,

    // Data (by entity name)
    QUERY: (entityName: string) => `${V3_BASE}/${entityName}/query`,
    QUERY_EXPANSION: (entityName: string) => `${V3_BASE}/${entityName}/query_expansion`,
    READ: (entityName: string) => `${V3_BASE}/${entityName}/read`,
    READ_RECORD: (entityName: string, recordId: string) => `${V3_BASE}/${entityName}/read/${recordId}`,
    READ_BY_KEY: (entityName: string, key: string) => `${V3_BASE}/${entityName}/readByKey/${key}`,
    INSERT: (entityName: string) => `${V3_BASE}/${entityName}/insert`,
    INSERT_BATCH: (entityName: string) => `${V3_BASE}/${entityName}/insert-batch`,
    INSERT_BULK: (entityName: string) => `${V3_BASE}/${entityName}/insert_bulk`,
    UPSERT: (entityName: string) => `${V3_BASE}/${entityName}/upsert`,
    UPDATE: (entityName: string, recordId: string) => `${V3_BASE}/${entityName}/update/${recordId}`,
    UPDATE_BY_KEY: (entityName: string, key: string) => `${V3_BASE}/${entityName}/updateByKey/${key}`,
    UPDATE_BATCH: (entityName: string) => `${V3_BASE}/${entityName}/update-batch`,
    UPDATE_WHERE: (entityName: string) => `${V3_BASE}/${entityName}/update-where`,
    DELETE_RECORD: (entityName: string, recordId: string) => `${V3_BASE}/${entityName}/delete/${recordId}`,
    DELETE: (entityName: string) => `${V3_BASE}/${entityName}/delete`,
    DELETE_BATCH: (entityName: string) => `${V3_BASE}/${entityName}/delete-batch`,

    // Entity field schema (by entity id)
    FIELD: {
      CREATE: (entityId: string) => `${V3_BASE}/${entityId}/field`,
      UPDATE: (entityId: string, fieldId: string) => `${V3_BASE}/${entityId}/field/${fieldId}`,
      DELETE: (entityId: string, fieldId: string) => `${V3_BASE}/${entityId}/field/${fieldId}`,
    },

    // Attachments (by entity name)
    ATTACHMENT: {
      DOWNLOAD: (entityName: string, recordId: string, fieldName: string) =>
        `${V3_BASE}/${entityName}/records/${recordId}/attachments/${fieldName}`,
      UPLOAD: (entityName: string, recordId: string, fieldName: string) =>
        `${V3_BASE}/${entityName}/records/${recordId}/attachments/${fieldName}`,
      DELETE: (entityName: string, recordId: string, fieldName: string) =>
        `${V3_BASE}/${entityName}/records/${recordId}/attachments/${fieldName}`,
    },

    // Autopilot
    AUTOPILOT: {
      MANAGE: `${V3_BASE}/autopilot/manage`,
      MANAGE_STREAM: `${V3_BASE}/autopilot/manage/stream`,
    },
  },
  MEMBER: {
    // Data (sub-resource of a composite entity, by member instance name)
    QUERY: (compositeName: string, memberName: string) => `${V3_BASE}/${compositeName}/members/${memberName}/query`,
    READ: (compositeName: string, memberName: string) => `${V3_BASE}/${compositeName}/members/${memberName}/read`,
    READ_RECORD: (compositeName: string, memberName: string, recordId: string) =>
      `${V3_BASE}/${compositeName}/members/${memberName}/read/${recordId}`,
    READ_BY_KEY: (compositeName: string, memberName: string, key: string) =>
      `${V3_BASE}/${compositeName}/members/${memberName}/readByKey/${key}`,
    DELETE_RECORD: (compositeName: string, memberName: string, recordId: string) =>
      `${V3_BASE}/${compositeName}/members/${memberName}/delete/${recordId}`,
    DELETE: (compositeName: string, memberName: string) => `${V3_BASE}/${compositeName}/members/${memberName}/delete`,

    // Member field schema
    FIELD: {
      CREATE: (compositeName: string, memberName: string) => `${V3_BASE}/${compositeName}/members/${memberName}/field`,
      UPDATE: (compositeName: string, memberName: string, fieldId: string) =>
        `${V3_BASE}/${compositeName}/members/${memberName}/field/${fieldId}`,
      DELETE_HARD: (compositeName: string, memberName: string, fieldId: string) =>
        `${V3_BASE}/${compositeName}/members/${memberName}/field/${fieldId}/delete`,
      DELETE: (compositeName: string, memberName: string, fieldId: string) =>
        `${V3_BASE}/${compositeName}/members/${memberName}/field/${fieldId}`,
    },
  },
} as const;
