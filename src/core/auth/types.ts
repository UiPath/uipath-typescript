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

/**
 * OAuth/JWT token claims map.
 */
export type TokenClaims = Record<string, unknown>;

/**
 * Normalized identity extracted from token claims.
 */
export interface TokenIdentity {
  userId?: string;
  username?: string;
  email?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  tenantName?: string;
  orgName?: string;
  rawClaims: TokenClaims;
}
