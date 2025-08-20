import { EnvironmentConfig } from '../types/index.js';
import { APP_URL_TEMPLATE } from '../constants/index.js';

export function createHeaders(envConfig: EnvironmentConfig, additionalHeaders?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${envConfig.bearerToken}`,
    'x-uipath-internal-tenantid': envConfig.tenantId,
    ...additionalHeaders,
  };
}

export function buildAppUrl(
  baseUrl: string,
  orgId: string,
  tenantId: string,
  folderKey: string,
  appSystemName: string
): string {
  const path = APP_URL_TEMPLATE
    .replace('{orgId}', orgId)
    .replace('{tenantId}', tenantId)
    .replace('{folderKey}', folderKey)
    .replace('{appSystemName}', appSystemName);
  
  return `${baseUrl}${path}`;
}