export const API_ENDPOINTS = {
  PUBLISH_CODED_APP: '/apps_/default/api/v1/default/models/apps/codedapp/publish',
  UPLOAD_PACKAGE: '/orchestrator_/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage()',
} as const;

export const APP_URL_TEMPLATE = '/{orgId}/apps_/default/run/production/{tenantId}/{folderKey}/{appSystemName}/public';