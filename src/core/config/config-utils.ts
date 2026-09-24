import { UiPathSDKConfig, PartialUiPathConfig, hasOAuthConfig, hasSecretConfig } from './sdk-config';
import { isBrowser } from '../../utils/platform';

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

/**
 * Drop keys whose value is undefined so a sparse higher-precedence layer never
 * blanks out a value supplied by a lower-precedence one during a merge.
 */
export function compactConfig(config: PartialUiPathConfig): PartialUiPathConfig {
  // Cast: Object.fromEntries resolves to its any-returning overload for a
  // mutable [string, string | undefined][] input.
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined),
  ) as PartialUiPathConfig;
}

export function normalizeBaseUrl(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
} 
/**
 * Configuration-not-found guidance, matched to where the SDK is running.
 *
 * Shared so the registry can reuse it when a service is constructed from a
 * UiPath instance that never resolved a configuration — otherwise the caller
 * only learns their instance is "invalid", not why.
 *
 * When a coded app's injected config carries base fields but a required OAuth
 * field is empty (clientId or redirectUri), name the missing field(s) instead
 * of claiming nothing was found. scope is not required here: Identity falls
 * back to the client's registered scopes when it is omitted.
 */
export function missingConfigMessage(config?: PartialUiPathConfig): string {
  if (isBrowser) {
    if (config && hasRequiredBaseFields(config) && !hasSecretConfig(config)) {
      const missing: string[] = [];
      if (!config.clientId) missing.push('clientId');
      if (!config.redirectUri) missing.push('redirectUri');
      // Only when the plugin injected some OAuth field — a page with none is
      // "not configured", handled by the generic message below.
      if (missing.length > 0 && (config.clientId || config.redirectUri || config.scope)) {
        const fields = missing.join(' and ');
        const verb = missing.length > 1 ? 'are' : 'is';
        const clientHint = missing.includes('clientId')
          ? ' clientId must be a non-confidential OAuth client, or pass one with --client-id at deploy.'
          : '';
        return `UiPath SDK configuration is incomplete: ${fields} ${verb} empty. Set ${missing.length > 1 ? 'them' : 'it'} in uipath.json and redeploy.${clientHint}`;
      }
    }
    return 'UiPath SDK configuration not found. ' +
      'Ensure @uipath/coded-apps plugin is set up in your bundler to inject configuration during development and build.';
  }

  // Ordered by likelihood: on a runner the environment is never populated, so 
  // leading with it would point the reader at the one option that cannot work.
  return 'UiPath SDK configuration not found. ' +
    'In a UiPath coded function, pass the handler context: new UiPath(ctx). ' +
    'Otherwise pass { baseUrl, orgName, tenantName, secret }, ' +
    'or set UIPATH_BASE_URL, UIPATH_ORG_NAME, UIPATH_TENANT_NAME and UIPATH_ACCESS_TOKEN.';
}
