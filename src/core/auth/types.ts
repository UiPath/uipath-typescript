/**
 * Authentication token information
 */
export interface TokenInfo {
  token: string;
  type: 'secret' | 'oauth';
  expiresAt?: Date;
  refreshToken?: string;
  /**
   * OIDC ID token, present only when the `openid` scope was requested.
   * Used as `id_token_hint` for RP-initiated logout.
   */
  idToken?: string;
}

/**
 * Options controlling logout behavior
 */
export interface LogoutOptions {
  /**
   * When true, also signs the user out of the UiPath platform — Automation
   * Cloud or Automation Suite — so the next sign-in prompts for credentials.
   * Browser-only; requires the `openid` scope — without it only local state
   * is cleared and a warning is logged. Defaults to false (local-only
   * logout).
   */
  endSession?: boolean;
  /**
   * URL the user returns to after the platform session ends. Defaults to
   * the configured `redirectUri`. Must exactly match a redirect URI
   * registered for the external app.
   */
  postLogoutRedirectUri?: string;
}

/**
 * OAuth token response
 */
export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * OAuth context stored during authentication flow
 */
export interface OAuthContext {
  codeVerifier: string;
  clientId: string;
  redirectUri: string;
  baseUrl: string;
  orgName: string;
  tenantName: string;
  scope: string;
}
