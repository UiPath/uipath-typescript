import { UiPathSDKConfig, PartialUiPathConfig, hasOAuthConfig, hasSecretConfig } from './sdk-config';

/**
 * Check if config has all required base fields
 */
function hasRequiredBaseFields(config: PartialUiPathConfig): boolean {
  return Boolean(config.baseUrl && config.orgName && config.tenantName);
}

/**
 * Check if config has exactly one authentication method (secret XOR oauth)
 * Returns true if exactly one auth method is present, false otherwise
 */
function hasValidAuthConfig(config: PartialUiPathConfig): boolean {
  const hasSecret = hasSecretConfig(config);
  const hasOAuth = hasOAuthConfig(config);

  // XOR: exactly one auth method, not both, not neither
  return hasSecret !== hasOAuth;
}

export function validateConfig(config: UiPathSDKConfig): void {
  if (!hasRequiredBaseFields(config)) {
    throw new Error('Missing required configuration: baseUrl, orgName, and tenantName are required');
  }

  const hasSecret = hasSecretConfig(config);
  const hasOAuth = hasOAuthConfig(config);

  if (hasSecret && hasOAuth) {
    throw new Error('Invalid configuration: cannot provide both secret and OAuth credentials. Choose one authentication method.');
  }

  if (!hasSecret && !hasOAuth) {
    throw new Error('Invalid configuration: must provide either secret or OAuth credentials (clientId, redirectUri, and scope)');
  }
}

/**
 * Check if partial config has all required fields for a complete SDK config
 * Requires base fields and exactly one authentication method (secret XOR oauth)
 */
export function isCompleteConfig(config: PartialUiPathConfig): config is UiPathSDKConfig {
  return hasRequiredBaseFields(config) && hasValidAuthConfig(config);
}

export function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
} 