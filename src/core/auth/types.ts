/**
 * Authentication token information
 */
export interface TokenInfo {
  token: string;
  type: 'secret' | 'oauth';
  expiresAt?: Date;
  refreshToken?: string;
  /**
   * OIDC ID token, used as `id_token_hint` for RP-initiated logout. Absent
   * for sessions signed in before the SDK auto-requested `openid`.
   */
  idToken?: string;
}

/**
 * Options controlling logout behavior
 */
export interface LogoutOptions {
  /**
   * When true, also signs the user out of the UiPath platform — Automation
   * Cloud or Automation Suite — so the next sign-in prompts for credentials;
   * the browser returns to the configured `redirectUri` afterwards.
   * Browser-only. The SDK requests the `openid` scope automatically; a
   * session signed in without it falls back to local-only logout with a
   * warning. Defaults to false (local-only logout).
   */
  endSession?: boolean;
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
