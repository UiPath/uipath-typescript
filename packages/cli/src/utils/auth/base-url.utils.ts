import { BASE_URLS } from '../../config/auth-constants.js';

export const getBaseUrl = (domain: string): string => {
  return BASE_URLS[domain] || BASE_URLS.cloud;
};

export const getAuthorizationBaseUrl = (domain: string): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}/identity_/connect/authorize`;
};

export const getTokenEndpointUrl = (domain: string): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}/identity_/connect/token`;
};

export const getPortalApiUrl = (domain: string, organizationId: string, path: string): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}/${organizationId}/portal_/api${path}`;
};

export const getOrchestratorApiUrl = (
  domain: string,
  organizationName: string,
  tenantName: string,
  path: string
): string => {
  const baseUrl = getBaseUrl(domain);
  return `${baseUrl}/${organizationName}/${tenantName}/orchestrator_/api${path}`;
};