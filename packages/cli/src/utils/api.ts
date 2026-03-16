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
  orgName: string,
  routingName: string
): string {
  // Extract environment from baseUrl (e.g., "staging" from "https://staging.uipath.com/")
  // Remove protocol (http:// or https://) and trailing slash
  const urlWithoutProtocol = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  // Extract environment (first part before .uipath.com)
  // For cloud.uipath.com, alpha.uipath.com, staging.uipath.com, etc.
  const match = urlWithoutProtocol.match(/^([^.]+)\.uipath\.com/);
  const environment = match ? match[1] : 'cloud';

  // Construct the new app URL format: https://<orgName>.<environment>.uipath.host/<routingName>
  // Note: baseUrl uses .uipath.com but app URLs use .uipath.host
  return `https://${orgName}.${environment}.uipath.host/${routingName}`;
}