import { BASE_URLS, AUTH_CONSTANTS } from '../../constants/auth.js';

export const getBaseUrl = (domain: string): string => {
  return BASE_URLS[domain] || BASE_URLS.cloud;
};

export const buildRedirectUri = (port: number): string => {
  return AUTH_CONSTANTS.OAUTH.REDIRECT_URI_TEMPLATE.replace('{PORT}', port.toString());
};

export const getAuthorizationBaseUrl = (domain: string): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}${AUTH_CONSTANTS.IDENTITY_ENDPOINTS.AUTHORIZE}`;
};

export const getTokenEndpointUrl = (domain: string): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}${AUTH_CONSTANTS.IDENTITY_ENDPOINTS.TOKEN}`;
};

export const getPortalApiUrl = (domain: string, organizationId: string, path: string): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}/${organizationId}${AUTH_CONSTANTS.SERVICE_PATHS.PORTAL_API}${path}`;
};

export const getOrchestratorApiUrl = (
  domain: string,
  organizationName: string,
  tenantName: string,
  path: string
): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}/${organizationName}/${tenantName}${AUTH_CONSTANTS.SERVICE_PATHS.ORCHESTRATOR_API}${path}`;
};