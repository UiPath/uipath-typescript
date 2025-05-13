"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENDPOINTS = exports.DATA_SOURCES = exports.ENTRYPOINT = exports.HEADERS = exports.ENV = void 0;
/**
 * Environment variables
 */
exports.ENV = {
    BASE_URL: 'UIPATH_URL',
    UNATTENDED_USER_ACCESS_TOKEN: 'UNATTENDED_USER_ACCESS_TOKEN',
    UIPATH_ACCESS_TOKEN: 'UIPATH_ACCESS_TOKEN',
    FOLDER_KEY: 'UIPATH_FOLDER_KEY',
    FOLDER_PATH: 'UIPATH_FOLDER_PATH',
    JOB_KEY: 'UIPATH_JOB_KEY',
    JOB_ID: 'UIPATH_JOB_ID',
    ROBOT_KEY: 'UIPATH_ROBOT_KEY',
    TENANT_ID: 'UIPATH_TENANT_ID',
    ORGANIZATION_ID: 'UIPATH_ORGANIZATION_ID',
    TELEMETRY_ENABLED: 'TELEMETRY_ENABLED'
};
/**
 * Headers
 */
exports.HEADERS = {
    FOLDER_KEY: 'X-UIPATH-FolderKey',
    FOLDER_PATH: 'X-UIPATH-FolderPath',
    USER_AGENT: 'X-UIPATH-UserAgent',
    TENANT_ID: 'X-UIPATH-TenantId',
    JOB_KEY: 'X-UIPATH-JobKey',
    ORGANIZATION_UNIT_ID: 'X-UIPATH-OrganizationUnitId',
    INSTANCE_ID: 'X-UIPATH-InstanceId'
};
/**
 * Entrypoint for plugins
 */
exports.ENTRYPOINT = 'uipath.connectors';
/**
 * Data sources
 */
exports.DATA_SOURCES = {
    ORCHESTRATOR_STORAGE_BUCKET: '#UiPath.Vdbs.Domain.Api.V20Models.StorageBucketDataSourceRequest'
};
/**
 * API Endpoints
 */
exports.ENDPOINTS = {
    CONTEXT_GROUNDING: {
        INDEXES: '/ecs_/v2/indexes',
        SEARCH: '/ecs_/v1/search',
        CREATE: '/ecs_/v2/indexes/create'
    }
};
