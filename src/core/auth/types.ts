/**
 * Session storage keys used by the auth module
 */
export const AUTH_STORAGE_KEYS = {
  TOKEN_PREFIX: 'uipath_sdk_user_token-',
  OAUTH_CONTEXT: 'uipath_sdk_oauth_context',
  CODE_VERIFIER: 'uipath_sdk_code_verifier',
} as const;

/**
 * Authentication token information
 */
export interface TokenInfo {
  token: string;
  type: 'secret' | 'oauth';
  expiresAt?: Date;
  refreshToken?: string;
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
