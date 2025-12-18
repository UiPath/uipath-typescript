export const API_ENDPOINTS = {
  PUBLISH_CODED_APP: '/apps_/default/api/v1/default/models/apps/codedapp/publish',
  UPLOAD_PACKAGE: '/orchestrator_/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage()',
  // Deploy endpoints
  DEPLOYED_APPS: '/apps_/default/api/v1/default/models/deployed/apps',
  DEPLOY_APP: '/apps_/default/api/v1/default/models/{systemName}/publish/versions/1/deploy',
  UPGRADE_APP: '/apps_/default/api/v1/default/models/deployed/apps/updateToLatestAppVersionBulk',
  // Published apps endpoints (for version lookup)
  PUBLISHED_APPS: '/apps_/default/api/v1/default/models/tenants/{tenantId}/publish/apps'
} as const;

export const APP_URL_TEMPLATE = '/{orgId}/apps_/default/run/production/{tenantId}/{folderKey}/{appSystemName}/public';