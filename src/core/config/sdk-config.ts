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

// Public (anonymous) coded-app fields. Injected via meta tags at deploy; the app carries no OAuth creds.
export interface PublicModeFields {
  /** Names the app to the Apps service. Minted only for public apps, so its presence means public mode. */
  appKey?: string;
}


// Configuration type that enforces either secret or complete OAuth fields
export type UiPathSDKConfig = BaseConfig & (
  | { secret: string; clientId?: never; redirectUri?: never; scope?: never }
  | ({ secret?: never } & OAuthFields)
);

// Flexible partial type for constructor input (allows any combination of fields)
// The isCompleteConfig function validates the final merged config
export type PartialUiPathConfig = Partial<BaseConfig & OAuthFields & { secret: string } & PublicModeFields>;

// Public (anonymous) mode: the Apps service mints an app key only for public apps, so the key alone decides it.
export function isPublicMode(config: { appKey?: string }): config is { appKey: string } {
  return Boolean(config.appKey);
}

// Type guard to check if config has OAuth credentials
export function hasOAuthConfig(config: { clientId?: string; redirectUri?: string; scope?: string }): config is { clientId: string; redirectUri: string; scope: string } {
  return Boolean(config.clientId && config.redirectUri && config.scope);
}

// Type guard to check if config has secret
export function hasSecretConfig(config: { secret?: string }): config is { secret: string } {
  return Boolean(config.secret);
}
