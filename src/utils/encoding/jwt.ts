/**
 * JWT decoding helpers — payload inspection only, no signature verification.
 */
import { decodeBase64Url } from './base64';

/**
 * Decodes a JWT payload without verifying its signature. Returns `undefined`
 * for opaque (non-JWT) tokens and malformed payloads, so callers reading
 * informational claims can degrade instead of failing.
 *
 * @param token - The token whose payload should be decoded
 * @returns The decoded claims, or `undefined` if the payload cannot be read
 */
export function decodeJwtClaims<T = Record<string, unknown>>(token?: string | null): T | undefined {
  try {
    const payload = token?.split('.')[1];
    if (!payload) {
      return undefined;
    }

    return JSON.parse(decodeBase64Url(payload)) as T;
  } catch {
    return undefined;
  }
}

/**
 * Extracts the user id (`sub` claim) from a JWT access token payload.
 * Returns an empty string for opaque (non-JWT) tokens or malformed payloads.
 *
 * @param token - The access token to inspect
 * @returns The user id, or an empty string if it cannot be extracted
 */
export function extractUserIdFromToken(token: string): string {
  const sub = decodeJwtClaims(token)?.['sub'];
  return typeof sub === 'string' && sub ? sub : '';
}
