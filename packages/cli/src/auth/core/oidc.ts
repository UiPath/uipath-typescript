import crypto from 'crypto';
import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { getAuthorizationBaseUrl, getTokenEndpointUrl } from '../utils/url.js';
import { validateJWT } from '../utils/validation.js';
import authConfig from '../config/auth.json' with { type: 'json' };

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
  sub: string;
  prtId: string;
  clientId: string;
  exp: number;
  iss: string;
  aud: string; // audience
  iat: number;
  authTime: number;
  organizationId?: string;
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

export const getAuthorizationUrl = (
  domain: string,
  pkce: PKCEChallenge,
  port: number = authConfig.port
): string => {
  const authUrl = getAuthorizationBaseUrl(domain);
  const redirectUri = authConfig.redirect_uri.replace(AUTH_CONSTANTS.DEFAULT_PORT.toString(), port.toString());

  const params = new URLSearchParams({
    response_type: AUTH_CONSTANTS.OAUTH.RESPONSE_TYPE,
    client_id: authConfig.client_id,
    redirect_uri: redirectUri,
    scope: authConfig.scope,
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