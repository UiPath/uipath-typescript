import { APP_URL_TEMPLATE } from '../constants/index.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';

export interface HeaderOptions {
  contentType?: string;
  bearerToken?: string;
  tenantId?: string;
  folderKey?: string;
  additionalHeaders?: Record<string, string>;
}

/**
 * Creates headers for HTTP requests with flexible options
 * @param options - Options for creating headers
 * @returns Headers object
 */
export function createHeaders(options: HeaderOptions = {}): Record<string, string> {
  const {
    contentType = AUTH_CONSTANTS.CONTENT_TYPES.JSON,
    bearerToken,
    tenantId,
    folderKey,
    additionalHeaders = {}
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    ...additionalHeaders
  };

  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  if (tenantId) {
    headers['x-uipath-internal-tenantid'] = tenantId;
  }

  if (folderKey) {
    headers['x-uipath-folderkey'] = folderKey;
  }

  return headers;
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