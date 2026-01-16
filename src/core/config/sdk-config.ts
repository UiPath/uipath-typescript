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

// Configuration type that enforces either secret or complete OAuth fields
export type UiPathSDKConfig = BaseConfig & (
  | { secret: string; clientId?: never; redirectUri?: never; scope?: never }
  | ({ secret?: never } & OAuthFields)
);

// Flexible partial type for constructor input (allows any combination of fields)
// The isCompleteConfig function validates the final merged config
export type PartialUiPathConfig = Partial<BaseConfig & OAuthFields & { secret: string }>;

// Type guard to check if config has OAuth credentials
export function hasOAuthConfig(config: { clientId?: string; redirectUri?: string; scope?: string }): config is { clientId: string; redirectUri: string; scope: string } {
  return Boolean(config.clientId && config.redirectUri && config.scope);
}

// Type guard to check if config has secret
export function hasSecretConfig(config: { secret?: string }): config is { secret: string } {
  return Boolean(config.secret);
} 