import { AUTH_CONSTANTS } from '../../constants/auth.js';
import { TokenResponse } from '../core/oidc.js';

export interface ValidationError {
  field: string;
  message: string;
}

export const validateTokenResponse = (data: unknown): TokenResponse => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid token response: expected object');
  }

  const obj = data as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if (!obj.access_token || typeof obj.access_token !== 'string') {
    errors.push({ field: 'access_token', message: 'Missing or invalid access_token' });
  }

  if (!obj.expires_in || typeof obj.expires_in !== 'number') {
    errors.push({ field: 'expires_in', message: 'Missing or invalid expires_in' });
  }

  if (!obj.token_type || typeof obj.token_type !== 'string') {
    errors.push({ field: 'token_type', message: 'Missing or invalid token_type' });
  }

  if (!obj.scope || typeof obj.scope !== 'string') {
    errors.push({ field: 'scope', message: 'Missing or invalid scope' });
  }

  if (errors.length > 0) {
    const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join(', ');
    throw new Error(`Token validation failed: ${errorMessage}`);
  }

  return {
    access_token: obj.access_token as string,
    refresh_token: obj.refresh_token as string | undefined,
    expires_in: obj.expires_in as number,
    token_type: obj.token_type as string,
    scope: obj.scope as string,
    id_token: obj.id_token as string | undefined,
  };
};

export const validateJWT = (token: string): void => {
  const parts = token.split('.');
  if (parts.length !== AUTH_CONSTANTS.JWT.PARTS_COUNT) {
    throw new Error(`Invalid JWT format: expected ${AUTH_CONSTANTS.JWT.PARTS_COUNT} parts, got ${parts.length}`);
  }

  try {
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    JSON.parse(payload);
  } catch (error) {
    throw new Error('Invalid JWT: unable to decode payload');
  }
};

export const validateTokenExchangeRequest = (body: unknown): { code: string; state: string } => {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const obj = body as Record<string, unknown>;

  if (!obj.code || typeof obj.code !== 'string') {
    throw new Error('Missing or invalid authorization code');
  }

  if (!obj.state || typeof obj.state !== 'string') {
    throw new Error('Missing or invalid state parameter');
  }

  return {
    code: obj.code as string,
    state: obj.state as string,
  };
};

export const validateFolderResponse = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;
  
  const hasPageItems = obj.PageItems && Array.isArray(obj.PageItems);
  const hasValue = obj.value && Array.isArray(obj.value);
  
  return !!(hasPageItems || hasValue);
};