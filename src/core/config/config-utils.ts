import { UiPathSDKConfig, hasOAuthConfig, hasSecretConfig } from './sdk-config';

export function validateConfig(config: UiPathSDKConfig): void {
  if (!config.baseUrl || !config.orgName || !config.tenantName) {
    throw new Error('Missing required configuration: baseUrl, orgName, and tenantName are required');
  }

  if (!hasSecretConfig(config) && !hasOAuthConfig(config)) {
    throw new Error('Invalid configuration: must provide either secret or (clientId and redirectUri)');
  }
}

export function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
} 