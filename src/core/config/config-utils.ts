import { UiPathSDKConfig, PartialUiPathConfig, hasOAuthConfig, hasSecretConfig } from './sdk-config';

export function validateConfig(config: UiPathSDKConfig): void {
  if (!config.baseUrl || !config.orgName || !config.tenantName) {
    throw new Error('Missing required configuration: baseUrl, orgName, and tenantName are required');
  }

  if (!hasSecretConfig(config) && !hasOAuthConfig(config)) {
    throw new Error('Invalid configuration: must provide either secret or (clientId, redirectUri, and scope)');
  }
}

/**
 * Check if partial config has all required fields for a complete SDK config
 */
export function isCompleteConfig(config: PartialUiPathConfig): config is UiPathSDKConfig {
  const hasBaseFields = Boolean(config.baseUrl && config.orgName && config.tenantName);
  return hasBaseFields && (hasSecretConfig(config) || hasOAuthConfig(config));
}

export function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
} 