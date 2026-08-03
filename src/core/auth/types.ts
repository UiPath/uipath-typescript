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
   * For the smoothest experience, include the `openid` scope in your SDK
   * configuration: the SDK then captures the OIDC ID token and sends it as
   * `id_token_hint`, which lets Identity skip its logout-confirmation prompt
   * and honor `postLogoutRedirectUri`. Without `openid`, logout still
   * terminates the cloud session but Identity may show a confirmation prompt
   * and ignore `postLogoutRedirectUri`.
   */
  endSession?: boolean;
  /**
   * URL the user is returned to after the cloud session is terminated.
   * Must be registered as an allowed post-logout redirect URI on the
   * External Application, and is only honored when an `id_token_hint` is
   * available (see `endSession`). When omitted, Identity shows its own
   * signed-out page.
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
