import crypto from 'crypto';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { getAuthorizationBaseUrl, getTokenEndpointUrl } from '../utils/url.js';
import { validateJWT, validateTokenResponse } from '../utils/validation.js';

export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
}

export interface AuthConfig {
  domain: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
  idToken?: string;
}

export interface AccessTokenData {
  sub: string;              // Subject - The user's unique identifier
  prtId: string;            // Portal ID - UiPath portal identifier
  clientId: string;         // OAuth client ID
  exp: number;              // Expiration time (Unix timestamp)
  iss: string;              // Issuer - The entity that issued the token (e.g., https://cloud.uipath.com)
  aud: string;              // Audience - Intended recipient of the token
  iat: number;              // Issued At - When the token was issued (Unix timestamp)
  authTime: number;         // Authentication time - When the user authenticated
  organizationId?: string;  // Optional organization identifier
}

const base64URLEncode = (str: Buffer): string => {
  return str
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

export const generatePKCEChallenge = (): PKCEChallenge => {
  const codeVerifier = base64URLEncode(crypto.randomBytes(AUTH_CONSTANTS.CRYPTO.RANDOM_BYTES_LENGTH));
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  const codeChallenge = base64URLEncode(hash);
  const state = base64URLEncode(crypto.randomBytes(AUTH_CONSTANTS.CRYPTO.RANDOM_BYTES_LENGTH));

  return {
    codeVerifier,
    codeChallenge,
    state,
  };
};

const buildRedirectUri = (port: number): string => {
  return AUTH_CONSTANTS.OAUTH.REDIRECT_URI_TEMPLATE.replace('{PORT}', port.toString());
};

export const getAuthorizationUrl = (
  domain: string,
  pkce: PKCEChallenge,
  port: number = AUTH_CONSTANTS.DEFAULT_PORT
): string => {
  const authUrl = getAuthorizationBaseUrl(domain);
  const redirectUri = buildRedirectUri(port);

  const params = new URLSearchParams({
    response_type: AUTH_CONSTANTS.OAUTH.RESPONSE_TYPE,
    client_id: AUTH_CONSTANTS.OAUTH.DEFAULT_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: AUTH_CONSTANTS.OAUTH.DEFAULT_SCOPE,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: AUTH_CONSTANTS.OAUTH.CODE_CHALLENGE_METHOD,
    state: pkce.state,
  });

  return `${authUrl}?${params.toString()}`;
};

export const getTokenEndpoint = (domain: string): string => {
  return getTokenEndpointUrl(domain);
};

export const parseJWT = (token: string): AccessTokenData => {
  validateJWT(token);
  const parts = token.split('.');

  const payload = Buffer.from(parts[1], 'base64').toString('utf8');
  const claims = JSON.parse(payload);

  return {
    sub: claims.sub,
    prtId: claims.prt_id,
    clientId: claims.client_id,
    exp: claims.exp,
    iss: claims.iss,
    aud: claims.aud,
    iat: claims.iat,
    authTime: claims.auth_time,
    organizationId: claims.organization_id || claims.prt_id,
  };
};

export interface ConfidentialClientConfig {
  clientId: string;
  clientSecret: string;
  domain: string;
  scope?: string;
}

/**
 * Authenticate using OAuth2 Client Credentials flow (confidential client).
 * This flow is used for machine-to-machine authentication where client_id and client_secret are provided.
 *
 * Note: For client credentials flow, the scopes are typically configured on the external application
 * in UiPath Identity, not passed in the request. If scope is not provided, we don't include it
 * in the request and let the server use the application's configured scopes.
 */
export const authenticateWithClientCredentials = async (
  config: ConfidentialClientConfig
): Promise<TokenResponse> => {
  const tokenEndpoint = getTokenEndpointUrl(config.domain);

  const params = new URLSearchParams({
    grant_type: AUTH_CONSTANTS.OAUTH.GRANT_TYPE_CLIENT_CREDENTIALS,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  // Only add scope if explicitly provided - for client credentials,
  // the server uses the application's pre-configured scopes
  if (config.scope) {
    params.append('scope', config.scope);
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': AUTH_CONSTANTS.CONTENT_TYPES.FORM_URLENCODED,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Authentication failed: ${errorText || response.status}`);
  }

  const data = await response.json();
  return validateTokenResponse(data);
};