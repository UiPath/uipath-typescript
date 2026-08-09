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
   * When true, after clearing local authentication state the browser is
   * redirected to the Identity end-session endpoint, terminating the
   * Automation Cloud session (and invalidating the refresh token) so the
   * next sign-in prompts for credentials instead of silently reusing the
   * still-active cloud session. Browser-only. Defaults to false, which
   * preserves the previous local-only logout behavior.
   *
   * Requires the `openid` scope in your SDK configuration: the SDK captures
   * the OIDC ID token and sends it as `id_token_hint`, which is what proves
   * the end-session request. Without an ID token the cloud logout is
   * skipped — only local state is cleared — and a warning is logged.
   */
  endSession?: boolean;
  /**
   * URL the user is returned to after the cloud session is terminated — pass
   * this to bring the user back to your app instead of the Automation Cloud
   * portal, e.g.
   * `(window.location.origin + window.location.pathname).replace(/\/$/, '')`.
   *
   * Identity compares the value by exact string match, so even a
   * trailing-slash difference is a mismatch — when omitted or mismatched,
   * the user lands on the Automation Cloud portal instead.
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
