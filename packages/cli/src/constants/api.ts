export const API_ENDPOINTS = {
  PUBLISH_CODED_APP: '/apps_/default/api/v1/default/models/apps/codedapp/publish',
  UPLOAD_PACKAGE: '/orchestrator_/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage()',
  // Base: /studio_/backend/api/Project/{project_id}/FileOperations
  STUDIO_WEB_STRUCTURE: '/studio_/backend/api/Project/{projectId}/FileOperations/Structure',
  STUDIO_WEB_DOWNLOAD_FILE: '/studio_/backend/api/Project/{projectId}/FileOperations/File/{fileId}',
  STUDIO_WEB_DELETE_ITEM: '/studio_/backend/api/Project/{projectId}/FileOperations/Delete/{itemId}',
  STUDIO_WEB_LOCK: '/studio_/backend/api/Project/{projectId}/Lock',
  STUDIO_WEB_PROJECT: '/studio_/backend/api/Project/{projectId}',
  // New per-file FileOperations APIs
  STUDIO_WEB_CREATE_FILE: '/studio_/backend/api/Project/{projectId}/FileOperations/File',
  STUDIO_WEB_UPDATE_FILE: '/studio_/backend/api/Project/{projectId}/FileOperations/File/{fileId}',
  STUDIO_WEB_CREATE_FOLDER: '/studio_/backend/api/Project/{projectId}/FileOperations/Folder',
  // Resource Catalog endpoints
  RESOURCE_CATALOG_ENTITIES: '/resourcecatalog_/Entities/{resourceType}',
  // Connections endpoint
  CONNECTIONS_RETRIEVE: '/orchestrator_/odata/Connections(\'{connectionKey}\')',
  // Referenced Resources endpoint
  STUDIO_WEB_CREATE_REFERENCED_RESOURCE: '/studio_/backend/api/resourcebuilder/solutions/{solutionId}/resources/reference',
  // Deploy endpoints
  DEPLOYED_APPS: '/apps_/default/api/v1/default/models/deployed/apps',
  DEPLOY_APP: '/apps_/default/api/v1/default/models/{systemName}/publish/versions/1/deploy',
  UPGRADE_APP: '/apps_/default/api/v1/default/models/deployed/apps/updateToLatestAppVersionBulk',
  // Published apps endpoints (for version lookup)
  PUBLISHED_APPS: '/apps_/default/api/v1/default/models/tenants/{tenantId}/publish/apps',
  // Check app name uniqueness
  CHECK_APP_NAME_UNIQUE: '/apps_/default/api/v1/default/models/deployed/apps/uniquename/check/{appName}'
} as const;

/** Studio Web API request headers */
export const STUDIO_WEB_HEADERS = {
  LOCK_KEY: 'x-uipath-sw-lockkey',
  /** Required by Studio Web referenced-resource and other endpoints for tenant context. */
  TENANT_ID: 'x-uipath-tenantid',
} as const;

/** Studio Web API: backend requires this query param for Lock, Move folder, and Create referenced resource. */
export const STUDIO_WEB_API_VERSION = '2';

/** Lock PUT: backend requires this path segment after Lock/ (placeholder UUID + "Shared" lock type). */
export const STUDIO_WEB_LOCK_ACQUIRE_PATH = 'dummy-uuid-Shared';

/** Create referenced resource: force backend to apply the resource even if it considers it unchanged. */
export const STUDIO_WEB_REFERENCED_RESOURCE_FORCE_UPDATE = 'true';

/** Resource catalog search: first page, up to 100 matches by name (sufficient for bindings lookup). */
export const RESOURCE_CATALOG_SKIP = '0';
export const RESOURCE_CATALOG_TAKE = '100';

/** Max length of error message sent to telemetry (truncate with "..." to avoid oversized payloads). */
export const MAX_TELEMETRY_ERROR_LENGTH = 500;

/** Push metadata: local path under project root; uploaded to source/push_metadata.json on remote. */
export const PUSH_METADATA_RELATIVE_PATH = '.uipath/push_metadata.json';
export const PUSH_METADATA_FILENAME = 'push_metadata.json';

export const APP_URL_TEMPLATE = '/{orgId}/apps_/default/run/production/{tenantId}/{folderKey}/{appSystemName}/public';