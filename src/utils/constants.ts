/**
 * Environment variables
 */
export const ENV = {
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
} as const;

/**
 * Headers
 */
export const HEADERS = {
  FOLDER_KEY: 'X-UIPATH-FolderKey',
  FOLDER_PATH: 'X-UIPATH-FolderPath',
  USER_AGENT: 'X-UIPATH-UserAgent',
  TENANT_ID: 'X-UIPATH-TenantId',
  JOB_KEY: 'X-UIPATH-JobKey',
  ORGANIZATION_UNIT_ID: 'X-UIPATH-OrganizationUnitId',
  INSTANCE_ID: 'X-UIPATH-InstanceId'
} as const;

/**
 * Entrypoint for plugins
 */
export const ENTRYPOINT = 'uipath.connectors';

/**
 * Data sources
 */
export const DATA_SOURCES = {
  ORCHESTRATOR_STORAGE_BUCKET: '#UiPath.Vdbs.Domain.Api.V20Models.StorageBucketDataSourceRequest'
} as const;

/**
 * API Endpoints
 */
export const ENDPOINTS = {
  CONTEXT_GROUNDING: {
    INDEXES: '/ecs_/v2/indexes',
    SEARCH: '/ecs_/v1/search',
    CREATE: '/ecs_/v2/indexes/create'
  }
} as const; 