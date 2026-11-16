// Base configuration with common required fields
export interface BaseConfig {
  /**
   * Platform origin, such as `https://cloud.uipath.com` — scheme, host and port. The organization
   * and tenant are appended to it, so a URL that already carries a path addresses the wrong tenant.
   */
  baseUrl: string;
  orgName: string;
  tenantName: string;
  /**
   * Organization (partition) GUID. Optional — the SDK derives it from the access token
   * or looks it up from `orgName`; set it to skip that lookup or to override the result.
   */
  organizationId?: string;
}

// OAuth specific fields
export interface OAuthFields {
  clientId: string;
  redirectUri: string;
  scope: string;
}

/** Browser storage the SDK keeps the OAuth session in. */
export type TokenStorage = 'sessionStorage' | 'localStorage';

// Opt-in login behaviour.
export interface LoginFields {
  enforceSso?: boolean;
  /**
   * Where the browser keeps the OAuth session. `sessionStorage`, the default, keeps it to one tab
   * and drops it when the tab closes. `localStorage` shares it between the tabs that use the same
   * client ID on the origin and keeps it across browser restarts; in exchange the tokens stay on
   * the device, within reach of any script running on that origin, until `logout()` removes them.
   */
  tokenStorage?: TokenStorage;
}

// Configuration type that enforces either secret or complete OAuth fields
export type UiPathSDKConfig = BaseConfig & LoginFields & (
  | { secret: string; clientId?: never; redirectUri?: never; scope?: never }
  | ({ secret?: never } & OAuthFields)
);

// Flexible partial type for constructor input (allows any combination of fields)
// The isCompleteConfig function validates the final merged config
export type PartialUiPathConfig = Partial<BaseConfig & OAuthFields & { secret: string } & LoginFields>;

// Type guard to check if config has OAuth credentials
export function hasOAuthConfig(config: { clientId?: string; redirectUri?: string; scope?: string }): config is { clientId: string; redirectUri: string; scope: string } {
  return Boolean(config.clientId && config.redirectUri && config.scope);
}

// Type guard to check if config has secret
export function hasSecretConfig(config: { secret?: string }): config is { secret: string } {
  return Boolean(config.secret);
}
