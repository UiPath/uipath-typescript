export const API_ENDPOINTS = {
  PUBLISH_CODED_APP: '/apps_/default/api/v1/default/models/apps/codedapp/publish',
  UPLOAD_PACKAGE: '/orchestrator_/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage()',
  // Base: /studio_/backend/api/Project/{project_id}/FileOperations
  STUDIO_WEB_STRUCTURE: '/studio_/backend/api/Project/{projectId}/FileOperations/Structure',
  STUDIO_WEB_MIGRATE: '/studio_/backend/api/Project/{projectId}/FileOperations/StructuralMigration',
  STUDIO_WEB_DOWNLOAD_FILE: '/studio_/backend/api/Project/{projectId}/FileOperations/File/{fileId}',
  STUDIO_WEB_DELETE_ITEM: '/studio_/backend/api/Project/{projectId}/FileOperations/Delete/{itemId}',
  STUDIO_WEB_LOCK: '/studio_/backend/api/Project/{projectId}/Lock',
  STUDIO_WEB_PROJECT: '/studio_/backend/api/Project/{projectId}',
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
  PUBLISHED_APPS: '/apps_/default/api/v1/default/models/tenants/{tenantId}/publish/apps'
} as const;

export const APP_URL_TEMPLATE = '/{orgId}/apps_/default/run/production/{tenantId}/{folderKey}/{appSystemName}/public';