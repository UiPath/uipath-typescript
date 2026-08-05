// Base configuration with common required fields
export interface BaseConfig {
  baseUrl: string;
  orgName: string;
  tenantName: string;
}

// OAuth specific fields
export interface OAuthFields {
  clientId: string;
  redirectUri: string;
  scope: string;
}

// Public (anonymous) coded-app fields. Injected via meta tags at deploy — the app
// runs as its own identity through the Apps gateway, so it carries no OAuth creds.
export interface PublicModeFields {
  /** 'anonymous' switches the SDK into public mode; absent/'user' keeps PKCE. */
  runtimeAuthMode?: string;
  /** Deployment id used to build the Apps-gateway routes in public mode. */
  appId?: string;
}

// Configuration type that enforces either secret or complete OAuth fields
export type UiPathSDKConfig = BaseConfig & (
  | { secret: string; clientId?: never; redirectUri?: never; scope?: never }
  | ({ secret?: never } & OAuthFields)
);

// Flexible partial type for constructor input (allows any combination of fields)
// The isCompleteConfig function validates the final merged config
export type PartialUiPathConfig = Partial<BaseConfig & OAuthFields & { secret: string } & PublicModeFields>;

// Type guard: is the app running in public (anonymous) mode? Requires the appId
// the gateway routes are keyed on, so a bare mode flag can't half-enable it.
export function isPublicMode(config: { runtimeAuthMode?: string; appId?: string }): config is { runtimeAuthMode: string; appId: string } {
  return config.runtimeAuthMode === 'anonymous' && Boolean(config.appId);
}

// Type guard to check if config has OAuth credentials
export function hasOAuthConfig(config: { clientId?: string; redirectUri?: string; scope?: string }): config is { clientId: string; redirectUri: string; scope: string } {
  return Boolean(config.clientId && config.redirectUri && config.scope);
}

// Type guard to check if config has secret
export function hasSecretConfig(config: { secret?: string }): config is { secret: string } {
  return Boolean(config.secret);
}
