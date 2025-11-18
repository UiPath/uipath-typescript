import { UiPathConfig } from '../core/config/config';
import { ExecutionContext } from '../core/context/execution';
import { UiPathSDKConfig, hasOAuthConfig, hasSecretConfig } from '../core/config/sdk-config';
import { validateConfig, normalizeBaseUrl } from '../core/config/config-utils';
import { AuthService } from '../core/auth/service';
import type { TokenManager } from '../core/auth/token-manager';

/**
 * Lightweight helper for constructing core SDK runtime components.
 *
 * This is used by the modular POC entrypoints so they can accept
 * the public UiPathSDKConfig instead of internal Config types.
 */
export interface SdkRuntime {
  config: UiPathConfig;
  executionContext: ExecutionContext;
  tokenManager: TokenManager;
}

export function createSdkRuntime(config: UiPathSDKConfig): SdkRuntime {
  // Reuse the same validation rules as the main UiPath facade
  validateConfig(config);

  const uiConfig = new UiPathConfig({
    baseUrl: normalizeBaseUrl(config.baseUrl),
    orgName: config.orgName,
    tenantName: config.tenantName,
    secret: hasSecretConfig(config) ? config.secret : undefined,
    clientId: hasOAuthConfig(config) ? config.clientId : undefined,
    redirectUri: hasOAuthConfig(config) ? config.redirectUri : undefined,
    scope: hasOAuthConfig(config) ? config.scope : undefined
  });

  const executionContext = new ExecutionContext();
  const authService = new AuthService(uiConfig, executionContext);

  // For POC purposes we support only secret-based auto-auth here.
  // OAuth flow can still be driven via the main UiPath facade.
  if (hasSecretConfig(config)) {
    authService.authenticateWithSecret(config.secret);
  }

  return {
    config: uiConfig,
    executionContext,
    tokenManager: authService.getTokenManager()
  };
}

